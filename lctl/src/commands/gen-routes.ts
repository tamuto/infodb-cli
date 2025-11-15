import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { RouteDefinition } from '../utils/routes';

interface TerraformModule {
  resources?: TerraformResource[];
  child_modules?: TerraformModule[];
}

interface TerraformConfigModule {
  resources?: TerraformConfigResource[];
  module_calls?: Record<string, { module: TerraformConfigModule }>;
}

interface TerraformConfigResource {
  address?: string;
  type: string;
  name: string;
  expressions?: Record<string, TerraformExpression>;
}

interface TerraformExpression {
  references?: string[];
}

interface TerraformResource {
  address?: string;
  type: string;
  name: string;
  values?: Record<string, any>;
}

interface GenRoutesOptions {
  output?: string;
  verbose?: boolean;
}

export async function genRoutesCommand(
  inputFile: string,
  options: GenRoutesOptions
): Promise<void> {
  const logger = new Logger(Boolean(options.verbose));
  const resolvedInput = path.resolve(inputFile);
  const resolvedOutput = path.resolve(options.output || 'routes.json');

  logger.info(`Reading terraform plan: ${resolvedInput}`);
  const raw = await fs.readFile(resolvedInput, 'utf-8');
  const parsed = JSON.parse(raw);
  const moduleNode = getPrimaryModule(parsed);
  const resources = collectResources(moduleNode);

  if (!resources.length) {
    throw new Error('No resources found in terraform plan.');
  }

  const configResources = collectConfigResources(parsed?.configuration?.root_module);

  const routes = buildRoutes(resources, configResources, logger);
  await fs.writeFile(resolvedOutput, JSON.stringify(routes, null, 2) + '\n', 'utf-8');
  logger.success(`✅ Generated ${routes.length} routes -> ${resolvedOutput}`);
}

function getPrimaryModule(parsed: any): TerraformModule | undefined {
  return (
    parsed?.values?.root_module ||
    parsed?.planned_values?.root_module ||
    parsed?.prior_state?.values?.root_module
  );
}

function collectResources(moduleNode?: TerraformModule | null): TerraformResource[] {
  if (!moduleNode) {
    return [];
  }

  const collected: TerraformResource[] = [...(moduleNode.resources || [])];
  for (const child of moduleNode.child_modules || []) {
    collected.push(...collectResources(child));
  }

  return collected;
}

function collectConfigResources(moduleNode?: TerraformConfigModule | null): TerraformConfigResource[] {
  if (!moduleNode) {
    return [];
  }

  const collected: TerraformConfigResource[] = [...(moduleNode.resources || [])];

  if (moduleNode.module_calls) {
    for (const call of Object.values(moduleNode.module_calls)) {
      collected.push(...collectConfigResources(call.module));
    }
  }

  return collected;
}

function buildRoutes(
  resources: TerraformResource[],
  configResources: TerraformConfigResource[],
  logger: Logger
): RouteDefinition[] {
  const integrationIdToLambda = new Map<string, string>();
  const integrationKeyToLambda = new Map<string, string>();
  const lambdaNameByKey = new Map<string, string>();
  const configResourceIndex = indexConfigResources(configResources);

  for (const resource of resources) {
    if (resource.type === 'aws_lambda_function') {
      const functionName = resource.values?.function_name as string | undefined;
      if (functionName) {
        for (const key of getResourceKeys(resource)) {
          lambdaNameByKey.set(key, functionName);
        }
      }
    }
  }

  for (const resource of resources) {
    if (resource.type !== 'aws_apigatewayv2_integration') {
      continue;
    }

    const values = resource.values || {};
    const lambdaName =
      extractLambdaName(values.integration_uri) ||
      inferLambdaFromConfig(resource, configResourceIndex, lambdaNameByKey);

    if (!lambdaName) {
      throw new Error(
        `Unable to determine Lambda target for integration ${resource.address || resource.name}.`
      );
    }

    const integrationId = values.integration_id || values.id;

    if (!integrationId) {
      logger.verbose('Integration id is unknown (likely from plan output). Using configuration references.');
    } else {
      integrationIdToLambda.set(String(integrationId), lambdaName);
    }

    for (const key of getResourceKeys(resource)) {
      integrationKeyToLambda.set(key, lambdaName);
    }
  }

  const routes: RouteDefinition[] = [];

  for (const resource of resources) {
    if (resource.type !== 'aws_apigatewayv2_route') {
      continue;
    }

    const values = resource.values || {};
    const routeKey = values.route_key as string | undefined;
    if (!routeKey) {
      throw new Error(`Route resource ${resource.address || resource.name} is missing route_key.`);
    }

    const { method, path } = parseRouteKey(routeKey);
    const lambdaName =
      findLambdaForRoute(resource, configResourceIndex, integrationKeyToLambda) ||
      findLambdaFromTarget(values.target as string | undefined, integrationIdToLambda);

    if (!lambdaName) {
      throw new Error(
        `Route ${routeKey} does not have a matching Lambda integration. Ensure the integration exists in the same plan.`
      );
    }

    routes.push({
      method,
      path,
      lambda: lambdaName,
    });
  }

  if (!routes.length) {
    throw new Error('No aws_apigatewayv2_route resources found in terraform plan.');
  }

  return routes;
}

function parseRouteKey(routeKey: string): { method: string; path: string } {
  if (routeKey === '$default') {
    return { method: 'ANY', path: '$default' };
  }

  const parts = routeKey.trim().split(/\s+/);

  if (parts.length < 2) {
    throw new Error(`Invalid routeKey format: ${routeKey}`);
  }

  const method = parts.shift()!;
  const path = parts.join(' ');

  if (!path.startsWith('/')) {
    throw new Error(`Route path must start with '/': ${routeKey}`);
  }

  return {
    method: method.toUpperCase(),
    path,
  };
}

function extractLambdaName(integrationUri?: string): string | null {
  if (typeof integrationUri !== 'string') {
    return null;
  }

  const match = integrationUri.match(/function:([^:/]+)(?=[:/])/);
  return match ? match[1] : null;
}

function inferLambdaFromConfig(
  integrationResource: TerraformResource,
  configResources: Map<string, TerraformConfigResource>,
  lambdaNameByKey: Map<string, string>
): string | null {
  for (const key of getResourceKeys(integrationResource)) {
    const configResource = configResources.get(key);
    if (!configResource) {
      continue;
    }

    const references = configResource.expressions?.integration_uri?.references || [];
    for (const reference of references) {
      const lambdaKey = findReferencedKey(reference, lambdaNameByKey.keys());
      if (lambdaKey) {
        return lambdaNameByKey.get(lambdaKey) || null;
      }
    }
  }

  return null;
}

function findLambdaForRoute(
  routeResource: TerraformResource,
  configResources: Map<string, TerraformConfigResource>,
  integrationKeyToLambda: Map<string, string>
): string | null {
  for (const key of getResourceKeys(routeResource)) {
    const configResource = configResources.get(key);
    if (!configResource) {
      continue;
    }

    const references = configResource.expressions?.target?.references || [];
    for (const reference of references) {
      const integrationKey = findReferencedKey(reference, integrationKeyToLambda.keys());
      if (integrationKey) {
        return integrationKeyToLambda.get(integrationKey) || null;
      }
    }
  }

  return null;
}

function findLambdaFromTarget(
  target: string | undefined,
  integrationIdToLambda: Map<string, string>
): string | null {
  if (!target || !target.startsWith('integrations/')) {
    return null;
  }
  const integrationId = target.split('/')[1];
  return integrationIdToLambda.get(integrationId) || null;
}

function indexConfigResources(
  resources: TerraformConfigResource[]
): Map<string, TerraformConfigResource> {
  const map = new Map<string, TerraformConfigResource>();
  for (const resource of resources) {
    for (const key of getResourceKeys(resource)) {
      map.set(key, resource);
    }
  }
  return map;
}

function getResourceKeys(resource: { address?: string; type: string; name: string }): string[] {
  const keys: string[] = [];
  if (resource.address) {
    keys.push(resource.address);
  }
  keys.push(`${resource.type}.${resource.name}`);
  return keys;
}

function findReferencedKey(
  reference: string,
  candidates: IterableIterator<string>
): string | null {
  const refs = [reference];
  if (reference.includes('.')) {
    refs.push(reference.substring(0, reference.lastIndexOf('.')));
  }

  for (const candidate of candidates) {
    for (const ref of refs) {
      if (
        ref === candidate ||
        ref.startsWith(`${candidate}.`) ||
        ref.startsWith(`${candidate}[`)
      ) {
        return candidate;
      }
    }
  }

  return null;
}

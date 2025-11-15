import express, { Express, Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import yaml from 'yaml';
import { Logger } from '../utils/logger';
import { readRoutesFile, RouteDefinition } from '../utils/routes';
import { substituteEnvVariables } from '../utils/env';

interface ServeOptions {
  routes?: string;
  port?: number | string;
  configDir?: string;
  functionsDir?: string;
  verbose?: boolean;
}

interface LocalLambdaDefinition {
  lambdaName: string;
  runtime: string;
  handler: string;
  functionsDir: string;
  handlerModule: string;
  handlerFunction: string;
  runtimeFamily: 'node' | 'python';
  nodeEntryPath?: string;
}

interface LambdaHttpResult {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
}

const PYTHON_BRIDGE_SCRIPT = `
import contextlib
import importlib
import io
import json
import sys
import traceback

def main():
    module_name = sys.argv[1]
    handler_name = sys.argv[2]
    payload = sys.stdin.read()
    event = json.loads(payload) if payload else None

    try:
        module = importlib.import_module(module_name)
        handler = getattr(module, handler_name)
    except Exception:
        traceback.print_exc()
        sys.exit(1)

    log_buffer = io.StringIO()

    try:
        with contextlib.redirect_stdout(log_buffer):
            result = handler(event, None)
    except Exception:
        traceback.print_exc()
        sys.exit(1)
    finally:
        logs = log_buffer.getvalue()
        if logs:
            sys.stderr.write(logs)

    try:
        sys.stdout.write(json.dumps(result))
    except Exception:
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
`;

export async function serveCommand(options: ServeOptions): Promise<void> {
  const logger = new Logger(Boolean(options.verbose));
  const routesFile = options.routes || 'routes.json';
  const configDir = options.configDir || 'configs';
  const defaultFunctionsDir = options.functionsDir || 'functions';
  const port = parsePort(options.port);

  const routes = await readRoutesFile(routesFile);
  const lambdaDefinitions = await loadLambdaDefinitions(configDir, defaultFunctionsDir, logger);
  validateRoutes(routes, lambdaDefinitions);
  const lambdaRunner = new LambdaRunner(lambdaDefinitions, logger);

  const app = express();
  app.use(express.raw({ type: '*/*', limit: '10mb' }));

  for (const route of routes) {
    registerRoute(app, route, lambdaRunner, logger);
  }

  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });

  await startServer(app, port, logger);
}

function parsePort(value?: number | string): number {
  if (!value) {
    return 3000;
  }

  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid port value: ${value}`);
  }

  return parsed;
}

async function loadLambdaDefinitions(
  configDir: string,
  defaultFunctionsDir: string,
  logger: Logger
): Promise<Map<string, LocalLambdaDefinition>> {
  const resolvedConfigDir = path.resolve(configDir);
  const resolvedDefaultFunctions = path.resolve(defaultFunctionsDir);
  await ensureDirectory(resolvedConfigDir, `Config directory not found: ${resolvedConfigDir}`);

  const entries = await fs.readdir(resolvedConfigDir, { withFileTypes: true });
  const definitions = new Map<string, LocalLambdaDefinition>();

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    if (!entry.name.endsWith('.yaml') && !entry.name.endsWith('.yml')) {
      continue;
    }

    const absolutePath = path.join(resolvedConfigDir, entry.name);
    const yamlContent = await fs.readFile(absolutePath, 'utf-8');
    const parsed = yaml.parse(yamlContent) || {};
    const resolvedConfig = substituteEnvVariables(parsed);
    const configName = path.basename(entry.name, path.extname(entry.name));
    const lambdaName: string =
      resolvedConfig.function_name || configName || entry.name.replace(/\.ya?ml$/, '');
    const runtime: string = resolvedConfig.runtime || 'python3.12';
    const handler: string = resolvedConfig.handler || `${configName}.handler`;
    const functionsDir: string = path.resolve(
      resolvedConfig.functionsDirectory || resolvedDefaultFunctions
    );
    const handlerParts = splitHandler(handler, absolutePath);
    const runtimeFamily = detectRuntimeFamily(runtime);
    const nodeEntryPath =
      runtimeFamily === 'node'
        ? await resolveNodeHandlerPath(functionsDir, handlerParts.moduleName)
        : undefined;

    if (runtimeFamily === 'python') {
      const pythonModulePath = resolvePythonModulePath(functionsDir, handlerParts.moduleName);
      await ensureFile(
        pythonModulePath,
        `Python handler file not found for module "${handlerParts.moduleName}" (${pythonModulePath})`
      );
    }

    const definition: LocalLambdaDefinition = {
      lambdaName,
      runtime,
      handler,
      functionsDir,
      handlerModule: handlerParts.moduleName,
      handlerFunction: handlerParts.functionName,
      runtimeFamily,
      nodeEntryPath,
    };

    if (definitions.has(lambdaName)) {
      throw new Error(`Duplicate Lambda name detected in configs: ${lambdaName}`);
    }

    definitions.set(lambdaName, definition);

    // Allow referencing by config name as a fallback.
    if (!definitions.has(configName)) {
      definitions.set(configName, definition);
    }

    logger.verbose(`Loaded config for ${lambdaName} from ${absolutePath}`);
  }

  if (!definitions.size) {
    throw new Error(`No Lambda configs found under ${resolvedConfigDir}`);
  }

  return definitions;
}

function splitHandler(handler: string, source: string): { moduleName: string; functionName: string } {
  const lastDot = handler.lastIndexOf('.');
  if (lastDot === -1) {
    throw new Error(`Invalid handler "${handler}" in ${source}. Expected format <module>.<function>.`);
  }

  const moduleName = handler.slice(0, lastDot);
  const functionName = handler.slice(lastDot + 1);

  if (!moduleName || !functionName) {
    throw new Error(`Invalid handler "${handler}" in ${source}.`);
  }

  return { moduleName, functionName };
}

function detectRuntimeFamily(runtime: string): 'node' | 'python' {
  const normalized = runtime.toLowerCase();
  if (normalized.startsWith('nodejs')) {
    return 'node';
  }
  if (normalized.startsWith('python')) {
    return 'python';
  }
  throw new Error(`Unsupported runtime "${runtime}". Only Node.js and Python Lambdas are supported.`);
}

async function resolveNodeHandlerPath(functionsDir: string, moduleName: string): Promise<string> {
  const basePath = path.isAbsolute(moduleName)
    ? moduleName
    : path.join(functionsDir, moduleName);
  const hasExtension = Boolean(path.extname(basePath));

  if (hasExtension) {
    await ensureFile(basePath, `Node.js handler file not found: ${basePath}`);
    return basePath;
  }

  const extensions = ['.js', '.cjs', '.mjs'];
  for (const extension of extensions) {
    const candidate = `${basePath}${extension}`;
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to locate Node.js handler file for module "${moduleName}" under ${functionsDir}`
  );
}

function resolvePythonModulePath(functionsDir: string, moduleName: string): string {
  const relativePath = moduleName.replace(/\./g, path.sep) + '.py';
  return path.isAbsolute(relativePath)
    ? relativePath
    : path.join(functionsDir, relativePath);
}

function validateRoutes(
  routes: RouteDefinition[],
  definitions: Map<string, LocalLambdaDefinition>
): void {
  for (const route of routes) {
    if (!definitions.has(route.lambda)) {
      throw new Error(`routes.json references unknown Lambda "${route.lambda}"`);
    }
  }
}

class LambdaRunner {
  constructor(
    private readonly definitions: Map<string, LocalLambdaDefinition>,
    private readonly logger: Logger
  ) {}

  async invoke(lambdaName: string, event: any): Promise<LambdaHttpResult> {
    const definition = this.definitions.get(lambdaName);
    if (!definition) {
      throw new Error(`Lambda "${lambdaName}" is not defined in local configs.`);
    }

    if (definition.runtimeFamily === 'node') {
      return this.invokeNode(definition, event);
    }

    return this.invokePython(definition, event);
  }

  private async invokeNode(definition: LocalLambdaDefinition, event: any): Promise<LambdaHttpResult> {
    if (!definition.nodeEntryPath) {
      throw new Error(`Node.js handler path not resolved for ${definition.lambdaName}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const moduleExports = require(definition.nodeEntryPath);
    const handler =
      moduleExports?.[definition.handlerFunction] ||
      moduleExports?.default?.[definition.handlerFunction];

    if (typeof handler !== 'function') {
      throw new Error(
        `Handler "${definition.handlerFunction}" not exported by ${definition.nodeEntryPath}`
      );
    }

    const context = createLambdaContext(definition.lambdaName);
    const response = await Promise.resolve(handler(event, context));
    return normalizeLambdaResult(response);
  }

  private async invokePython(
    definition: LocalLambdaDefinition,
    event: any
  ): Promise<LambdaHttpResult> {
    const pythonPath = buildPythonPath(definition.functionsDir);
    const payload = JSON.stringify(event ?? {});

    return new Promise<LambdaHttpResult>((resolve, reject) => {
      const child = spawn(
        'python3',
        ['-c', PYTHON_BRIDGE_SCRIPT, definition.handlerModule, definition.handlerFunction],
        {
          env: {
            ...process.env,
            PYTHONPATH: pythonPath,
          },
        }
      );

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `Python handler ${definition.lambdaName} failed (exit ${code}): ${stderr.trim()}`
            )
          );
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(normalizeLambdaResult(parsed));
        } catch (error) {
          reject(
            new Error(
              `Python handler ${definition.lambdaName} returned invalid JSON: ${stdout.trim()}`
            )
          );
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.stdin.write(payload);
      child.stdin.end();
    });
  }
}

function createLambdaContext(functionName: string): Record<string, string> {
  return {
    awsRequestId: randomUUID(),
    functionName,
  };
}

function normalizeLambdaResult(result: any): LambdaHttpResult {
  if (!result || typeof result !== 'object') {
    throw new Error('Lambda handler must return an object with statusCode/body fields.');
  }

  const statusCode = typeof result.statusCode === 'number' ? result.statusCode : 200;
  const headers = normalizeHeaders(result.headers || {});
  let body: string | undefined;

  if (typeof result.body === 'string' || result.body === undefined) {
    body = result.body;
  } else {
    body = JSON.stringify(result.body);
  }

  return { statusCode, headers, body };
}

function buildPythonPath(functionsDir: string): string {
  const existing = process.env.PYTHONPATH || '';
  const components = [functionsDir];
  if (existing) {
    components.push(existing);
  }
  return components.join(path.delimiter);
}

function registerRoute(
  app: Express,
  route: RouteDefinition,
  runner: LambdaRunner,
  logger: Logger
): void {
  const expressPath = route.path === '$default' ? '*' : convertApiGatewayPath(route.path);
  const handler = async (req: Request, res: Response): Promise<void> => {
    try {
      const bodyBuffer = req.body as Buffer;
      const bodyString =
        bodyBuffer && bodyBuffer.length ? bodyBuffer.toString('utf-8') : undefined;

      const event = {
        version: '2.0',
        routeKey: computeRouteKey(route),
        rawPath: req.path,
        headers: normalizeHeaders(req.headers),
        body: bodyString,
        requestContext: {
          http: {
            method: req.method,
            path: req.path,
          },
        },
      };

      const result = await runner.invoke(route.lambda, event);
      if (result.headers) {
        res.set(result.headers);
      }
      res.status(result.statusCode);
      if (result.body !== undefined) {
        res.send(result.body);
      } else {
        res.end();
      }
    } catch (error) {
      logger.error(
        `Error invoking Lambda ${route.lambda}: ${error instanceof Error ? error.message : error}`
      );
      res.status(500).json({
        message: 'Lambda invocation failed',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const method = route.method.toLowerCase();
  if (method === 'any') {
    app.all(expressPath, handler);
  } else if (typeof (app as any)[method] === 'function') {
    (app as any)[method](expressPath, handler);
  } else {
    throw new Error(`Unsupported HTTP method in routes.json: ${route.method}`);
  }

  logger.info(`Registered route ${route.method} ${route.path} -> ${route.lambda}`);
}

function convertApiGatewayPath(apiPath: string): string {
  return apiPath
    .replace(/\{([^+}]+)\+\}/g, (_match, param) => `:${param}+`)
    .replace(/\{([^}]+)\}/g, (_match, param) => `:${param}`);
}

function computeRouteKey(route: RouteDefinition): string {
  if (route.path === '$default') {
    return '$default';
  }
  return `${route.method.toUpperCase()} ${route.path}`;
}

function normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      normalized[key.toLowerCase()] = value.join(', ');
    } else if (value !== undefined && value !== null) {
      normalized[key.toLowerCase()] = String(value);
    }
  }
  return normalized;
}

async function startServer(app: Express, port: number, logger: Logger): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.success(`🚀 Local API Gateway server listening on http://localhost:${port}`);
      resolve();
    });
    server.on('error', (error) => reject(error));
  });
}

async function ensureDirectory(dirPath: string, errorMessage: string): Promise<void> {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(errorMessage);
    }
  } catch (error) {
    throw new Error(errorMessage);
  }
}

async function ensureFile(filePath: string, errorMessage: string): Promise<void> {
  if (!(await fileExists(filePath))) {
    throw new Error(errorMessage);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

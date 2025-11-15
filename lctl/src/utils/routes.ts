import * as fs from 'fs/promises';
import * as path from 'path';

export interface RouteDefinition {
  method: string;
  path: string;
  lambda: string;
}

export async function readRoutesFile(routesFilePath: string): Promise<RouteDefinition[]> {
  const resolvedPath = path.resolve(routesFilePath);
  const fileContent = await fs.readFile(resolvedPath, 'utf-8');
  let parsed: unknown;

  try {
    parsed = JSON.parse(fileContent);
  } catch (error) {
    throw new Error(`Failed to parse routes file as JSON: ${resolvedPath}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Routes file must contain an array: ${resolvedPath}`);
  }

  return parsed.map((item, index) => validateRouteDefinition(item, index, resolvedPath));
}

function validateRouteDefinition(
  item: any,
  index: number,
  sourcePath: string
): RouteDefinition {
  if (!item || typeof item !== 'object') {
    throw new Error(`Invalid route entry at index ${index} in ${sourcePath}`);
  }

  const method = typeof item.method === 'string' ? item.method.trim() : '';
  const routePath = typeof item.path === 'string' ? item.path.trim() : '';
  const lambda = typeof item.lambda === 'string' ? item.lambda.trim() : '';

  if (!method) {
    throw new Error(`Route entry at index ${index} is missing "method" in ${sourcePath}`);
  }

  if (!routePath) {
    throw new Error(`Route entry at index ${index} is missing "path" in ${sourcePath}`);
  }

  if (!lambda) {
    throw new Error(`Route entry at index ${index} is missing "lambda" in ${sourcePath}`);
  }

  const normalizedMethod = method.toUpperCase();
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'ANY'];
  if (!allowedMethods.includes(normalizedMethod)) {
    throw new Error(
      `Route entry at index ${index} has unsupported method "${method}" in ${sourcePath}`
    );
  }

  if (routePath !== '$default' && !routePath.startsWith('/')) {
    throw new Error(
      `Route entry at index ${index} must start with "/" (found "${routePath}") in ${sourcePath}`
    );
  }

  return {
    method: normalizedMethod,
    path: routePath,
    lambda,
  };
}

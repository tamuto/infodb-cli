import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import YAML from 'yaml';
import { Logger } from './logger.js';

export interface CorsConfig {
  enabled?: boolean;
  origin?: string | string[];
  methods?: string[];
  credentials?: boolean;
}

export interface LoggingConfig {
  enabled?: boolean;
  format?: 'combined' | 'dev' | 'common' | 'short' | 'tiny';
  level?: 'error' | 'warn' | 'info' | 'debug';
}

export interface GlobalConfig {
  cors?: CorsConfig;
  logging?: LoggingConfig;
  maxSockets?: number;
}

export interface ServerConfig {
  port: number;
  host?: string;
  name?: string;
  maxSockets?: number;
}

export interface RouteConfig {
  path: string;
  target?: string;
  static?: string;
  changeOrigin?: boolean;
  pathRewrite?: Record<string, string>;
  ws?: boolean;
}

export interface RevxConfig {
  server: ServerConfig;
  global?: GlobalConfig;
  routes: RouteConfig[];
}

export class ConfigLoader {
  constructor(private logger: Logger) {}

  load(configPath: string): RevxConfig {
    const fullPath = resolve(process.cwd(), configPath);

    this.logger.verbose('Loading configuration file', { path: fullPath });

    if (!existsSync(fullPath)) {
      throw new Error(`Configuration file not found: ${fullPath}`);
    }

    try {
      const fileContent = readFileSync(fullPath, 'utf-8');
      const expandedContent = this.expandEnvironmentVariables(fileContent);
      const config = YAML.parse(expandedContent) as RevxConfig;

      this.sortRoutesBySpecificity(config);
      this.validateConfig(config);
      return config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load configuration: ${error.message}`);
      }
      throw error;
    }
  }

  private expandEnvironmentVariables(content: string): string {
    return content.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = process.env[varName];
      if (value === undefined) {
        this.logger.warning(`Environment variable not found: ${varName}, using empty string`);
        return '';
      }
      return value;
    });
  }

  private sortRoutesBySpecificity(config: RevxConfig): void {
    if (!config.routes || config.routes.length === 0) {
      return;
    }

    config.routes.sort((a, b) => {
      const pathA = a.path;
      const pathB = b.path;

      // 1. パスの長さで降順ソート（長いパスが先）
      const lengthDiff = pathB.length - pathA.length;
      if (lengthDiff !== 0) {
        return lengthDiff;
      }

      // 2. ワイルドカードの数で昇順ソート（ワイルドカードが少ない方が具体的）
      const wildcardCountA = (pathA.match(/\*/g) || []).length;
      const wildcardCountB = (pathB.match(/\*/g) || []).length;
      const wildcardDiff = wildcardCountA - wildcardCountB;
      if (wildcardDiff !== 0) {
        return wildcardDiff;
      }

      // 3. 辞書順でソート
      return pathA.localeCompare(pathB);
    });

    this.logger.verbose('Routes sorted by specificity', {
      routes: config.routes.map(r => r.path)
    });
  }

  private validateConfig(config: RevxConfig): void {
    if (!config.server) {
      throw new Error('Server configuration is required');
    }

    if (!config.server.port) {
      throw new Error('Server port is required');
    }

    if (!config.routes || !Array.isArray(config.routes)) {
      throw new Error('Routes configuration is required and must be an array');
    }

    if (config.routes.length === 0) {
      throw new Error('At least one route must be configured');
    }

    for (const route of config.routes) {
      this.validateRoute(route);
    }
  }

  private validateRoute(route: RouteConfig): void {
    if (!route.path) {
      throw new Error('Route path is required');
    }

    const hasTarget = !!route.target;
    const hasStatic = !!route.static;

    if (!hasTarget && !hasStatic) {
      throw new Error(`Route ${route.path} must have either target or static`);
    }

    if (hasTarget && hasStatic) {
      throw new Error(`Route ${route.path} cannot have both target and static`);
    }
  }
}

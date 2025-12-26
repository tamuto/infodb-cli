import { ViteDevServer, createServer, InlineConfig } from 'vite';
import { RequestHandler } from 'express';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { RouteConfig } from './config.js';
import { Logger } from './logger.js';

export class ViteMiddlewareManager {
  private viteServers: Map<string, ViteDevServer> = new Map();

  constructor(private logger: Logger) {}

  async createViteMiddleware(route: RouteConfig): Promise<RequestHandler> {
    if (!route.vite) {
      throw new Error('Route does not have vite configuration');
    }

    const rootPath = resolve(process.cwd(), route.vite.root);

    if (!existsSync(rootPath)) {
      this.logger.error(`Vite root directory does not exist: ${rootPath}`);
      throw new Error(`Vite root directory not found: ${rootPath}`);
    }

    this.logger.info(`Creating Vite middleware: ${route.path} -> ${rootPath}`);

    const viteConfig: InlineConfig = {
      root: rootPath,
      base: route.vite.base || route.path,
      configFile: route.vite.configFile,
      server: {
        middlewareMode: true,
        hmr: {
          // Use the parent server's port for HMR
          clientPort: undefined,
        },
      },
      // Suppress Vite's own logging since we're using our logger
      logLevel: this.logger.isVerbose() ? 'info' : 'warn',
    };

    try {
      const vite = await createServer(viteConfig);
      this.viteServers.set(route.path, vite);

      this.logger.verbose(`Vite server created for ${route.path}`, {
        root: rootPath,
        base: viteConfig.base,
      });

      return vite.middlewares;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Failed to create Vite server for ${route.path}: ${error.message}`);
      }
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.logger.info('Closing Vite servers...');
    const closePromises = Array.from(this.viteServers.values()).map((vite) =>
      vite.close()
    );
    await Promise.all(closePromises);
    this.viteServers.clear();
    this.logger.verbose('All Vite servers closed');
  }

  getServer(path: string): ViteDevServer | undefined {
    return this.viteServers.get(path);
  }

  getServerCount(): number {
    return this.viteServers.size;
  }

  getAllServers(): Array<{ path: string; server: ViteDevServer }> {
    return Array.from(this.viteServers.entries()).map(([path, server]) => ({
      path,
      server,
    }));
  }
}

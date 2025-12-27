import { ViteDevServer, createServer, InlineConfig } from 'vite';
import { RequestHandler } from 'express';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { RouteConfig } from './config.js';
import { Logger } from './logger.js';

export class ViteMiddlewareManager {
  private viteServers: Map<string, ViteDevServer> = new Map();
  private serverPort?: number;
  private serverHost?: string;
  private httpServer?: any;

  constructor(private logger: Logger) {}

  setServerInfo(port: number, host: string, httpServer?: any): void {
    this.serverPort = port;
    this.serverHost = host;
    this.httpServer = httpServer;
    this.logger.verbose(`ViteMiddlewareManager: Server info set to ${host}:${port}`);
  }

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
        hmr: this.httpServer ? {
          // Use the parent HTTP server for HMR WebSocket
          server: this.httpServer,
        } : (this.serverPort ? {
          // Fallback: Use clientPort to direct clients to the parent server
          clientPort: this.serverPort,
        } : {
          // Default fallback
          clientPort: undefined,
        }),
      },
      // Suppress Vite's own logging since we're using our logger
      logLevel: this.logger.isVerbose() ? 'info' : 'warn',
    };

    if (this.httpServer) {
      this.logger.verbose(`Vite HMR configured for ${route.path}: using parent HTTP server`);
    } else if (this.serverPort && this.serverHost) {
      this.logger.verbose(`Vite HMR configured for ${route.path}: clientPort=${this.serverPort}`);
    }

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

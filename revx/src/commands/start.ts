import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { createServer } from 'http';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { ConfigLoader, RevxConfig, RouteConfig } from '../utils/config.js';
import { ProxyManager } from '../utils/proxy.js';
import { ViteMiddlewareManager } from '../utils/vite-middleware.js';
import { Logger } from '../utils/logger.js';

export async function startCommand(configFile: string = 'revx.yaml', options: { verbose?: boolean }) {
  const logger = new Logger(options.verbose);
  const configLoader = new ConfigLoader(logger);
  const viteManager = new ViteMiddlewareManager(logger);

  try {
    logger.info(`Loading configuration from: ${configFile}`);
    const config = configLoader.load(configFile);

    // Configure max sockets for better performance with dev servers like Vite
    const maxSockets = config.server.maxSockets || config.global?.maxSockets || 256;
    http.globalAgent.maxSockets = maxSockets;
    logger.verbose(`Max sockets configured: ${maxSockets}`);

    const app = express();
    const proxyManager = new ProxyManager(logger);

    setupMiddleware(app, config, logger);
    await setupRoutes(app, config, proxyManager, viteManager, logger);
    await startServer(app, config, viteManager, proxyManager, logger);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Failed to start server: ${error.message}`);
    }
    await viteManager.cleanup();
    process.exit(1);
  }
}

function setupMiddleware(app: express.Application, config: RevxConfig, logger: Logger): void {
  if (config.global?.cors?.enabled !== false) {
    const corsOptions = {
      origin: config.global?.cors?.origin || '*',
      methods: config.global?.cors?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: config.global?.cors?.credentials ?? true
    };
    app.use(cors(corsOptions));
    logger.verbose('CORS enabled', corsOptions);
  }

  if (config.global?.logging?.enabled !== false) {
    const format = config.global?.logging?.format || 'combined';
    app.use(morgan(format));
    logger.verbose(`Logging middleware enabled: ${format}`);
  }

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
}

function setupStaticRoute(app: express.Application, route: RouteConfig, logger: Logger): void {
  const rootPath = resolve(process.cwd(), route.static!);

  if (!existsSync(rootPath)) {
    logger.error(`Static directory does not exist: ${rootPath}`);
    throw new Error(`Static directory not found: ${rootPath}`);
  }

  logger.info(`Static files configured: ${route.path} -> ${rootPath}`);
  app.use(route.path, express.static(rootPath));
}

async function setupRoutes(
  app: express.Application,
  config: RevxConfig,
  proxyManager: ProxyManager,
  viteManager: ViteMiddlewareManager,
  logger: Logger
): Promise<void> {
  for (const route of config.routes) {
    if (route.vite) {
      const viteMiddleware = await viteManager.createViteMiddleware(route);
      app.use(route.path, viteMiddleware);
    } else if (route.static) {
      setupStaticRoute(app, route, logger);
    } else {
      const proxyMiddleware = proxyManager.createProxyMiddleware(route);
      app.use(proxyMiddleware);
    }
  }

  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `No route matches ${req.method} ${req.path}`
    });
  });

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`Server error: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
      });
    }
  });
}

async function startServer(
  app: express.Application,
  config: RevxConfig,
  viteManager: ViteMiddlewareManager,
  proxyManager: ProxyManager,
  logger: Logger
): Promise<void> {
  return new Promise((resolve, reject) => {
    const port = config.server.port;
    const host = config.server.host || '0.0.0.0';

    const server = createServer(app);

    // Handle WebSocket upgrade requests for proxied routes
    server.on('upgrade', (req, socket, head) => {
      const proxies = proxyManager.getProxies();

      for (const { middleware, route } of proxies) {
        if (route.ws) {
          // Check if the request URL matches the proxy route
          const urlPath = req.url || '/';
          const routePath = route.path.replace(/\/\*$/, ''); // Remove trailing /*

          if (urlPath.startsWith(routePath)) {
            logger.verbose(`WebSocket upgrade: ${urlPath} -> ${route.target}`);
            // @ts-ignore - upgrade method exists on the middleware
            middleware.upgrade(req, socket, head);
            return;
          }
        }
      }

      // If no proxy matched, close the socket
      logger.verbose(`WebSocket upgrade failed: no matching route for ${req.url}`);
      socket.destroy();
    });

    server.listen(port, host, () => {
      logger.server(`${config.server.name || 'Reverse Proxy'} started`);
      logger.success(`Listening on http://${host}:${port}`);
      logger.info('');
      logger.info('Configured routes:');
      config.routes.forEach((route) => {
        const target = route.target || route.static || (route.vite ? `vite:${route.vite.root}` : 'unknown');
        const wsIndicator = route.ws ? ' (WS)' : '';
        logger.info(`  ${route.path} -> ${target}${wsIndicator}`);
      });
      if (viteManager.getServerCount() > 0) {
        logger.info('');
        logger.info(`Running ${viteManager.getServerCount()} Vite dev server(s)`);
      }
      logger.info('');
      logger.info('Press Ctrl+C to stop the server');
      resolve();
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} is already in use`));
      } else {
        reject(error);
      }
    });

    const shutdown = async () => {
      logger.info('');
      logger.info('Shutting down server...');
      await viteManager.cleanup();
      server.close(() => {
        logger.success('Server stopped');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => {
      shutdown();
    });

    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM signal');
      shutdown();
    });
  });
}

import { createProxyMiddleware, Options, RequestHandler } from 'http-proxy-middleware';
import { RouteConfig } from './config.js';
import { Logger } from './logger.js';
import { ServerResponse } from 'http';

export interface ProxyInfo {
  middleware: RequestHandler;
  route: RouteConfig;
}

export class ProxyManager {
  private proxies: ProxyInfo[] = [];

  constructor(private logger: Logger) {}

  createProxyMiddleware(route: RouteConfig): RequestHandler {
    const options: Options = {
      pathFilter: route.path,
      target: route.target,
      changeOrigin: route.changeOrigin ?? true,
      ws: route.ws ?? false,
      pathRewrite: route.pathRewrite,
      preserveHeaderKeyCase: true,
      autoRewrite: true,

      on: {
        proxyReq: (proxyReq, req) => {
          this.logger.verbose('Proxy request', {
            method: req.method,
            path: req.url,
            target: route.target
          });
        },

        proxyRes: (proxyRes, req, res) => {
          this.logger.verbose('Proxy response', {
            statusCode: proxyRes.statusCode,
            path: req.url
          });
        },

        error: (err, req, res) => {
          this.logger.error(`Proxy error: ${err.message}`);
          const serverRes = res as ServerResponse;
          if (!serverRes.headersSent) {
            serverRes.writeHead(502, { 'Content-Type': 'application/json' });
          }
          serverRes.end(JSON.stringify({
            error: 'Bad Gateway',
            message: 'Failed to proxy request'
          }));
        }
      }
    };

    const middleware = createProxyMiddleware(options);

    // Store proxy info for WebSocket upgrade handling
    this.proxies.push({ middleware, route });

    this.logger.verbose(`Proxy configured: ${route.path} -> ${route.target}`);
    if (route.ws) {
      this.logger.verbose(`WebSocket enabled for: ${route.path}`);
    }

    return middleware;
  }

  getProxies(): ProxyInfo[] {
    return this.proxies;
  }
}

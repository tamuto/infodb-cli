import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { RouteConfig } from './config.js';
import { Logger } from './logger.js';
import { ServerResponse } from 'http';

export class ProxyManager {
  constructor(private logger: Logger) {}

  createProxyMiddleware(route: RouteConfig) {
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
          // Ignore CONTENT_LENGTH_MISMATCH errors - they're usually benign
          if (err.message && err.message.includes('CONTENT_LENGTH_MISMATCH')) {
            this.logger.verbose(`Ignoring CONTENT_LENGTH_MISMATCH for ${req.url}`);
            return;
          }

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

    this.logger.info(`Proxy configured: ${route.path} -> ${route.target}`);
    return createProxyMiddleware(options);
  }
}

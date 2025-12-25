import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { RouteConfig } from './config.js';
import { Logger } from './logger.js';
import { Request, Response } from 'express';
import { IncomingMessage, ServerResponse } from 'http';

export class LoadBalancer {
  private currentIndex = 0;
  private targetHealth: Map<string, boolean> = new Map();

  constructor(
    private targets: string[],
    private strategy: 'round-robin' | 'random' | 'ip-hash' = 'round-robin',
    private logger: Logger
  ) {
    targets.forEach(target => this.targetHealth.set(target, true));
  }

  getTarget(req?: Request): string {
    const healthyTargets = this.targets.filter(t => this.targetHealth.get(t));

    if (healthyTargets.length === 0) {
      this.logger.warning('All targets are unhealthy, using first target');
      return this.targets[0];
    }

    switch (this.strategy) {
      case 'random':
        return healthyTargets[Math.floor(Math.random() * healthyTargets.length)];

      case 'ip-hash':
        if (req) {
          const ip = req.ip || req.socket.remoteAddress || '';
          const hash = this.hashCode(ip);
          return healthyTargets[Math.abs(hash) % healthyTargets.length];
        }
        return healthyTargets[0];

      case 'round-robin':
      default:
        const target = healthyTargets[this.currentIndex % healthyTargets.length];
        this.currentIndex = (this.currentIndex + 1) % healthyTargets.length;
        return target;
    }
  }

  markUnhealthy(target: string): void {
    this.targetHealth.set(target, false);
    this.logger.warning(`Target marked as unhealthy: ${target}`);
  }

  markHealthy(target: string): void {
    this.targetHealth.set(target, true);
    this.logger.verbose(`Target marked as healthy: ${target}`);
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}

export class ProxyManager {
  private loadBalancers: Map<string, LoadBalancer> = new Map();

  constructor(private logger: Logger) {}

  createProxyMiddleware(route: RouteConfig) {
    const options: Options = {
      pathFilter: route.path,
      changeOrigin: route.changeOrigin ?? true,
      ws: route.ws ?? false,
      pathRewrite: route.pathRewrite,
      timeout: route.options?.timeout,
      followRedirects: route.options?.followRedirects,
      selfHandleResponse: false,
      preserveHeaderKeyCase: true,
      autoRewrite: true,

      on: {
        proxyReq: (proxyReq, req) => {
          if (route.options?.headers) {
            Object.entries(route.options.headers).forEach(([key, value]) => {
              proxyReq.setHeader(key, value);
            });
          }

          if (route.transform?.request?.headers?.add) {
            Object.entries(route.transform.request.headers.add).forEach(([key, value]) => {
              proxyReq.setHeader(key, value);
            });
          }

          if (route.transform?.request?.headers?.remove) {
            route.transform.request.headers.remove.forEach(header => {
              proxyReq.removeHeader(header);
            });
          }

          this.logger.verbose('Proxy request', {
            method: req.method,
            path: req.url,
            target: proxyReq.getHeader('host')
          });
        },

        proxyRes: (proxyRes, req, res) => {
          // Remove Content-Length header to prevent CONTENT_LENGTH_MISMATCH errors
          // especially common with Vite dev server which transforms content dynamically
          delete proxyRes.headers['content-length'];

          // Use chunked transfer encoding instead
          if (!proxyRes.headers['transfer-encoding']) {
            proxyRes.headers['transfer-encoding'] = 'chunked';
          }

          if (route.transform?.response?.headers?.add) {
            Object.entries(route.transform.response.headers.add).forEach(([key, value]) => {
              proxyRes.headers[key.toLowerCase()] = value;
            });
          }

          if (route.transform?.response?.headers?.remove) {
            route.transform.response.headers.remove.forEach(header => {
              delete proxyRes.headers[header.toLowerCase()];
            });
          }

          this.logger.verbose('Proxy response', {
            statusCode: proxyRes.statusCode,
            path: req.url,
            transferEncoding: proxyRes.headers['transfer-encoding']
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

    if (route.targets && route.targets.length > 0) {
      const balancer = new LoadBalancer(
        route.targets,
        route.strategy || 'round-robin',
        this.logger
      );
      this.loadBalancers.set(route.path, balancer);

      options.router = (req) => {
        return balancer.getTarget(req as Request);
      };

      this.logger.info(`Load balancer configured for ${route.path} with ${route.targets.length} targets (${route.strategy || 'round-robin'})`);
    } else if (route.target) {
      options.target = route.target;
      this.logger.info(`Proxy configured: ${route.path} -> ${route.target}`);
    }

    return createProxyMiddleware(options);
  }

  getLoadBalancer(path: string): LoadBalancer | undefined {
    return this.loadBalancers.get(path);
  }
}

import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Logger } from '../utils/logger.js';

const SAMPLE_CONFIG = `# revx.yaml - Reverse Proxy Configuration

# Server settings
server:
  port: 3000
  host: 0.0.0.0
  name: "My Reverse Proxy"
  # Max concurrent sockets (useful for Vite and other dev servers)
  # Default: 256
  # maxSockets: 512

# Global configuration
global:
  # Max concurrent sockets (can also be set here)
  # maxSockets: 256

  # CORS settings
  cors:
    enabled: true
    origin: "*"
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    credentials: true

  # Logging settings
  logging:
    enabled: true
    format: "combined"  # combined | dev | common | short | tiny

# Route definitions
routes:
  # Example 1: Simple proxy to API server
  - path: "/api/*"
    target: "http://localhost:4000"
    changeOrigin: true
    pathRewrite:
      "^/api": ""

  # Example 2: WebSocket proxy (critical for HMR)
  - path: "/ws"
    target: "ws://localhost:5000"
    ws: true
    changeOrigin: true

  # Example 3: Static file serving (for Vite build output)
  - path: "/*"
    static: "./dist"

  # Example 4: Proxy to Vite dev server
  # - path: "/*"
  #   target: "http://localhost:5173"
  #   ws: true  # Enable WebSocket for HMR
  #   changeOrigin: true
`;

const SIMPLE_CONFIG = `# revx.yaml - Simple Reverse Proxy Configuration

server:
  port: 3000

routes:
  - path: "/api/*"
    target: "http://localhost:4000"
    pathRewrite:
      "^/api": ""

  - path: "/*"
    target: "http://localhost:5173"
    ws: true
    changeOrigin: true
`;

const VITE_CONFIG = `# revx.yaml - Multi-Vite Project Configuration

# Server settings
server:
  port: 3000
  host: 0.0.0.0
  name: "Multi-Vite Dev Server"
  # Increase max sockets for better performance with Vite
  maxSockets: 512

# Global configuration
global:
  # CORS settings
  cors:
    enabled: true
    origin: "*"

  # Logging settings
  logging:
    enabled: true
    format: "dev"

# Route definitions
routes:
  # Vite project 1
  - path: "/app1"
    vite:
      root: "./projects/app1"
      base: "/app1"

  # Vite project 2
  - path: "/app2"
    vite:
      root: "./projects/app2"
      base: "/app2"

  # Backend API proxy
  - path: "/api/*"
    target: "http://localhost:4000"
    changeOrigin: true
    pathRewrite:
      "^/api": ""
`;

export async function initCommand(options: { simple?: boolean; proxy?: boolean; output?: string; verbose?: boolean }) {
  const logger = new Logger(options.verbose);
  const outputPath = options.output || 'revx.yaml';
  const fullPath = resolve(process.cwd(), outputPath);

  try {
    if (existsSync(fullPath)) {
      logger.error(`Configuration file already exists: ${fullPath}`);
      logger.info('Use --output to specify a different file name');
      process.exit(1);
    }

    let content: string;
    if (options.proxy) {
      content = SAMPLE_CONFIG;
    } else if (options.simple) {
      content = SIMPLE_CONFIG;
    } else {
      // Default: Vite configuration
      content = VITE_CONFIG;
    }

    writeFileSync(fullPath, content, 'utf-8');

    logger.success(`Configuration file created: ${fullPath}`);
    logger.info('Edit the file to configure your routes');
    logger.info(`Start the server with: revx start ${outputPath}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Failed to create configuration file: ${error.message}`);
    }
    process.exit(1);
  }
}

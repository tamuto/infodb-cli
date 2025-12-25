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

export async function initCommand(options: { simple?: boolean; output?: string; verbose?: boolean }) {
  const logger = new Logger(options.verbose);
  const outputPath = options.output || 'revx.yaml';
  const fullPath = resolve(process.cwd(), outputPath);

  try {
    if (existsSync(fullPath)) {
      logger.error(`Configuration file already exists: ${fullPath}`);
      logger.info('Use --output to specify a different file name');
      process.exit(1);
    }

    const content = options.simple ? SIMPLE_CONFIG : SAMPLE_CONFIG;
    writeFileSync(fullPath, content, 'utf-8');

    logger.success(`Configuration file created: ${fullPath}`);
    logger.info('Edit the file to configure your reverse proxy settings');
    logger.info(`Start the proxy with: revx start ${outputPath}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Failed to create configuration file: ${error.message}`);
    }
    process.exit(1);
  }
}

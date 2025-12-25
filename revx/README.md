# @infodb/revx

Reverse proxy CLI tool with YAML configuration. Built with Express and http-proxy-middleware.

## Features

- YAML-based configuration
- Simple reverse proxy setup
- **Automatic route sorting** - Routes are automatically sorted by specificity (longest paths first)
- WebSocket support (critical for HMR)
- Static file serving
- CORS configuration
- Path rewriting
- Environment variable expansion
- Optimized for development servers like Vite

## Installation

```bash
npm install -g @infodb/revx
# or
pnpm add -g @infodb/revx
# or
npx @infodb/revx
```

## Quick Start

1. Create a configuration file:

```bash
revx init
```

This creates a `revx.yaml` file with example configuration.

2. Edit `revx.yaml` to configure your routes:

```yaml
server:
  port: 3000

routes:
  - path: "/api/*"
    target: "http://localhost:4000"
    pathRewrite:
      "^/api": ""
```

3. Start the proxy server:

```bash
revx start
```

## Commands

### `revx start [config-file]`

Start the reverse proxy server.

```bash
# Use default config file (revx.yaml)
revx start

# Use custom config file
revx start my-proxy.yaml

# Verbose output
revx start --verbose
```

### `revx validate <config-file>`

Validate configuration file.

```bash
revx validate revx.yaml

# Show detailed validation info
revx validate revx.yaml --verbose
```

### `revx init`

Create a sample configuration file.

```bash
# Create default configuration
revx init

# Create simple configuration
revx init --simple

# Specify output file
revx init --output my-config.yaml
```

## Configuration

### Basic Configuration

```yaml
server:
  port: 3000
  host: 0.0.0.0
  name: "My Reverse Proxy"

routes:
  - path: "/api/*"
    target: "http://localhost:4000"
    pathRewrite:
      "^/api": ""
```

### Global Settings

```yaml
global:
  # Max concurrent sockets (default: 256)
  # Increase for better performance with dev servers like Vite
  maxSockets: 512

  cors:
    enabled: true
    origin: "*"
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    credentials: true

  logging:
    enabled: true
    format: "combined"  # combined | dev | common | short | tiny
```

### Performance Tuning

#### Max Sockets Configuration

When proxying to development servers like Vite that serve many files concurrently, you may need to increase the maximum number of concurrent sockets:

```yaml
server:
  maxSockets: 512  # Can be set at server level

# OR

global:
  maxSockets: 512  # Can be set globally
```

**Default**: 256

**When to increase**:
- Proxying to Vite or similar dev servers
- Serving applications with many static assets
- High concurrent request scenarios

**Note**: The `server.maxSockets` takes precedence over `global.maxSockets` if both are set.

### Route Configuration

**Important:** Routes are automatically sorted by specificity when loaded. You don't need to worry about the order in your YAML file - the most specific routes (longest paths) will always be matched first.

For example:
```yaml
routes:
  # These will be automatically reordered
  - path: "/"                    # Will match last
    target: "http://static"

  - path: "/api/v1/users/*"      # Will match first (most specific)
    target: "http://users-api"

  - path: "/api/*"               # Will match after /api/v1/users/*
    target: "http://api"
```

The automatic sorting order:
1. Longest paths first
2. Paths with fewer wildcards (more specific)
3. Alphabetical order for equal paths

#### Simple Proxy

```yaml
routes:
  - path: "/api/*"
    target: "http://api.example.com"
    changeOrigin: true
    pathRewrite:
      "^/api": ""
```

#### WebSocket Proxy

WebSocket support is critical for Hot Module Replacement (HMR) with development servers like Vite:

```yaml
routes:
  - path: "/ws"
    target: "ws://websocket.example.com"
    ws: true
    changeOrigin: true
```

#### Static File Serving

Serve static files directly without proxying (useful for `vite build --watch` output):

```yaml
routes:
  - path: "/*"
    static: "./dist"
```

**Combined with API proxy:**
```yaml
routes:
  # API requests go to backend
  - path: "/api/*"
    target: "http://localhost:4000"
    pathRewrite:
      "^/api": ""

  # Static files from Vite build
  - path: "/*"
    static: "./dist"
```

**Use case: Vite build --watch**
```bash
# Terminal 1: Run Vite in build watch mode
vite build --watch

# Terminal 2: Run revx to serve the built files
revx start
```

This serves pre-built static files, avoiding proxy-related errors that can occur with Vite dev server.

### Environment Variables

Use `${VARIABLE_NAME}` syntax to reference environment variables:

```yaml
server:
  port: ${PORT}

routes:
  - path: "/api/*"
    target: "${API_URL}"
```

Then run:

```bash
PORT=3000 API_URL=http://api.example.com revx start
```

## Examples

### Microservices Gateway

```yaml
server:
  port: 8080
  name: "Microservices Gateway"

routes:
  - path: "/users/*"
    target: "http://user-service:3001"
    pathRewrite:
      "^/users": ""

  - path: "/products/*"
    target: "http://product-service:3002"
    pathRewrite:
      "^/products": ""

  - path: "/orders/*"
    target: "http://order-service:3003"
    pathRewrite:
      "^/orders": ""
```

### Development Proxy

```yaml
server:
  port: 3000

global:
  cors:
    enabled: true
    origin: "http://localhost:5173"

routes:
  - path: "/api/*"
    target: "http://localhost:4000"
    pathRewrite:
      "^/api": ""

  - path: "/ws"
    target: "ws://localhost:4000"
    ws: true
```

### Vite Development Server Proxy

```yaml
server:
  port: 3000
  # Increase max sockets for Vite's many concurrent requests
  maxSockets: 512

global:
  cors:
    enabled: true
    origin: "http://localhost:5173"

routes:
  # Proxy API requests to backend
  - path: "/api/*"
    target: "http://localhost:4000"
    pathRewrite:
      "^/api": ""

  # Proxy everything else to Vite dev server
  - path: "/*"
    target: "http://localhost:5173"
    ws: true  # Enable WebSocket for HMR
    changeOrigin: true
```

### Vite Build Watch Mode

```yaml
server:
  port: 3000

routes:
  # Proxy API requests to backend
  - path: "/api/*"
    target: "http://localhost:4000"
    pathRewrite:
      "^/api": ""

  # Serve static files built by Vite
  - path: "/*"
    static: "./dist"
```

Run with:
```bash
# Terminal 1: Build and watch
vite build --watch

# Terminal 2: Serve with revx
revx start
```

## Troubleshooting

### Vite Development Server Issues

When proxying directly to Vite dev server, you may encounter errors due to dynamic content transformation. For a more stable setup, consider using `vite build --watch` with static file serving instead:

```bash
# Terminal 1: Build and watch
vite build --watch

# Terminal 2: Serve with revx
revx start
```

This approach serves pre-built files and avoids proxy-related issues.

### Performance Issues with Dev Servers

If you experience slow loading or timeouts when proxying to Vite or similar dev servers:

1. **Increase max sockets**:
   ```yaml
   server:
     maxSockets: 512  # or higher
   ```

2. **Use verbose mode** to check socket configuration:
   ```bash
   revx start --verbose
   ```

3. **Check the log output** for "Max sockets configured: XXX"

### Common Issues

**Q: Routes not matching correctly**
- Routes are automatically sorted by specificity (longest first)
- Use `--verbose` mode to see the sorted route order

**Q: Path not being rewritten**
- `pathRewrite` is optional; paths are preserved by default
- Only use `pathRewrite` when you need to modify the path

**Q: CORS errors**
- Enable CORS in global config
- Check the `origin` setting matches your client URL

## Development

```bash
# Clone the repository
git clone https://github.com/tamuto/infodb-cli
cd infodb-cli/revx

# Install dependencies
pnpm install

# Build
pnpm build

# Development mode
pnpm dev
```

## License

MIT

## Author

tamuto <tamuto@infodb.jp>

## Links

- [GitHub Repository](https://github.com/tamuto/infodb-cli)
- [Report Issues](https://github.com/tamuto/infodb-cli/issues)

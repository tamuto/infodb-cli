# @infodb/revx

Reverse proxy CLI tool with YAML configuration. Built with Express and http-proxy-middleware.

## Features

- YAML-based configuration
- Simple reverse proxy setup
- **Automatic route sorting** - Routes are automatically sorted by specificity (longest paths first)
- Load balancing (Round-robin, Random, IP-hash)
- WebSocket support
- Request/Response header transformation
- CORS configuration
- SSL/TLS support
- Health checks
- Request ID tracking
- Environment variable expansion

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
  timeout: 30000

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
    level: "info"       # error | warn | info | debug
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

#### Load Balancing

```yaml
routes:
  - path: "/balanced/*"
    targets:
      - "http://server1.example.com"
      - "http://server2.example.com"
      - "http://server3.example.com"
    strategy: "round-robin"  # round-robin | random | ip-hash
    pathRewrite:
      "^/balanced": ""
```

#### WebSocket Proxy

```yaml
routes:
  - path: "/ws"
    target: "ws://websocket.example.com"
    ws: true
    changeOrigin: true
```

#### Header Transformation

```yaml
routes:
  - path: "/transform/*"
    target: "http://backend.example.com"
    transform:
      request:
        headers:
          add:
            X-API-Version: "v2"
            X-Custom-Header: "value"
          remove:
            - "Cookie"
      response:
        headers:
          add:
            X-Proxy-Server: "revx"
          remove:
            - "Server"
```

#### Custom Options

```yaml
routes:
  - path: "/api/*"
    target: "http://api.example.com"
    options:
      timeout: 5000
      followRedirects: true
      headers:
        X-Forwarded-Host: "${HOST}"
```

### Middleware

```yaml
middleware:
  - type: "requestId"
    enabled: true
    headerName: "X-Request-ID"

  - type: "compression"
    enabled: true
    threshold: 1024
```

### SSL/TLS

```yaml
ssl:
  enabled: true
  key: "/path/to/private.key"
  cert: "/path/to/certificate.crt"
  ca: "/path/to/ca.crt"  # Optional
```

### Environment Variables

Use `${VARIABLE_NAME}` syntax to reference environment variables:

```yaml
server:
  port: ${PORT}

routes:
  - path: "/api/*"
    target: "${API_URL}"
    options:
      headers:
        Authorization: "Bearer ${API_TOKEN}"
```

Then run:

```bash
PORT=3000 API_URL=http://api.example.com API_TOKEN=secret revx start
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
    ws: true
    changeOrigin: true
```

### Production Load Balancer

```yaml
server:
  port: 443
  name: "Production Load Balancer"

ssl:
  enabled: true
  key: "/etc/ssl/private/server.key"
  cert: "/etc/ssl/certs/server.crt"

routes:
  - path: "/*"
    targets:
      - "http://app-server-1:8080"
      - "http://app-server-2:8080"
      - "http://app-server-3:8080"
    strategy: "round-robin"
    healthCheck:
      enabled: true
      interval: 30000
      path: "/health"
      timeout: 3000
```

## Troubleshooting

### CONTENT_LENGTH_MISMATCH Error

If you encounter `CONTENT_LENGTH_MISMATCH` errors, the proxy is configured to automatically handle this by:

- Using `selfHandleResponse: false` (default behavior)
- Preserving header key case with `preserveHeaderKeyCase: true`
- Auto-rewriting headers with `autoRewrite: true`

These settings are built-in and should handle most cases automatically.

### Performance Issues with Vite or Dev Servers

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
- Enable CORS in global config or per-route
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

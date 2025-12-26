# Configuration Reference

## Basic Configuration

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

## Global Settings

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

## Performance Tuning

### Max Sockets Configuration

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

## Route Configuration

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

### Simple Proxy

```yaml
routes:
  - path: "/api/*"
    target: "http://api.example.com"
    changeOrigin: true
    pathRewrite:
      "^/api": ""
```

### Vite Middleware

Native Vite integration using middleware mode - the best way to serve multiple Vite projects:

```yaml
routes:
  - path: "/app1"
    vite:
      root: "./projects/app1"
      base: "/app1"
      configFile: "./projects/app1/vite.config.ts"  # optional
```

**Why use Vite middleware instead of proxy?**
- Full HMR support without WebSocket configuration
- No proxy overhead - native Vite performance
- Multiple Vite projects on a single port
- Better error messages and development experience

**Requirements:**
- Vite must be installed: `npm install vite` or `pnpm add vite`
- Each Vite project must have its own directory with a valid configuration

**Multiple Vite projects example:**
```yaml
routes:
  - path: "/dashboard"
    vite:
      root: "./apps/dashboard"
      base: "/dashboard"

  - path: "/admin"
    vite:
      root: "./apps/admin"
      base: "/admin"

  - path: "/api/*"
    target: "http://localhost:4000"
```

### WebSocket Proxy

WebSocket support is critical for Hot Module Replacement (HMR) with development servers like Vite:

```yaml
routes:
  - path: "/ws"
    target: "ws://websocket.example.com"
    ws: true
    changeOrigin: true
```

### Static File Serving

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

## Environment Variables

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

## When to use each route type?

**Vite middleware (`vite` config) - RECOMMENDED for Vite projects:**
```yaml
- path: "/app"
  vite:
    root: "./apps/myapp"
```
- ✅ Best for: Your own Vite projects in the monorepo
- ✅ Native HMR with no configuration
- ✅ No proxy overhead
- ✅ Full Vite dev server features

**Reverse proxy (`target` config) - For external/non-Vite servers:**
```yaml
- path: "/legacy"
  target: "http://localhost:8080"
  ws: true
```
- ✅ Best for: webpack, Parcel, external APIs, legacy apps
- ✅ Preserve HMR via WebSocket proxy
- ✅ Don't need to modify the target server

**Static files (`static` config) - For built assets:**
```yaml
- path: "/docs"
  static: "./dist"
```
- ✅ Best for: Documentation, pre-built assets, `vite build --watch` output
- ✅ No processing overhead
- ✅ Production-like serving

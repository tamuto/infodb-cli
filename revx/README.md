# @infodb/revx

**Host multiple Vite projects on a single port with unified routing.**

Perfect for monorepo development - run all your Vite apps, backend APIs, and other dev servers together with native HMR support.

## Why revx?

Development in a monorepo with multiple Vite projects is painful:
- Each Vite app runs on a different port (3000, 3001, 3002...)
- Cross-app navigation requires hardcoded ports
- Cookie/session sharing is complicated
- CORS issues everywhere

**revx solves this** by using Vite's middleware mode to host everything on one port with path-based routing:

```
http://localhost:3000/app1   → Vite Project 1 (native HMR)
http://localhost:3000/app2   → Vite Project 2 (native HMR)
http://localhost:3000/api    → Your Backend API
http://localhost:3000/legacy → webpack dev server (via proxy)
```

## Features

- **🎯 Primary: Multi-Vite hosting** - Native Vite integration with full HMR support
- **🔌 Reverse proxy** - Integrate webpack, Parcel, or any other dev server
- **📁 Static file serving** - Serve built assets or documentation
- **🎨 YAML configuration** - Simple, declarative routing
- **⚡ Automatic route sorting** - Routes prioritized by specificity
- **🌐 CORS & environment variables** - Full control over cross-origin and config

## Installation

### Option 1: Install as dev dependency (Recommended)

```bash
npm install -D @infodb/revx
# or
pnpm add -D @infodb/revx
```

Then add to package.json scripts:
```json
{
  "scripts": {
    "dev": "revx start",
    "dev:verbose": "revx start --verbose"
  }
}
```

### Option 2: Use with npx/pnpx (No installation)

```bash
npx @infodb/revx start
# or
pnpx @infodb/revx start
```

Good for trying out revx, but slower on repeated runs.

### Option 3: Global installation

```bash
npm install -g @infodb/revx
# or
pnpm add -g @infodb/revx
```

## Quick Start

1. Install revx in your monorepo:

```bash
pnpm add -D @infodb/revx
```

2. Create a configuration file:

```bash
pnpm revx init
```

This creates a `revx.yaml` file with Vite multi-project configuration.

3. Edit `revx.yaml` to point to your Vite projects:

```yaml
server:
  port: 3000
  maxSockets: 512  # Important for Vite performance

routes:
  # Your Vite apps
  - path: "/app1"
    vite:
      root: "./apps/app1"
      base: "/app1"

  - path: "/app2"
    vite:
      root: "./apps/app2"
      base: "/app2"

  # Backend API
  - path: "/api/*"
    target: "http://localhost:4000"
    pathRewrite:
      "^/api": ""
```

4. Start the unified dev server:

```bash
pnpm revx start
# or add to package.json scripts and run: pnpm dev
```

Now all your apps are available at `http://localhost:3000` with full HMR! 🎉

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

#### Vite Middleware (NEW!)

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

### Multi-Vite Project Setup (Recommended)

```yaml
server:
  port: 3000
  name: "Multi-App Dev Server"
  maxSockets: 512

global:
  cors:
    enabled: true
    origin: "*"

routes:
  # App 1 - Customer Portal (Vite)
  - path: "/portal"
    vite:
      root: "./apps/portal"
      base: "/portal"

  # App 2 - Admin Dashboard (Vite)
  - path: "/admin"
    vite:
      root: "./apps/admin"
      base: "/admin"

  # Shared API backend
  - path: "/api/*"
    target: "http://localhost:4000"
    pathRewrite:
      "^/api": ""
```

This setup allows you to:
- Run multiple Vite projects on one port
- Share a single backend API across all apps
- Get full HMR support for all apps
- Develop in a monorepo-friendly way

### Mixed Development Servers (Vite + webpack)

Migrate gradually or mix different build tools:

```yaml
server:
  port: 3000
  maxSockets: 512

routes:
  # New app - using Vite
  - path: "/new-app"
    vite:
      root: "./apps/new-app"
      base: "/new-app"

  # Legacy app - still on webpack dev server
  - path: "/legacy/*"
    target: "http://localhost:8080"
    ws: true  # Enable WebSocket for webpack HMR
    changeOrigin: true

  # Another legacy app - using Parcel
  - path: "/old-dashboard/*"
    target: "http://localhost:1234"
    ws: true
    changeOrigin: true

  # Backend API
  - path: "/api/*"
    target: "http://localhost:4000"
    pathRewrite:
      "^/api": ""

  # Static documentation
  - path: "/docs"
    static: "./public/docs"
```

**Usage:**
```bash
# Terminal 1: Start webpack dev server
cd apps/legacy && npm run dev  # runs on :8080

# Terminal 2: Start Parcel
cd apps/old-dashboard && npm run dev  # runs on :1234

# Terminal 3: Start backend
cd api && npm run dev  # runs on :4000

# Terminal 4: Start revx (unifies everything)
npx revx start
```

Now access everything at `http://localhost:3000`:
- `/new-app` - Vite with native HMR ⚡
- `/legacy` - webpack via proxy 🔌
- `/old-dashboard` - Parcel via proxy 🔌
- `/api` - Backend API 🔌
- `/docs` - Static files 📁

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

### When to use each route type?

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

### Common Issues

**Error: "Vite root directory not found"**
- Check that the `root` path in your config exists
- Use relative paths from where you run `revx start`
- Example: If config is in project root, use `./apps/myapp` not `/apps/myapp`

**Multiple Vite servers slow to start**
- This is normal - each Vite server initializes independently
- Use `--verbose` to see progress
- First startup is slower (dependency pre-bundling)

**HMR not working for proxied webpack app**
- Make sure `ws: true` is set in the route config
- Check that the webpack dev server is actually running
- Verify WebSocket connection in browser dev tools
- No additional webpack configuration needed - revx handles WebSocket upgrade automatically

**Does webpack need special configuration?**
- No! Just add `ws: true` in revx config
- revx automatically handles WebSocket upgrade requests
- Your existing webpack dev server config works as-is

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

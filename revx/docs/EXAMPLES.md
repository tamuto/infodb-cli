# Configuration Examples

## Microservices Gateway

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

## Development Proxy

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

## Vite Development Server Proxy

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

## Multi-Vite Project Setup (Recommended)

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

## Mixed Development Servers (Vite + webpack)

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

## Vite Build Watch Mode

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

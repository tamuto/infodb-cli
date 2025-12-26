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

## Documentation

- **[Configuration Reference](./docs/CONFIGURATION.md)** - Detailed configuration options and performance tuning
- **[Examples](./docs/EXAMPLES.md)** - Real-world configuration examples for various use cases
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

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

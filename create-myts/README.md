# create-myts

Scaffolding tool for TypeScript projects - quickly create new TypeScript projects with pre-configured templates.

## Usage

With npm:

```bash
npm create @infodb/myts
```

With npx:

```bash
npx @infodb/create-myts
```

Then follow the prompts:

1. Enter your project name
2. Select a template (basic, cli, server, or library)
3. Choose whether to automatically install dependencies

## Available Templates

### basic
Minimal TypeScript setup with tsc compiler.

**Use case:** Simple TypeScript projects, learning, quick prototypes

**Includes:**
- TypeScript configuration
- Basic build scripts
- tsx for development

### cli
CLI application template with bin configuration.

**Use case:** Command-line tools and utilities

**Includes:**
- Executable bin file
- CLI argument parsing example
- Ready to publish as npm package with CLI command

### server
HTTP server template using Node.js built-in http module.

**Use case:** Simple web servers, REST APIs, microservices

**Includes:**
- Basic HTTP server
- Example routes
- JSON response handling

### library
TypeScript library template optimized for publishing.

**Use case:** Reusable libraries, npm packages

**Includes:**
- Declaration file generation
- Source maps
- Proper module exports configuration

## Project Structure

After creating a project, you'll get:

```
my-project/
  ├── src/
  │   └── index.ts (or server.ts for server template)
  ├── package.json
  ├── tsconfig.json
  └── .gitignore
```

## Commands in Generated Projects

All templates include these scripts:

- `npm run dev` - Run TypeScript directly with tsx
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled JavaScript

## Requirements

- Node.js 18.0.0 or higher
- npm 7.0.0 or higher

## Development

To work on this package:

```bash
# Clone the repository
git clone <repo-url>
cd create-myts

# Install dependencies
npm install

# Build the CLI
npm run build

# Test locally
node bin/cli.js
```

## License

MIT

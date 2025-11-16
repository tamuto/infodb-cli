# tfme

Terraform provider schema converter and documentation downloader.

## Features

- **YAML Export**: Export specific Terraform resource schema to YAML format (simple conversion, no transformations)
- **Markdown Download**: Download specific resource documentation from Terraform Registry API
- **Auto Provider Detection**: Automatically detect provider name from resource name (e.g., `aws_vpc` → `aws`)
- **GitHub Integration**: Automatically download provider schemas from GitHub repository
- **Local Cache**: Cache downloaded schemas in `~/.tfme/cache/` for faster access

## Installation

```bash
# Install globally
npm install -g @infodb/tfme

# Or use with pnpx
pnpx @infodb/tfme

# Or install locally and build
cd tfme
pnpm install
pnpm run build
```

## Quick Start

### Export Resource Schema to YAML

```bash
# Export resource schema (provider auto-detected from resource name)
pnpx @infodb/tfme export -r aws_vpc -o output

# Clear cache and download fresh schema
pnpx @infodb/tfme export -r aws_vpc --clear-cache -o output
```

### Download Resource Documentation

```bash
# Download resource documentation (provider auto-detected)
pnpx @infodb/tfme download -r aws_vpc -o docs

# With specific version
pnpx @infodb/tfme download -r aws_vpc -v 5.0.0 -o docs
```

## Command Reference

### `export` Command

Export Terraform resource schema to YAML format.

```
tfme export [options]
```

**Options:**
- `-r, --resource <resource>` (required): Resource name (e.g., aws_vpc)
- `-o, --output <dir>`: Output directory (default: "output")
- `--clear-cache`: Clear cache before downloading

**Examples:**

```bash
# Export resource schema (provider auto-detected)
pnpx @infodb/tfme export -r aws_vpc -o output

# Export with cache clearing
pnpx @infodb/tfme export -r azurerm_virtual_network --clear-cache -o output
```

### `download` Command

Download Markdown documentation from Terraform Registry.

```
tfme download [options]
```

**Options:**
- `-r, --resource <resource>` (required): Resource name (e.g., aws_vpc)
- `-o, --output <dir>`: Output directory (default: "docs")
- `-n, --namespace <namespace>`: Provider namespace (default: hashicorp)
- `-v, --version <version>`: Provider version (default: latest)

**Examples:**

```bash
# Download resource documentation (provider auto-detected)
pnpx @infodb/tfme download -r aws_vpc -o docs

# Download with specific version
pnpx @infodb/tfme download -r aws_s3_bucket -v 5.0.0 -o docs

# Download with custom namespace
pnpx @infodb/tfme download -r aws_vpc -n hashicorp -o docs
```

## Schema Generation (for Repository Maintainers)

Provider schemas are stored in this repository under `schemas/providers/`. To generate new schemas:

```bash
cd schemas/scripts
./generate-schemas.sh
```

This script:
1. Initializes Terraform for each provider (aws, azurerm, google)
2. Generates schema JSON for each provider
3. Saves to `schemas/providers/{provider}.json`

## Output Format

### YAML Export

The export command extracts the specified resource schema and converts it to YAML format:

```yaml
version: 1
block:
  attributes:
    arn:
      type: string
      description_kind: plain
      computed: true
    cidr_block:
      type: string
      description_kind: plain
      optional: true
      computed: true
    enable_dns_support:
      type: bool
      description_kind: plain
      optional: true
```

### Markdown Documentation

Downloaded documentation is in standard Terraform documentation format:

```markdown
---
subcategory: "VPC (Virtual Private Cloud)"
layout: "aws"
page_title: "AWS: aws_vpc"
---

# Resource: aws_vpc

Provides a VPC resource.

## Example Usage
...
```

## Cache Directory

Downloaded schemas are cached in `~/.tfme/cache/` to improve performance:

```
~/.tfme/
└── cache/
    ├── aws.json
    ├── azurerm.json
    └── google.json
```

Clear cache with `--clear-cache` flag or manually delete files.

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Watch mode
pnpm run dev

# Run CLI
pnpm run start export -r aws_vpc -o output
pnpm run start download -r aws_vpc -o docs
```

### Project Structure

```
tfme/
├── bin/cli.js              # CLI entry point
├── src/
│   ├── index.ts            # Main CLI setup
│   ├── commands/
│   │   ├── export.ts       # Export command
│   │   └── download.ts     # Download command
│   └── utils/
│       ├── converter.ts    # JSON to YAML converter
│       ├── schema-fetcher.ts # GitHub schema fetcher with cache
│       └── registry-client.ts # Terraform Registry API client
└── schemas/
    ├── terraform/          # Terraform configurations per provider
    │   ├── aws/
    │   ├── azurerm/
    │   └── google/
    ├── providers/          # Generated schema JSON files
    └── scripts/
        └── generate-schemas.sh
```

## License

MIT

# tfme

Terraform schema to YAML conversion and documentation download.

## Features

- **YAML Export**: Convert `terraform providers schema -json` output to YAML format
- **Markdown Download**: Download resource documentation from Terraform Registry
- **Split Files**: Generate one YAML file per resource for better organization
- **Provider Filtering**: Export/download specific providers or resources

## Installation

```bash
# Install globally
npm install -g @infodb/tfme

# Or use with pnpx
pnpx @infodb/tfme

# Or install locally and build
cd tfme
npm install
npm run build
```

## Usage

### 1. Generate Terraform Provider Schema

First, generate the provider schema JSON file:

```bash
cd sample/terraform
terraform init
terraform providers schema -json > ../providers/providers.json
```

### 2. Export to YAML

Export all resources from all providers:

```bash
pnpx @infodb/tfme export sample/providers/providers.json --output output --split
```

Export specific provider:

```bash
pnpx @infodb/tfme export sample/providers/providers.json --provider aws --output output --split
```

Export specific resource:

```bash
pnpx @infodb/tfme export sample/providers/providers.json --provider aws --resource aws_vpc --output output
```

### 3. Download Documentation

Download all resource documentation:

```bash
pnpx @infodb/tfme download sample/providers/providers.json --output docs
```

Download specific provider documentation:

```bash
pnpx @infodb/tfme download sample/providers/providers.json --provider aws --output docs
```

Download specific resource documentation:

```bash
pnpx @infodb/tfme download sample/providers/providers.json --provider aws --resource aws_vpc --output docs
```

## Command Reference

### `export` Command

Export Terraform provider schema to YAML format.

```
tfme export <json-path> [options]
```

**Arguments:**
- `<json-path>`: Path to providers.json file (from `terraform providers schema -json`)

**Options:**
- `-p, --provider <provider>`: Filter by provider name (e.g., aws, azurerm)
- `-r, --resource <resource>`: Export specific resource (e.g., aws_instance)
- `-o, --output <dir>`: Output directory (default: "output")
- `-s, --split`: Generate split files (one per resource)

**Examples:**

```bash
# Export all providers to single files
pnpx @infodb/tfme export sample/providers/providers.json -o output

# Export all providers to split files (one per resource)
pnpx @infodb/tfme export sample/providers/providers.json -o output --split

# Export specific provider
pnpx @infodb/tfme export sample/providers/providers.json -p aws -o output --split

# Export specific resource
pnpx @infodb/tfme export sample/providers/providers.json -p aws -r aws_vpc -o output
```

### `download` Command

Download Markdown documentation from Terraform Registry.

```
tfme download <json-path> [options]
```

**Arguments:**
- `<json-path>`: Path to providers.json file

**Options:**
- `-p, --provider <provider>`: Filter by provider name
- `-r, --resource <resource>`: Download specific resource documentation
- `-o, --output <dir>`: Output directory (default: "docs")
- `-v, --version <version>`: Provider version (default: "latest")

**Examples:**

```bash
# Download all documentation
pnpx @infodb/tfme download sample/providers/providers.json -o docs

# Download specific provider
pnpx @infodb/tfme download sample/providers/providers.json -p aws -o docs

# Download specific resource
pnpx @infodb/tfme download sample/providers/providers.json -p aws -r aws_vpc -o docs

# Download specific version
pnpx @infodb/tfme download sample/providers/providers.json -p aws -v 5.0.0 -o docs
```

## Output Format

### Split Files Structure

When using `--split` option:

```
output/
  aws/
    resources/
      aws_instance.yaml
      aws_s3_bucket.yaml
      ...
  azurerm/
    resources/
      azurerm_virtual_machine.yaml
      ...
```

### YAML Structure

```yaml
provider_info:
  namespace: hashicorp
  name: aws
  version: "5.0.0"

resources:
  aws_instance:
    name: aws_instance
    type: resource
    description:
      en_us: "Provides an EC2 instance resource"
      ja_jp: ""
    attributes:
      ami:
        name: ami
        type: string
        required: true
        description:
          en_us: "AMI to use for the instance"
          ja_jp: ""
      instance_type:
        name: instance_type
        type: string
        required: true
        description:
          en_us: "The instance type to use for the instance"
          ja_jp: ""
    blocks:
      ebs_block_device:
        name: ebs_block_device
        nesting_mode: list
        description:
          en_us: "Additional EBS block devices to attach to the instance"
          ja_jp: ""
        attributes:
          device_name:
            name: device_name
            type: string
            required: true
            description:
              en_us: "The name of the device to mount"
              ja_jp: ""
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run CLI
npm run start <command> [options]
```

## License

See project root for license information.

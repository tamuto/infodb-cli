#!/bin/bash

# Terraform Provider Schema Generator
# This script generates schema JSON files for each provider

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/../terraform"
OUTPUT_DIR="$SCRIPT_DIR/../providers"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# List of providers
PROVIDERS=("aws" "azurerm" "google")

echo "Generating Terraform provider schemas..."
echo "========================================"

for provider in "${PROVIDERS[@]}"; do
    echo ""
    echo "Processing $provider..."

    provider_dir="$TERRAFORM_DIR/$provider"

    if [ ! -d "$provider_dir" ]; then
        echo "  ⚠️  Directory not found: $provider_dir"
        continue
    fi

    cd "$provider_dir"

    # Initialize terraform
    echo "  → Running terraform init..."
    if ! terraform init -upgrade > /dev/null 2>&1; then
        echo "  ❌ terraform init failed for $provider"
        continue
    fi

    # Generate schema
    echo "  → Generating schema..."
    if terraform providers schema -json > "$OUTPUT_DIR/$provider.json" 2>/dev/null; then
        echo "  ✅ Generated: $OUTPUT_DIR/$provider.json"

        # Show file size
        size=$(ls -lh "$OUTPUT_DIR/$provider.json" | awk '{print $5}')
        echo "     Size: $size"
    else
        echo "  ❌ Failed to generate schema for $provider"
    fi
done

echo ""
echo "========================================"
echo "Schema generation completed!"
echo ""
echo "Generated files:"
ls -lh "$OUTPUT_DIR"/*.json 2>/dev/null || echo "No files generated"

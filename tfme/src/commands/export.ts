import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { SchemaFetcher } from '../utils/schema-fetcher';
import { Converter } from '../utils/converter';

export interface ExportOptions {
  resource: string;
  output: string;
  clearCache?: boolean;
}

export async function exportCommand(options: ExportOptions): Promise<void> {
  // Auto-detect provider from resource name
  const provider = inferProviderFromResource(options.resource);

  console.log(`Starting YAML export for ${options.resource}...`);
  console.log(`Provider: ${provider}`);

  const fetcher = new SchemaFetcher();

  // Clear cache if requested
  if (options.clearCache) {
    fetcher.clearCache(provider);
  }

  try {
    // Get schema from GitHub/cache
    const schemaJson = await fetcher.getSchema(provider);

    // Parse JSON
    const schemaData = JSON.parse(schemaJson);

    // Extract resource schema
    const resourceSchema = extractResourceSchema(schemaData, provider, options.resource);

    if (!resourceSchema) {
      throw new Error(`Resource not found: ${options.resource}`);
    }

    // Convert to YAML
    console.log(`Converting to YAML...`);
    const yamlContent = Converter.objectToYaml(resourceSchema);

    // Write output file
    const outputPath = `${options.output}/${options.resource}.yaml`;
    ensureDirectoryExists(outputPath);
    writeFileSync(outputPath, yamlContent, 'utf-8');

    console.log(`✅ Exported: ${outputPath}`);
    console.log(`\nExport completed!`);
  } catch (error) {
    console.error(`Export failed:`, error);
    throw error;
  }
}

function inferProviderFromResource(resourceName: string): string {
  // Extract provider name from resource name (e.g., "aws_vpc" -> "aws")
  const parts = resourceName.split('_');
  if (parts.length < 2) {
    throw new Error(`Invalid resource name format: ${resourceName}. Expected format: {provider}_{resource_type}`);
  }
  return parts[0];
}

function extractResourceSchema(schemaData: any, provider: string, resourceName: string): any | null {
  // Find provider schema
  const providerSchemas = schemaData.provider_schemas || {};

  // Try to find the provider schema (could be registry.terraform.io/hashicorp/{provider})
  let providerSchema = null;
  for (const key of Object.keys(providerSchemas)) {
    if (key.includes(`/${provider}`)) {
      providerSchema = providerSchemas[key];
      break;
    }
  }

  if (!providerSchema) {
    return null;
  }

  // Check resource_schemas
  if (providerSchema.resource_schemas && providerSchema.resource_schemas[resourceName]) {
    return providerSchema.resource_schemas[resourceName];
  }

  // Check data_source_schemas
  if (providerSchema.data_source_schemas && providerSchema.data_source_schemas[resourceName]) {
    return providerSchema.data_source_schemas[resourceName];
  }

  return null;
}

function ensureDirectoryExists(path: string): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

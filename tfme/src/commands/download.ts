import { SchemaFetcher } from '../utils/schema-fetcher';
import { RegistryClient, ProviderVersion } from '../utils/registry-client';

export interface DownloadOptions {
  resource?: string;
  datasource?: string;
  output: string;
  namespace?: string;
  version?: string;
}

export async function downloadCommand(options: DownloadOptions): Promise<void> {
  // Validate that exactly one of resource or datasource is specified
  if (!options.resource && !options.datasource) {
    throw new Error('Either --resource or --datasource must be specified');
  }
  if (options.resource && options.datasource) {
    throw new Error('Cannot specify both --resource and --datasource');
  }

  // Determine target name and category
  const targetName = options.resource || options.datasource!;
  const category = options.resource ? 'resources' : 'data-sources';
  const typeLabel = options.resource ? 'resource' : 'data source';

  // Auto-detect provider from resource/datasource name
  const provider = inferProviderFromResource(targetName);

  console.log('Starting documentation download...');
  console.log(`Provider: ${provider}`);
  console.log(`Type: ${typeLabel}`);

  try {
    // Get provider info from schema
    const fetcher = new SchemaFetcher();
    const schemaJson = await fetcher.getSchema(provider);

    const schema = JSON.parse(schemaJson);

    // Extract provider info from schema
    const providerKeys = Object.keys(schema.provider_schemas || {});
    if (providerKeys.length === 0) {
      throw new Error('No providers found in schema');
    }

    // Use first provider or match by name
    const providerKey = providerKeys.find(k => k.includes(provider)) || providerKeys[0];
    const [, namespace, name] = providerKey.match(/^(?:registry\.terraform\.io\/)?([^\/]+)\/(.+)$/) || [];

    const providerVersion: ProviderVersion = {
      namespace: options.namespace || namespace || 'hashicorp',
      name: provider,
      version: options.version || 'latest',
    };

    console.log(`Provider: ${providerVersion.namespace}/${providerVersion.name}@${providerVersion.version}`);

    // Download documentation
    const client = new RegistryClient();
    const outputPath = `${options.output}/${targetName}.md`;

    console.log(`Downloading documentation for ${targetName}...`);
    await client.downloadResourceDoc(providerVersion, targetName, category, outputPath);

    console.log(`✅ Downloaded: ${outputPath}`);
    console.log(`\nDownload completed!`);
  } catch (error) {
    console.error(`Download failed:`, error);
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

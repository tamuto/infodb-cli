import { SchemaFetcher } from '../utils/schema-fetcher';
import { RegistryClient, ProviderVersion } from '../utils/registry-client';

export interface DownloadOptions {
  resource: string;
  output: string;
  namespace?: string;
  version?: string;
}

export async function downloadCommand(options: DownloadOptions): Promise<void> {
  // Auto-detect provider from resource name
  const provider = inferProviderFromResource(options.resource);

  console.log('Starting documentation download...');
  console.log(`Provider: ${provider}`);

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
    const outputPath = `${options.output}/${options.resource}.md`;

    console.log(`Downloading documentation for ${options.resource}...`);
    await client.downloadResourceDoc(providerVersion, options.resource, outputPath);

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

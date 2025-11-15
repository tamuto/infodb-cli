import { SchemaParser } from '../parsers/schema-parser';
import { RegistryClient } from '../utils/registry-client';

export interface DownloadOptions {
  provider?: string;
  resource?: string;
  output: string;
  version?: string;
}

export async function downloadCommand(jsonPath: string, options: DownloadOptions): Promise<void> {
  console.log('Starting documentation download...');

  const parser = new SchemaParser(jsonPath);
  const client = new RegistryClient();

  const providers = parser.getProviders();
  console.log(`Found ${providers.length} provider(s): ${providers.join(', ')}`);

  // Filter by provider if specified
  const targetProviders = options.provider
    ? providers.filter((p) => p.includes(options.provider!))
    : providers;

  if (targetProviders.length === 0) {
    console.error(`No providers found matching: ${options.provider}`);
    return;
  }

  for (const providerName of targetProviders) {
    console.log(`\nProcessing provider: ${providerName}`);
    const providerInfo = parser.getProviderInfo(providerName);

    // Use specified version or 'latest'
    const version = options.version || 'latest';
    const providerVersion = {
      ...providerInfo,
      version,
    };

    if (options.resource) {
      // Download single resource documentation
      const outputPath = `${options.output}/${providerInfo.name}/resources/${options.resource}.md`;
      console.log(`Downloading documentation for ${options.resource}...`);

      try {
        await client.downloadResourceDoc(providerVersion, options.resource, outputPath);
        console.log(`Downloaded: ${outputPath}`);
      } catch (error) {
        console.error(`Error:`, error);
      }
    } else {
      // Download all resource documentation
      const resources = parser.getResources(providerName);
      const resourceNames = Object.keys(resources);
      console.log(`Found ${resourceNames.length} resource(s)`);

      await client.downloadAllResourceDocs(providerVersion, resourceNames, options.output);
      console.log(`Downloaded ${resourceNames.length} files to: ${options.output}/${providerInfo.name}/resources/`);
    }
  }

  console.log('\nDownload completed!');
}

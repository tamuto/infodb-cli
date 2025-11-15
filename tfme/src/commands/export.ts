import { SchemaParser } from '../parsers/schema-parser';
import { YamlGenerator } from '../generators/yaml-generator';

export interface ExportOptions {
  provider?: string;
  resource?: string;
  output: string;
  split?: boolean;
}

export async function exportCommand(jsonPath: string, options: ExportOptions): Promise<void> {
  console.log('Starting YAML export...');

  const parser = new SchemaParser(jsonPath);
  const generator = new YamlGenerator();

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

    if (options.resource) {
      // Export single resource
      const resource = parser.getResource(providerName, options.resource);
      if (!resource) {
        console.error(`Resource not found: ${options.resource}`);
        continue;
      }

      const output = {
        provider_info: providerInfo,
        resources: {
          [options.resource]: resource,
        },
      };

      const outputPath = options.split
        ? `${options.output}/${providerInfo.name}/resources/${options.resource}.yaml`
        : `${options.output}/${providerInfo.name}_${options.resource}.yaml`;

      generator.generateSingleFile(output, outputPath);
      console.log(`Exported: ${outputPath}`);
    } else {
      // Export all resources
      const resources = parser.getResources(providerName);
      const resourceCount = Object.keys(resources).length;
      console.log(`Found ${resourceCount} resource(s)`);

      if (options.split) {
        generator.generateSplitFiles(providerInfo, resources, options.output);
        console.log(`Exported ${resourceCount} files to: ${options.output}/${providerInfo.name}/resources/`);
      } else {
        const output = {
          provider_info: providerInfo,
          resources,
        };
        const outputPath = `${options.output}/${providerInfo.name}.yaml`;
        generator.generateSingleFile(output, outputPath);
        console.log(`Exported: ${outputPath}`);
      }
    }
  }

  console.log('\nExport completed!');
}

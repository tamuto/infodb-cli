import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { stringify } from 'yaml';
import type { YamlOutput, YamlResource, YamlProviderInfo } from '../types/schema.js';

export class YamlGenerator {
  /**
   * Generate a single YAML file for all resources
   */
  generateSingleFile(output: YamlOutput, outputPath: string): void {
    this.ensureDirectoryExists(outputPath);
    const yamlContent = stringify(output, {
      indent: 2,
      lineWidth: 0,
      defaultStringType: 'PLAIN',
    });
    writeFileSync(outputPath, yamlContent, 'utf-8');
  }

  /**
   * Generate split YAML files (one per resource)
   */
  generateSplitFiles(
    providerInfo: YamlProviderInfo,
    resources: { [key: string]: YamlResource },
    outputDir: string
  ): void {
    const providerDir = `${outputDir}/${providerInfo.name}`;
    const resourcesDir = `${providerDir}/resources`;

    this.ensureDirectoryExists(resourcesDir);

    // Generate a file for each resource
    for (const [resourceName, resource] of Object.entries(resources)) {
      const resourceOutput: YamlOutput = {
        provider_info: providerInfo,
        resources: {
          [resourceName]: resource,
        },
      };

      const outputPath = `${resourcesDir}/${resourceName}.yaml`;
      const yamlContent = stringify(resourceOutput, {
        indent: 2,
        lineWidth: 0,
        defaultStringType: 'PLAIN',
      });

      writeFileSync(outputPath, yamlContent, 'utf-8');
    }
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectoryExists(path: string): void {
    const dir = path.endsWith('.yaml') || path.endsWith('.yml') ? dirname(path) : path;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

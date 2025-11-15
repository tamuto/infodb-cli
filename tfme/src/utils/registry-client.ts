import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

export interface ProviderVersion {
  namespace: string;
  name: string;
  version: string;
}

export class RegistryClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://registry.terraform.io') {
    this.baseUrl = baseUrl;
  }

  /**
   * Download documentation for a specific resource
   */
  async downloadResourceDoc(
    provider: ProviderVersion,
    resourceName: string,
    outputPath: string
  ): Promise<void> {
    const url = this.buildDocUrl(provider, resourceName);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const content = await response.text();
      this.ensureDirectoryExists(outputPath);
      writeFileSync(outputPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to download documentation for ${resourceName}: ${error}`);
    }
  }

  /**
   * Download documentation for all resources
   */
  async downloadAllResourceDocs(
    provider: ProviderVersion,
    resourceNames: string[],
    outputDir: string
  ): Promise<void> {
    const providerDir = `${outputDir}/${provider.name}`;
    const resourcesDir = `${providerDir}/resources`;

    this.ensureDirectoryExists(resourcesDir);

    for (const resourceName of resourceNames) {
      const outputPath = `${resourcesDir}/${resourceName}.md`;
      console.log(`Downloading documentation for ${resourceName}...`);

      try {
        await this.downloadResourceDoc(provider, resourceName, outputPath);
      } catch (error) {
        console.error(`Error downloading ${resourceName}:`, error);
      }
    }
  }

  /**
   * Build documentation URL for a resource
   */
  private buildDocUrl(provider: ProviderVersion, resourceName: string): string {
    // Example: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
    const resourceType = resourceName.startsWith(`${provider.name}_`) ? 'resources' : 'data-sources';
    return `${this.baseUrl}/providers/${provider.namespace}/${provider.name}/${provider.version}/docs/${resourceType}/${resourceName}`;
  }

  /**
   * Ensure directory exists
   */
  private ensureDirectoryExists(path: string): void {
    const dir = path.endsWith('.md') ? dirname(path) : path;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

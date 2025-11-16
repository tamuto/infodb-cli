import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

export interface ProviderVersion {
  namespace: string;
  name: string;
  version: string;
}

interface ProviderVersionData {
  id: string;
  attributes: {
    version: string;
  };
}

interface DocumentData {
  id: string;
  attributes: {
    slug: string;
    title: string;
    category: string;
    content?: string;
  };
}

interface ApiResponse {
  data: any;
  meta?: {
    pagination?: {
      'total-pages'?: number;
    };
  };
}

/**
 * Terraform Registry API Client
 * Based on Python implementation from terramod-schema
 */
export class RegistryClient {
  private baseUrl: string;
  private requestDelay: number;
  private pageDelay: number;

  constructor(
    baseUrl: string = 'https://registry.terraform.io',
    requestDelay: number = 100,
    pageDelay: number = 500
  ) {
    this.baseUrl = baseUrl;
    this.requestDelay = requestDelay;
    this.pageDelay = pageDelay;
  }

  /**
   * Get provider version ID from version string
   */
  async getProviderVersionId(
    namespace: string,
    name: string,
    version: string
  ): Promise<string | null> {
    const url = `${this.baseUrl}/v2/providers/${namespace}/${name}/provider-versions`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'tfme/0.2.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as ApiResponse;
      const versions = data.data as ProviderVersionData[];

      for (const pv of versions) {
        if (pv.attributes.version === version) {
          return pv.id;
        }
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to get provider version ID: ${error}`);
    }
  }

  /**
   * Get latest provider version
   */
  async getLatestVersion(namespace: string, name: string): Promise<string> {
    const url = `${this.baseUrl}/v2/providers/${namespace}/${name}/provider-versions`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'tfme/0.2.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as ApiResponse;
      const versions = (data.data as ProviderVersionData[])
        .map(pv => pv.attributes.version)
        .sort()
        .reverse();

      return versions[0] || '';
    } catch (error) {
      throw new Error(`Failed to get latest version: ${error}`);
    }
  }

  /**
   * Get list of provider documentation entries
   */
  async getProviderDocsList(
    providerVersionId: string,
    category?: string,
    pageSize: number = 100
  ): Promise<DocumentData[]> {
    const allDocs: DocumentData[] = [];
    let page = 1;

    while (true) {
      const url = `${this.baseUrl}/v2/provider-docs`;
      const params = new URLSearchParams({
        'filter[provider-version]': providerVersionId,
        'page[size]': pageSize.toString(),
        'page[number]': page.toString(),
      });

      if (category) {
        params.set('filter[category]', category);
      }

      try {
        const response = await fetch(`${url}?${params}`, {
          headers: {
            'User-Agent': 'tfme/0.2.0',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as ApiResponse;
        const docs = data.data as DocumentData[];

        if (!docs || docs.length === 0) {
          break;
        }

        allDocs.push(...docs);

        console.log(`  Retrieved page ${page} with ${docs.length} documents`);

        // Check if there are more pages
        if (docs.length < pageSize) {
          break;
        }

        // Check pagination metadata
        if (data.meta?.pagination?.['total-pages']) {
          const totalPages = data.meta.pagination['total-pages'];
          if (page >= totalPages) {
            break;
          }
        }

        page++;

        // Rate limiting: wait before next page request
        if (page > 1) {
          await this.sleep(this.pageDelay);
        }
      } catch (error) {
        throw new Error(`Failed to get docs list (page ${page}): ${error}`);
      }
    }

    return allDocs;
  }

  /**
   * Get content of a specific document
   */
  async getDocumentContent(docId: string): Promise<string> {
    const url = `${this.baseUrl}/v2/provider-docs/${docId}`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'tfme/0.2.0',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as ApiResponse;
      const content = (data.data as DocumentData).attributes.content || '';

      // Rate limiting: wait before next request
      await this.sleep(this.requestDelay);

      return content;
    } catch (error) {
      throw new Error(`Failed to get document content: ${error}`);
    }
  }

  /**
   * Download documentation for a specific resource
   */
  async downloadResourceDoc(
    provider: ProviderVersion,
    resourceName: string,
    outputPath: string
  ): Promise<void> {
    try {
      // Get provider version ID
      let providerVersionId: string | null;

      if (provider.version === 'latest') {
        const latestVersion = await this.getLatestVersion(provider.namespace, provider.name);
        providerVersionId = await this.getProviderVersionId(provider.namespace, provider.name, latestVersion);
      } else {
        providerVersionId = await this.getProviderVersionId(provider.namespace, provider.name, provider.version);
      }

      if (!providerVersionId) {
        throw new Error(`Provider version not found: ${provider.namespace}/${provider.name}@${provider.version}`);
      }

      // Get docs list for resources category
      const category = resourceName.startsWith(`${provider.name}_`) ? 'resources' : 'data-sources';
      const docs = await this.getProviderDocsList(providerVersionId, category);

      // Remove provider prefix from resource name to get slug
      // e.g., "aws_vpc" -> "vpc"
      const slug = resourceName.startsWith(`${provider.name}_`)
        ? resourceName.substring(provider.name.length + 1)
        : resourceName;

      // Find the specific resource document
      const doc = docs.find(d => d.attributes.slug === slug);

      if (!doc) {
        throw new Error(`Document not found for resource: ${resourceName} (slug: ${slug})`);
      }

      // Get document content
      const content = await this.getDocumentContent(doc.id);

      // Save to file
      this.ensureDirectoryExists(outputPath);
      writeFileSync(outputPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to download documentation for ${resourceName}: ${error}`);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

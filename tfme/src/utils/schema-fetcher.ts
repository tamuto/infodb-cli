import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Schema fetcher with GitHub integration and local caching
 */
export class SchemaFetcher {
  private cacheDir: string;
  private githubBaseUrl: string;
  private githubBranch: string;

  constructor(
    githubRepo: string = 'tamuto/infodb-cli',
    branch: string = 'main',
    cacheDir?: string
  ) {
    this.cacheDir = cacheDir || join(homedir(), '.tfme', 'cache');
    this.githubBaseUrl = `https://raw.githubusercontent.com/${githubRepo}/${branch}/tfme/schemas/providers`;
    this.githubBranch = branch;

    // Ensure cache directory exists
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Get schema for a provider (from cache or GitHub)
   */
  async getSchema(provider: string): Promise<string> {
    const cacheFile = join(this.cacheDir, `${provider}.json`);

    // Check cache first
    if (existsSync(cacheFile)) {
      console.log(`Using cached schema for ${provider}`);
      return readFileSync(cacheFile, 'utf-8');
    }

    // Download from GitHub
    console.log(`Downloading schema for ${provider} from GitHub...`);
    const url = `${this.githubBaseUrl}/${provider}.json`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();

      // Validate JSON
      JSON.parse(content);

      // Cache the result
      writeFileSync(cacheFile, content, 'utf-8');
      console.log(`Cached schema for ${provider}`);

      return content;
    } catch (error) {
      throw new Error(`Failed to download schema for ${provider}: ${error}`);
    }
  }

  /**
   * Clear cache for a provider
   */
  clearCache(provider?: string): void {
    if (provider) {
      const cacheFile = join(this.cacheDir, `${provider}.json`);
      if (existsSync(cacheFile)) {
        const fs = require('fs');
        fs.unlinkSync(cacheFile);
        console.log(`Cleared cache for ${provider}`);
      }
    } else {
      // Clear all cache
      const fs = require('fs');
      if (existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            fs.unlinkSync(join(this.cacheDir, file));
          }
        }
        console.log('Cleared all cache');
      }
    }
  }

  /**
   * Get cache directory path
   */
  getCacheDir(): string {
    return this.cacheDir;
  }
}

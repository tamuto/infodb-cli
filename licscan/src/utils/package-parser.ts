import { promises as fs } from 'fs';
import path from 'path';
import { logger } from './logger.js';

export interface PackageInfo {
  name: string;
  version: string;
  license?: string;
  author?: string | { name?: string; email?: string };
  repository?: string | { type?: string; url?: string };
  homepage?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface DependencyInfo {
  name: string;
  version: string;
  license?: string;
  copyright?: string;
  author?: string;
  repository?: string;
  homepage?: string;
}

export async function parsePackageJson(packagePath: string): Promise<PackageInfo | null> {
  try {
    const content = await fs.readFile(packagePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    logger.error(`Failed to read package.json at ${packagePath}: ${error}`);
    return null;
  }
}

export async function getDependencies(
  packagePath: string,
  includeDev = false,
): Promise<Map<string, string>> {
  const pkg = await parsePackageJson(packagePath);
  if (!pkg) {
    return new Map();
  }

  const deps = new Map<string, string>();

  // Add dependencies
  if (pkg['dependencies']) {
    for (const [name, version] of Object.entries(pkg['dependencies'])) {
      deps.set(name, version as string);
    }
  }

  // Add devDependencies if requested
  if (includeDev && pkg['devDependencies']) {
    for (const [name, version] of Object.entries(pkg['devDependencies'])) {
      deps.set(name, version as string);
    }
  }

  return deps;
}

export async function getPackageInfo(
  packageName: string,
  projectRoot: string,
): Promise<DependencyInfo | null> {
  const packageJsonPath = path.join(projectRoot, 'node_modules', packageName, 'package.json');

  try {
    const pkg = await parsePackageJson(packageJsonPath);
    if (!pkg) {
      return null;
    }

    // Extract author information
    let author = '';
    if (typeof pkg.author === 'string') {
      author = pkg.author;
    } else if (pkg.author && typeof pkg.author === 'object') {
      author = pkg.author.name || '';
    }

    // Extract repository URL
    let repository = '';
    if (typeof pkg.repository === 'string') {
      repository = pkg.repository;
    } else if (pkg.repository && typeof pkg.repository === 'object') {
      repository = pkg.repository.url || '';
    }

    // Try to extract copyright from LICENSE file
    const copyright = await extractCopyright(path.dirname(packageJsonPath));

    return {
      name: pkg.name || packageName,
      version: pkg.version || 'unknown',
      license: pkg.license || 'Unknown',
      copyright,
      author,
      repository,
      homepage: pkg.homepage,
    };
  } catch (error) {
    logger.warn(`Could not read package info for ${packageName}: ${error}`);
    return null;
  }
}

async function extractCopyright(packageDir: string): Promise<string | undefined> {
  const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'];

  for (const filename of licenseFiles) {
    const licensePath = path.join(packageDir, filename);
    try {
      const content = await fs.readFile(licensePath, 'utf-8');

      // Look for copyright lines
      const lines = content.split('\n');
      const copyrightLines = lines
        .filter((line) => /copyright/i.test(line))
        .map((line) => line.trim())
        .slice(0, 3); // Take first 3 copyright lines

      if (copyrightLines.length > 0) {
        return copyrightLines.join('\n');
      }
    } catch {
      // File doesn't exist, try next
      continue;
    }
  }

  return undefined;
}

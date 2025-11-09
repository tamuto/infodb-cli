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

  // Patterns that indicate the actual license text has started (not copyright header)
  const licenseTextPatterns = [
    /permission is hereby granted/i,
    /the software is provided/i,
    /redistribution and use/i,
    /licensed under/i,
    /apache license/i,
    /gnu (general public|lesser general|affero general) public license/i,
    /this (software|program|library) is free software/i,
    /terms and conditions/i,
  ];

  // More strict copyright pattern:
  // - Must contain "copyright", "©", or "(c)" (case-insensitive)
  // - Should typically have a year (4-digit number)
  const isCopyrightLine = (line: string): boolean => {
    const lowerLine = line.toLowerCase();
    const hasKeyword = /copyright|©|\(c\)/i.test(line);
    const hasYear = /\b(19|20)\d{2}\b/.test(line);
    
    // A valid copyright line should have both keyword and year
    // OR just the keyword if it's at the very beginning of the file
    return hasKeyword && (hasYear || lowerLine.startsWith('copyright'));
  };

  const isLicenseTextStart = (line: string): boolean => {
    return licenseTextPatterns.some(pattern => pattern.test(line));
  };

  for (const filename of licenseFiles) {
    const licensePath = path.join(packageDir, filename);
    try {
      const content = await fs.readFile(licensePath, 'utf-8');
      const lines = content.split('\n');

      const copyrightLines: string[] = [];
      const maxLinesToCheck = 50; // Only check first 50 lines

      for (let i = 0; i < Math.min(lines.length, maxLinesToCheck); i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Stop if we hit the actual license text
        if (isLicenseTextStart(trimmedLine)) {
          break;
        }

        // Add copyright lines
        if (isCopyrightLine(trimmedLine)) {
          copyrightLines.push(trimmedLine);
        } else if (copyrightLines.length > 0 && trimmedLine.length === 0) {
          // Allow empty lines within copyright block
          continue;
        } else if (copyrightLines.length > 0 && trimmedLine.length > 0) {
          // If we've found copyright lines and hit a non-empty, non-copyright line
          // that's not the license text, check if it might be a continuation
          // (e.g., author name on next line)
          const prevLine = lines[i - 1]?.trim() || '';
          if (isCopyrightLine(prevLine) && trimmedLine.length < 100) {
            // Likely a continuation (author name, etc.)
            copyrightLines.push(trimmedLine);
          } else {
            // End of copyright block
            break;
          }
        }
      }

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

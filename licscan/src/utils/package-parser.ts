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
  licenseText?: string;
  author?: string;
  repository?: string;
  homepage?: string;
  requiredBy?: string[]; // Direct parent packages that depend on this
  dependencyPaths?: string[][]; // Paths from root to this package
}

export interface DependencyGraph {
  packages: Map<string, string>; // name -> version
  requiredBy: Map<string, Set<string>>; // package -> set of packages that require it
  dependencies: Map<string, Set<string>>; // package -> set of its dependencies
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

/**
 * Detect package manager (npm, pnpm, yarn)
 */
async function detectPackageManager(projectRoot: string): Promise<'npm' | 'pnpm' | 'yarn'> {
  try {
    // Check for lock files
    if (await fileExists(path.join(projectRoot, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (await fileExists(path.join(projectRoot, 'yarn.lock'))) {
      return 'yarn';
    }
    // Default to npm
    return 'npm';
  } catch {
    return 'npm';
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Cache for pnpm package paths
const pnpmPathCache = new Map<string, string>();

// Cache for package list result to avoid running the same command twice
let cachedListResult: any = null;
let cachedProjectRoot: string | null = null;

/**
 * Get all installed npm packages (recursive dependencies included)
 */
export async function getAllInstalledPackages(
  projectRoot: string,
): Promise<Map<string, string>> {
  // Clear pnpm cache and list result cache if project root changed
  if (cachedProjectRoot !== projectRoot) {
    pnpmPathCache.clear();
    cachedListResult = null;
    cachedProjectRoot = projectRoot;
  }

  // Detect package manager
  const packageManager = await detectPackageManager(projectRoot);
  logger.info(`Detected package manager: ${packageManager}`);

  // Use package manager list command to get dependency graph information
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    let command: string;
    if (packageManager === 'pnpm') {
      command = 'pnpm list --json --depth=999 --prod';
    } else if (packageManager === 'yarn') {
      command = 'yarn list --json --depth=999';
    } else {
      command = 'npm list --json --all --depth=999';
    }

    // Use package manager list command to get all installed packages
    const { stdout } = await execAsync(command, {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 100, // 100MB buffer for large dependency trees
    });

    const result = JSON.parse(stdout);
    // Cache the result for buildDependencyGraph to reuse
    cachedListResult = result;
    const deps = new Map<string, string>();

    // Recursively extract dependencies from list output
    function extractDeps(obj: any) {
      if (obj.dependencies) {
        for (const [name, info] of Object.entries(obj.dependencies)) {
          const depInfo = info as any;
          if (depInfo.version) {
            deps.set(name, depInfo.version);
            // For pnpm: cache the actual path
            if (depInfo.path) {
              pnpmPathCache.set(name, depInfo.path);
            }
          }
          // Recurse into nested dependencies
          if (depInfo.dependencies) {
            extractDeps(depInfo);
          }
        }
      }
    }

    extractDeps(result);

    // If no dependencies found, might be different format (pnpm)
    if (deps.size === 0 && Array.isArray(result)) {
      // pnpm format is an array
      for (const pkg of result) {
        if (pkg.name && pkg.version) {
          deps.set(pkg.name, pkg.version);
          if (pkg.path) {
            pnpmPathCache.set(pkg.name, pkg.path);
          }
        }
        // Also check dependencies
        if (pkg.dependencies) {
          extractDeps(pkg);
        }
      }
    }

    return deps;
  } catch (error) {
    logger.warn(`Could not get installed packages via package manager: ${error}`);
    // Fallback: try to read from node_modules
    return await getAllPackagesFromNodeModules(projectRoot);
  }
}

/**
 * Fallback: Scan node_modules directory for packages
 */
async function getAllPackagesFromNodeModules(
  projectRoot: string,
): Promise<Map<string, string>> {
  const deps = new Map<string, string>();
  const nodeModulesPath = path.join(projectRoot, 'node_modules');

  try {
    // First, try to scan regular node_modules
    await scanNodeModulesDirectory(nodeModulesPath, deps);

    // For pnpm: also scan .pnpm directory
    const pnpmPath = path.join(nodeModulesPath, '.pnpm');
    if (await fileExists(pnpmPath)) {
      await scanPnpmDirectory(pnpmPath, deps);
    }
  } catch (error) {
    logger.warn(`Could not scan node_modules: ${error}`);
  }

  return deps;
}

/**
 * Scan regular node_modules directory
 */
async function scanNodeModulesDirectory(
  nodeModulesPath: string,
  deps: Map<string, string>,
): Promise<void> {
  try {
    const entries = await fs.readdir(nodeModulesPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        // Handle scoped packages (@org/package)
        if (entry.name.startsWith('@')) {
          const scopedPath = path.join(nodeModulesPath, entry.name);
          const scopedEntries = await fs.readdir(scopedPath, { withFileTypes: true });
          for (const scopedEntry of scopedEntries) {
            if (scopedEntry.isDirectory()) {
              const packageName = `${entry.name}/${scopedEntry.name}`;
              const version = await getPackageVersion(
                path.join(scopedPath, scopedEntry.name),
              );
              if (version) {
                deps.set(packageName, version);
              }
            }
          }
        } else {
          // Regular package
          const version = await getPackageVersion(
            path.join(nodeModulesPath, entry.name),
          );
          if (version) {
            deps.set(entry.name, version);
          }
        }
      }
    }
  } catch (error) {
    // Ignore errors for individual directory scans
  }
}

/**
 * Scan pnpm .pnpm directory
 */
async function scanPnpmDirectory(
  pnpmPath: string,
  deps: Map<string, string>,
): Promise<void> {
  try {
    const entries = await fs.readdir(pnpmPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // pnpm format: package@version or @scope+package@version_peer-deps
        // Extract package name and version from directory name
        const dirName = entry.name;

        // For scoped packages: @scope+package@version_... -> @scope/package
        // For regular packages: package@version -> package
        let packageName: string;
        let versionPart: string;

        if (dirName.startsWith('@')) {
          // Scoped package: @scope+package@version...
          const match = dirName.match(/^(@[^+]+)\+([^@]+)@(.+)$/);
          if (match) {
            const [, scope, name, version] = match;
            packageName = `${scope}/${name}`;
            versionPart = version.split('_')[0]; // Remove peer dependency info
          } else {
            continue;
          }
        } else {
          // Regular package: package@version
          const match = dirName.match(/^([^@]+)@(.+)$/);
          if (match) {
            const [, name, version] = match;
            packageName = name;
            versionPart = version;
          } else {
            continue;
          }
        }

        // Cache the path for this package
        const packagePath = path.join(pnpmPath, entry.name, 'node_modules', packageName);
        pnpmPathCache.set(packageName, packagePath);

        // Get version from package.json
        const actualVersion = await getPackageVersion(packagePath);
        if (actualVersion) {
          deps.set(packageName, actualVersion);
        }
      }
    }
  } catch (error) {
    // Ignore errors for pnpm directory scan
  }
}

/**
 * Get version from package.json in a package directory
 */
async function getPackageVersion(packageDir: string): Promise<string | null> {
  try {
    const pkg = await parsePackageJson(path.join(packageDir, 'package.json'));
    return pkg?.version || null;
  } catch {
    return null;
  }
}

/**
 * Find package in pnpm .pnpm directory
 */
async function findPackageInPnpm(
  projectRoot: string,
  packageName: string,
): Promise<string | null> {
  try {
    const pnpmDir = path.join(projectRoot, 'node_modules', '.pnpm');
    if (!(await fileExists(pnpmDir))) {
      return null;
    }

    const entries = await fs.readdir(pnpmDir, { withFileTypes: true });

    // Look for package@version directories
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // pnpm format: package@version/node_modules/package
        // or for scoped packages: @scope+package@version/node_modules/@scope/package
        const packageJsonPath = path.join(
          pnpmDir,
          entry.name,
          'node_modules',
          packageName,
          'package.json',
        );

        if (await fileExists(packageJsonPath)) {
          return packageJsonPath;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function getPackageInfo(
  packageName: string,
  projectRoot: string,
): Promise<DependencyInfo | null> {
  let packageJsonPath: string;

  try {
    // First, check if we have cached path from pnpm list
    if (pnpmPathCache.has(packageName)) {
      const cachedPath = pnpmPathCache.get(packageName)!;
      packageJsonPath = path.join(cachedPath, 'package.json');
    } else {
      // Default path
      packageJsonPath = path.join(projectRoot, 'node_modules', packageName, 'package.json');

      // Check if file exists first
      if (await fileExists(packageJsonPath)) {
        // For pnpm: resolve symlink to actual file location
        try {
          const realPath = await fs.realpath(packageJsonPath);
          packageJsonPath = realPath;
        } catch {
          // If realpath fails, continue with original path
        }
      } else {
        // File doesn't exist in node_modules/package-name/
        // For pnpm: try to find in .pnpm directory
        const pnpmPackagePath = await findPackageInPnpm(projectRoot, packageName);
        if (pnpmPackagePath) {
          packageJsonPath = pnpmPackagePath;
        } else {
          // Package not found
          return null;
        }
      }
    }

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
    const packageDir = path.dirname(packageJsonPath);
    const copyright = await extractCopyright(packageDir);
    const licenseText = await getLicenseText(packageDir);

    return {
      name: pkg.name || packageName,
      version: pkg.version || 'unknown',
      license: pkg.license || 'Unknown',
      copyright,
      licenseText,
      author,
      repository,
      homepage: pkg.homepage,
    };
  } catch (error) {
    logger.warn(`Could not read package info for ${packageName}: ${error}`);
    return null;
  }
}

async function getLicenseText(packageDir: string): Promise<string | undefined> {
  const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'];

  for (const filename of licenseFiles) {
    const licensePath = path.join(packageDir, filename);
    try {
      const content = await fs.readFile(licensePath, 'utf-8');
      return content;
    } catch {
      // File doesn't exist, try next
      continue;
    }
  }

  return undefined;
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

/**
 * Build dependency graph from npm/pnpm/yarn list output
 */
export async function buildDependencyGraph(
  projectRoot: string,
): Promise<DependencyGraph> {
  const graph: DependencyGraph = {
    packages: new Map(),
    requiredBy: new Map(),
    dependencies: new Map(),
  };

  try {
    let result: any;

    // Use cached result if available (from getAllInstalledPackages)
    if (cachedListResult && cachedProjectRoot === projectRoot) {
      result = cachedListResult;
      logger.info('Using cached dependency list for graph construction');
    } else {
      // Fallback: run command again (shouldn't normally happen)
      logger.info('Fetching dependency list for graph construction...');
      const packageManager = await detectPackageManager(projectRoot);
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      let command: string;
      if (packageManager === 'pnpm') {
        command = 'pnpm list --json --depth=999 --prod';
      } else if (packageManager === 'yarn') {
        command = 'yarn list --json --depth=999';
      } else {
        command = 'npm list --json --all --depth=999';
      }

      const { stdout } = await execAsync(command, {
        cwd: projectRoot,
        maxBuffer: 1024 * 1024 * 100, // 100MB buffer for large dependency trees
      });

      result = JSON.parse(stdout);
      cachedListResult = result;
    }

    // Get root package name
    const rootPkg = await parsePackageJson(path.join(projectRoot, 'package.json'));
    const rootName = rootPkg?.name || 'root';

    // Recursively build graph
    function buildGraph(obj: any, parentName: string = rootName) {
      if (obj.dependencies) {
        for (const [name, info] of Object.entries(obj.dependencies)) {
          const depInfo = info as any;
          if (depInfo.version) {
            // Add package
            graph.packages.set(name, depInfo.version);

            // Track who requires this package
            if (!graph.requiredBy.has(name)) {
              graph.requiredBy.set(name, new Set());
            }
            graph.requiredBy.get(name)!.add(parentName);

            // Track dependencies of parent
            if (!graph.dependencies.has(parentName)) {
              graph.dependencies.set(parentName, new Set());
            }
            graph.dependencies.get(parentName)!.add(name);

            // Recurse
            if (depInfo.dependencies) {
              buildGraph(depInfo, name);
            }
          }
        }
      }
    }

    buildGraph(result, rootName);

    // Handle pnpm array format
    if (graph.packages.size === 0 && Array.isArray(result)) {
      for (const pkg of result) {
        if (pkg.name && pkg.version) {
          graph.packages.set(pkg.name, pkg.version);
          // For pnpm, we need to parse dependencies differently
          if (pkg.dependencies) {
            buildGraph(pkg, rootName);
          }
        }
      }
    }
  } catch (error) {
    logger.warn(`Could not build dependency graph: ${error}`);
  }

  return graph;
}

/**
 * Find all paths from root to a given package in the dependency graph
 */
function findDependencyPaths(
  targetPackage: string,
  graph: DependencyGraph,
  rootName: string,
): string[][] {
  const paths: string[][] = [];
  const visited = new Set<string>();

  function dfs(currentPackage: string, currentPath: string[]) {
    if (currentPackage === targetPackage) {
      paths.push([...currentPath, currentPackage]);
      return;
    }

    if (visited.has(currentPackage)) {
      return; // Avoid cycles
    }

    visited.add(currentPackage);

    const deps = graph.dependencies.get(currentPackage);
    if (deps) {
      for (const dep of deps) {
        dfs(dep, [...currentPath, currentPackage]);
      }
    }

    visited.delete(currentPackage);
  }

  dfs(rootName, []);
  return paths;
}

/**
 * Get package info with dependency information
 */
export async function getPackageInfoWithDependencies(
  packageName: string,
  projectRoot: string,
  graph: DependencyGraph,
): Promise<DependencyInfo | null> {
  const baseInfo = await getPackageInfo(packageName, projectRoot);
  if (!baseInfo) {
    return null;
  }

  // Add dependency information
  const requiredBy = Array.from(graph.requiredBy.get(packageName) || []);

  // Get root package name
  const rootPkg = await parsePackageJson(path.join(projectRoot, 'package.json'));
  const rootName = rootPkg?.name || 'root';

  const dependencyPaths = findDependencyPaths(packageName, graph, rootName);

  return {
    ...baseInfo,
    requiredBy: requiredBy.length > 0 ? requiredBy : undefined,
    dependencyPaths: dependencyPaths.length > 0 ? dependencyPaths : undefined,
  };
}

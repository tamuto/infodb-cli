import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseToml } from 'smol-toml';
import { logger } from './logger.js';

export interface PyProjectInfo {
  name?: string;
  version?: string;
  dependencies?: string[];
  devDependencies?: string[];
}

export interface PythonPackageInfo {
  name: string;
  version: string;
  license?: string;
  copyright?: string;
  licenseText?: string;
  author?: string;
  homepage?: string;
  requiredBy?: string[];
  dependencyPaths?: string[][];
}

export interface PythonDependencyGraph {
  packages: Map<string, string>; // name -> version
  requiredBy: Map<string, Set<string>>; // name -> Set of packages that require it
  dependencies: Map<string, Set<string>>; // name -> Set of dependencies
}

type PythonEnvironment = 'venv' | 'poetry' | 'uv' | 'system';

interface EnvironmentInfo {
  type: PythonEnvironment;
  projectRoot?: string;
}

// Cache for environment detection
const envCache = new Map<string, EnvironmentInfo>();

export async function parsePyProjectToml(tomlPath: string): Promise<PyProjectInfo | null> {
  try {
    const content = await fs.readFile(tomlPath, 'utf-8');
    const data = parseToml(content) as any;

    const info: PyProjectInfo = {};

    // Poetry style
    if (data.tool?.poetry) {
      const poetry = data.tool.poetry;
      info.name = poetry.name;
      info.version = poetry.version;
      info.dependencies = poetry.dependencies ? Object.keys(poetry.dependencies) : [];
      info.devDependencies = poetry['dev-dependencies']
        ? Object.keys(poetry['dev-dependencies'])
        : [];
    }
    // PEP 621 style (modern Python packaging)
    else if (data.project) {
      const project = data.project;
      info.name = project.name;
      info.version = project.version;
      info.dependencies = project.dependencies || [];
      info.devDependencies = project['optional-dependencies']?.dev || [];
    }

    return info;
  } catch (error) {
    logger.error(`Failed to read pyproject.toml at ${tomlPath}: ${error}`);
    return null;
  }
}

/**
 * Detect the Python environment type for the given project
 */
async function detectPythonEnvironment(projectRoot: string): Promise<EnvironmentInfo> {
  // Check cache first
  if (envCache.has(projectRoot)) {
    return envCache.get(projectRoot)!;
  }

  let envInfo: EnvironmentInfo;

  // Check for uv.lock (uv project)
  const uvLockPath = path.join(projectRoot, 'uv.lock');
  if (await fileExists(uvLockPath)) {
    logger.info('Detected uv environment (uv.lock found)');
    envInfo = { type: 'uv', projectRoot };
    envCache.set(projectRoot, envInfo);
    return envInfo;
  }

  // Check for poetry.lock (poetry project)
  const poetryLockPath = path.join(projectRoot, 'poetry.lock');
  if (await fileExists(poetryLockPath)) {
    logger.info('Detected poetry environment (poetry.lock found)');
    envInfo = { type: 'poetry', projectRoot };
    envCache.set(projectRoot, envInfo);
    return envInfo;
  }

  // Check for VIRTUAL_ENV environment variable (venv)
  if (process.env.VIRTUAL_ENV) {
    logger.info(`Detected venv environment (VIRTUAL_ENV=${process.env.VIRTUAL_ENV})`);
    envInfo = { type: 'venv', projectRoot };
    envCache.set(projectRoot, envInfo);
    return envInfo;
  }

  // Check for common venv directories
  const venvDirs = ['venv', '.venv', 'env', '.env'];
  for (const dir of venvDirs) {
    const venvPath = path.join(projectRoot, dir);
    const venvBinPath = path.join(venvPath, 'bin', 'python');
    const venvScriptsPath = path.join(venvPath, 'Scripts', 'python.exe'); // Windows
    if ((await fileExists(venvBinPath)) || (await fileExists(venvScriptsPath))) {
      logger.info(`Detected venv environment (${dir} directory found)`);
      envInfo = { type: 'venv', projectRoot };
      envCache.set(projectRoot, envInfo);
      return envInfo;
    }
  }

  // Default to system Python
  logger.info('Using system Python (no virtual environment detected)');
  envInfo = { type: 'system', projectRoot };
  envCache.set(projectRoot, envInfo);
  return envInfo;
}

/**
 * Build the appropriate command prefix for the detected environment
 */
function buildCommandPrefix(env: EnvironmentInfo): string {
  switch (env.type) {
    case 'uv':
      return 'uv run';
    case 'poetry':
      return 'poetry run';
    case 'venv':
      // For venv, we'll use the system pip but it should pick up the venv if VIRTUAL_ENV is set
      // or we can explicitly use the venv's pip
      if (process.env.VIRTUAL_ENV) {
        return ''; // VIRTUAL_ENV is set, commands will use it automatically
      }
      return ''; // Will use system commands
    case 'system':
    default:
      return '';
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

export async function getDependencies(
  tomlPath: string,
  includeDev = false,
): Promise<Map<string, string>> {
  const info = await parsePyProjectToml(tomlPath);
  if (!info) {
    return new Map();
  }

  const deps = new Map<string, string>();

  // Parse dependencies
  if (info.dependencies) {
    for (const dep of info.dependencies) {
      // Skip python itself
      if (dep.toLowerCase() === 'python') continue;

      // Parse package name and version from strings like "requests>=2.28.0"
      const match = dep.match(/^([a-zA-Z0-9-_.]+)(.*)$/);
      if (match) {
        const name = match[1];
        const version = match[2] || '';
        deps.set(name, version);
      }
    }
  }

  // Add dev dependencies if requested
  if (includeDev && info.devDependencies) {
    for (const dep of info.devDependencies) {
      const match = dep.match(/^([a-zA-Z0-9-_.]+)(.*)$/);
      if (match) {
        const name = match[1];
        const version = match[2] || '';
        deps.set(name, version);
      }
    }
  }

  return deps;
}

/**
 * Get all installed Python packages (recursive dependencies included)
 */
export async function getAllInstalledPackages(
  projectRoot: string,
): Promise<Map<string, string>> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Detect the Python environment
    const env = await detectPythonEnvironment(projectRoot);
    const cmdPrefix = buildCommandPrefix(env);

    // Use pip list to get all installed packages
    const pipCommand = cmdPrefix
      ? `${cmdPrefix} pip list --format=json`
      : `pip list --format=json`;

    const { stdout } = await execAsync(pipCommand, { cwd: projectRoot });
    const packages = JSON.parse(stdout) as Array<{ name: string; version: string }>;

    const deps = new Map<string, string>();
    for (const pkg of packages) {
      deps.set(pkg.name, pkg.version);
    }

    return deps;
  } catch (error) {
    logger.warn(`Could not get installed Python packages: ${error}`);
    return new Map();
  }
}

/**
 * Build Python dependency graph using pip show
 */
export async function buildPythonDependencyGraph(
  projectRoot: string,
): Promise<PythonDependencyGraph> {
  const graph: PythonDependencyGraph = {
    packages: new Map(),
    requiredBy: new Map(),
    dependencies: new Map(),
  };

  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Detect the Python environment
    const env = await detectPythonEnvironment(projectRoot);
    const cmdPrefix = buildCommandPrefix(env);

    // Get all installed packages
    const pipListCommand = cmdPrefix
      ? `${cmdPrefix} pip list --format=json`
      : `pip list --format=json`;

    const { stdout: listOutput } = await execAsync(pipListCommand, { cwd: projectRoot });
    const packages = JSON.parse(listOutput) as Array<{ name: string; version: string }>;

    if (packages.length === 0) {
      return graph;
    }

    // Get package names
    const packageNames = packages.map(p => p.name);

    // Use pip show to get dependency information for all packages at once
    const pipShowCommand = cmdPrefix
      ? `${cmdPrefix} pip show ${packageNames.join(' ')}`
      : `pip show ${packageNames.join(' ')}`;

    const { stdout: showOutput } = await execAsync(pipShowCommand, { 
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 50, // 50MB buffer
    });

    // Parse pip show output (it's not JSON, but text format)
    // Format:
    // Name: package-name
    // Version: x.y.z
    // Requires: dep1, dep2, dep3
    // Required-by: parent1, parent2
    // ---
    const packageBlocks = showOutput.split('---\n').filter(block => block.trim());

    for (const block of packageBlocks) {
      const lines = block.split('\n');
      let name = '';
      let version = '';
      const requires: string[] = [];
      const requiredBy: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('Name:')) {
          name = trimmed.substring(5).trim();
        } else if (trimmed.startsWith('Version:')) {
          version = trimmed.substring(8).trim();
        } else if (trimmed.startsWith('Requires:')) {
          const reqStr = trimmed.substring(9).trim();
          if (reqStr) {
            requires.push(...reqStr.split(',').map(s => s.trim()).filter(s => s));
          }
        } else if (trimmed.startsWith('Required-by:')) {
          const reqByStr = trimmed.substring(12).trim();
          if (reqByStr) {
            requiredBy.push(...reqByStr.split(',').map(s => s.trim()).filter(s => s));
          }
        }
      }

      if (name && version) {
        // Add package
        graph.packages.set(name, version);

        // Track dependencies
        if (requires.length > 0) {
          graph.dependencies.set(name, new Set(requires));
        }

        // Track who requires this package
        if (!graph.requiredBy.has(name)) {
          graph.requiredBy.set(name, new Set());
        }
        for (const parent of requiredBy) {
          graph.requiredBy.get(name)!.add(parent);
        }
      }
    }

    // Add direct dependencies from pyproject.toml to the graph
    // This ensures root project's dependencies are tracked even if project isn't installed
    const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
    const pyprojectInfo = await parsePyProjectToml(pyprojectPath);
    
    if (pyprojectInfo) {
      const rootName = pyprojectInfo.name || 'root';
      
      // Get direct dependencies from pyproject.toml
      const directDeps: string[] = [];
      if (pyprojectInfo.dependencies) {
        for (const dep of pyprojectInfo.dependencies) {
          // Skip python itself
          if (dep.toLowerCase() === 'python') continue;
          
          // Parse package name from strings like "requests>=2.28.0"
          const match = dep.match(/^([a-zA-Z0-9-_.]+)(.*)$/);
          if (match) {
            directDeps.push(match[1]);
          }
        }
      }
      
      // Add root's dependencies to graph
      if (directDeps.length > 0) {
        graph.dependencies.set(rootName, new Set(directDeps));
        
        // Update requiredBy for each direct dependency
        for (const dep of directDeps) {
          // Normalize package name (handle _ vs -)
          const normalizedDep = dep.toLowerCase().replace(/_/g, '-');
          
          // Find the actual package name in the graph (case-insensitive, handle _ vs -)
          let actualPackageName = dep;
          for (const pkgName of graph.packages.keys()) {
            const normalizedPkg = pkgName.toLowerCase().replace(/_/g, '-');
            if (normalizedPkg === normalizedDep) {
              actualPackageName = pkgName;
              break;
            }
          }
          
          if (!graph.requiredBy.has(actualPackageName)) {
            graph.requiredBy.set(actualPackageName, new Set());
          }
          graph.requiredBy.get(actualPackageName)!.add(rootName);
        }
      }
    }

    logger.info(`Built Python dependency graph with ${graph.packages.size} packages`);
  } catch (error) {
    logger.warn(`Could not build Python dependency graph: ${error}`);
  }

  return graph;
}

/**
 * Find all dependency paths from root to target package
 */
function findPythonDependencyPaths(
  targetPackage: string,
  graph: PythonDependencyGraph,
  rootName: string,
): string[][] {
  const paths: string[][] = [];
  const visited = new Set<string>();

  function dfs(currentPackage: string, currentPath: string[]) {
    // Normalize package name for comparison (case-insensitive, handle _ vs -)
    const normalizedCurrent = currentPackage.toLowerCase().replace(/_/g, '-');
    const normalizedTarget = targetPackage.toLowerCase().replace(/_/g, '-');

    if (normalizedCurrent === normalizedTarget) {
      paths.push([...currentPath, currentPackage]);
      return;
    }

    if (visited.has(normalizedCurrent)) {
      return; // Avoid cycles
    }

    visited.add(normalizedCurrent);

    const deps = graph.dependencies.get(currentPackage);
    if (deps) {
      for (const dep of deps) {
        dfs(dep, [...currentPath, currentPackage]);
      }
    }

    visited.delete(normalizedCurrent);
  }

  dfs(rootName, []);
  return paths;
}

/**
 * Get Python package info with dependency information
 */
export async function getPythonPackageInfoWithDependencies(
  packageName: string,
  projectRoot: string,
  graph: PythonDependencyGraph,
): Promise<PythonPackageInfo | null> {
  const baseInfo = await getPythonPackageInfo(packageName, projectRoot);
  if (!baseInfo) {
    return null;
  }

  // Add dependency information
  const requiredBy = Array.from(graph.requiredBy.get(packageName) || []);

  // Get root package name from pyproject.toml
  const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
  const pyprojectInfo = await parsePyProjectToml(pyprojectPath);
  const rootName = pyprojectInfo?.name || 'root';

  const dependencyPaths = findPythonDependencyPaths(packageName, graph, rootName);

  return {
    ...baseInfo,
    requiredBy: requiredBy.length > 0 ? requiredBy : undefined,
    dependencyPaths: dependencyPaths.length > 0 ? dependencyPaths : undefined,
  };
}

export async function getPythonPackageInfo(
  packageName: string,
  projectRoot: string,
): Promise<PythonPackageInfo | null> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const os = await import('os');

    // Detect the Python environment
    const env = await detectPythonEnvironment(projectRoot);
    const cmdPrefix = buildCommandPrefix(env);

    // Python script to extract package metadata using importlib.metadata
    const pythonScript = `import importlib.metadata as metadata
import json
import sys

try:
    pkg_name = sys.argv[1]
    meta = metadata.metadata(pkg_name)
    
    license_info = None
    license_expr = meta.get('License-Expression')
    if license_expr and license_expr.strip():
        license_info = license_expr.strip()

    if not license_info:
        license_field = meta.get('License')
        # Only use License field if it's a single line (not full license text)
        if license_field and license_field.strip():
            license_text = license_field.strip()
            # Check if it's a short, single-line license identifier
            # Heuristic: if it contains newlines or is > 100 chars, it's likely full text
            if '\\n' not in license_text and len(license_text) <= 100:
                license_info = license_text

    if not license_info:
        classifiers = meta.get_all('Classifier') or []
        license_classifiers = [c for c in classifiers if c.startswith('License ::')]
        if license_classifiers:
            licenses = []
            for lc in license_classifiers:
                parts = lc.split('::')
                if len(parts) >= 3:
                    license_name = parts[-1].strip()
                    if license_name and license_name not in licenses:
                        licenses.append(license_name)
            if licenses:
                license_info = '; '.join(licenses)
    
    location = None
    try:
        dist = metadata.distribution(pkg_name)
        if hasattr(dist, '_path') and dist._path:
            location = str(dist._path.parent)
    except:
        pass
    
    result = {
        'name': meta.get('Name'),
        'version': meta.get('Version'),
        'license': license_info,
        'author': meta.get('Author'),
        'homepage': meta.get('Home-page'),
        'location': location
    }
    
    print(json.dumps(result))
except Exception as e:
    import traceback
    error_msg = f"{str(e)}\\n{traceback.format_exc()}"
    print(json.dumps({'error': error_msg}), file=sys.stderr)
    sys.exit(1)
`;

    // Create a temporary file for the Python script
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `licscan-${Date.now()}-${Math.random().toString(36).slice(2)}.py`);
    
    try {
      await fs.writeFile(tmpFile, pythonScript, 'utf-8');

      // Build the Python command with appropriate prefix
      const pythonCommand = cmdPrefix
        ? `${cmdPrefix} python3 ${tmpFile} ${JSON.stringify(packageName)}`
        : `python3 ${tmpFile} ${JSON.stringify(packageName)}`;

      // Execute command in the project root directory
      const { stdout, stderr } = await execAsync(pythonCommand, { cwd: projectRoot });

      // Check for errors
      if (stderr) {
        try {
          const errorData = JSON.parse(stderr);
          if (errorData.error) {
            throw new Error(errorData.error);
          }
        } catch {
          // Not JSON, might be warning - ignore
        }
      }

      // Parse JSON output
      const result = JSON.parse(stdout);
      
      if (result.error) {
        throw new Error(result.error);
      }

      const info: PythonPackageInfo = {
        name: result.name || packageName,
        version: result.version || 'unknown',
        license: result.license,
        author: result.author,
        homepage: result.homepage,
      };

      // Try to get copyright and license text from package metadata
      if (result.location && result.name && result.version) {
        info.copyright = await extractPythonCopyright(
          result.name,
          result.version,
          result.location,
        );
        info.licenseText = await getPythonLicenseText(
          result.name,
          result.version,
          result.location,
        );
      }

      return info;
    } finally {
      // Clean up temporary file
      try {
        await fs.unlink(tmpFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    logger.warn(`Could not read Python package info for ${packageName}: ${error}`);
    return null;
  }
}

async function getPythonLicenseText(
  packageRealName: string,
  version: string,
  location: string,
): Promise<string | undefined> {
  try {
    const lowerName = packageRealName.toLowerCase();
    const nameWithHyphens = lowerName.replace(/_/g, '-');
    const nameWithUnderscores = lowerName.replace(/-/g, '_');

    // Try to find LICENSE file in common locations
    const possiblePaths = [
      // .dist-info directory with licenses/ subdirectory (newer Python packaging standard)
      path.join(location, `${nameWithHyphens}-${version}.dist-info`, 'licenses', 'LICENSE'),
      path.join(location, `${nameWithHyphens}-${version}.dist-info`, 'licenses', 'LICENSE.txt'),
      path.join(location, `${nameWithUnderscores}-${version}.dist-info`, 'licenses', 'LICENSE'),
      path.join(location, `${nameWithUnderscores}-${version}.dist-info`, 'licenses', 'LICENSE.txt'),
      // .dist-info directory (most common for pip-installed packages)
      path.join(location, `${nameWithHyphens}-${version}.dist-info`, 'LICENSE'),
      path.join(location, `${nameWithHyphens}-${version}.dist-info`, 'LICENSE.txt'),
      path.join(location, `${nameWithHyphens}-${version}.dist-info`, 'COPYING'),
      path.join(location, `${nameWithUnderscores}-${version}.dist-info`, 'LICENSE'),
      path.join(location, `${nameWithUnderscores}-${version}.dist-info`, 'LICENSE.txt'),
      // Try with original case as well
      path.join(location, `${packageRealName}-${version}.dist-info`, 'licenses', 'LICENSE'),
      path.join(location, `${packageRealName}-${version}.dist-info`, 'LICENSE'),
      // Package directory itself
      path.join(location, nameWithUnderscores, 'LICENSE'),
      path.join(location, nameWithUnderscores, 'LICENSE.txt'),
      path.join(location, nameWithUnderscores, 'LICENSE.md'),
      path.join(location, nameWithUnderscores, 'COPYING'),
    ];

    for (const licensePath of possiblePaths) {
      try {
        const content = await fs.readFile(licensePath, 'utf-8');
        return content;
      } catch {
        // File doesn't exist, try next path
        continue;
      }
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

async function extractPythonCopyright(
  packageRealName: string,
  version: string,
  location: string,
): Promise<string | undefined> {
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

  try {
    const lowerName = packageRealName.toLowerCase();
    const nameWithHyphens = lowerName.replace(/_/g, '-');
    const nameWithUnderscores = lowerName.replace(/-/g, '_');

    // Try to find LICENSE file in common locations
    const possiblePaths = [
      // .dist-info directory with licenses/ subdirectory (newer Python packaging standard)
      // Try with hyphens
      path.join(location, `${nameWithHyphens}-${version}.dist-info`, 'licenses', 'LICENSE'),
      path.join(location, `${nameWithHyphens}-${version}.dist-info`, 'licenses', 'LICENSE.txt'),
      // Try with underscores
      path.join(location, `${nameWithUnderscores}-${version}.dist-info`, 'licenses', 'LICENSE'),
      path.join(location, `${nameWithUnderscores}-${version}.dist-info`, 'licenses', 'LICENSE.txt'),
      // .dist-info directory (most common for pip-installed packages)
      path.join(location, `${nameWithHyphens}-${version}.dist-info`, 'LICENSE'),
      path.join(location, `${nameWithHyphens}-${version}.dist-info`, 'LICENSE.txt'),
      path.join(location, `${nameWithHyphens}-${version}.dist-info`, 'COPYING'),
      path.join(location, `${nameWithUnderscores}-${version}.dist-info`, 'LICENSE'),
      path.join(location, `${nameWithUnderscores}-${version}.dist-info`, 'LICENSE.txt'),
      // Try with original case as well
      path.join(location, `${packageRealName}-${version}.dist-info`, 'licenses', 'LICENSE'),
      path.join(location, `${packageRealName}-${version}.dist-info`, 'LICENSE'),
      // Package directory itself
      path.join(location, nameWithUnderscores, 'LICENSE'),
      path.join(location, nameWithUnderscores, 'LICENSE.txt'),
      path.join(location, nameWithUnderscores, 'LICENSE.md'),
      path.join(location, nameWithUnderscores, 'COPYING'),
    ];

    for (const licensePath of possiblePaths) {
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
        // File doesn't exist, try next path
        continue;
      }
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

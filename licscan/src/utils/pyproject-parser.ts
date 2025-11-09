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
  author?: string;
  homepage?: string;
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

      // Try to get copyright from package metadata
      if (result.location && result.name && result.version) {
        info.copyright = await extractPythonCopyright(
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

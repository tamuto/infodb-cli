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
  // Check for uv.lock (uv project)
  const uvLockPath = path.join(projectRoot, 'uv.lock');
  if (await fileExists(uvLockPath)) {
    logger.info('Detected uv environment (uv.lock found)');
    return { type: 'uv', projectRoot };
  }

  // Check for poetry.lock (poetry project)
  const poetryLockPath = path.join(projectRoot, 'poetry.lock');
  if (await fileExists(poetryLockPath)) {
    logger.info('Detected poetry environment (poetry.lock found)');
    return { type: 'poetry', projectRoot };
  }

  // Check for VIRTUAL_ENV environment variable (venv)
  if (process.env.VIRTUAL_ENV) {
    logger.info(`Detected venv environment (VIRTUAL_ENV=${process.env.VIRTUAL_ENV})`);
    return { type: 'venv', projectRoot };
  }

  // Check for common venv directories
  const venvDirs = ['venv', '.venv', 'env', '.env'];
  for (const dir of venvDirs) {
    const venvPath = path.join(projectRoot, dir);
    const venvBinPath = path.join(venvPath, 'bin', 'python');
    const venvScriptsPath = path.join(venvPath, 'Scripts', 'python.exe'); // Windows
    if ((await fileExists(venvBinPath)) || (await fileExists(venvScriptsPath))) {
      logger.info(`Detected venv environment (${dir} directory found)`);
      return { type: 'venv', projectRoot };
    }
  }

  // Default to system Python
  logger.info('Using system Python (no virtual environment detected)');
  return { type: 'system', projectRoot };
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
        if license_field and license_field.strip():
            license_info = license_field.strip()
    
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

        // Smart filtering: extract consecutive copyright lines from the beginning
        const copyrightLines: string[] = [];
        let foundFirstCopyright = false;
        let consecutiveNonCopyrightLines = 0;
        const maxGap = 2; // Allow up to 2 non-copyright lines before stopping

        for (const line of lines) {
          const trimmedLine = line.trim();
          const isCopyrightLine = /copyright/i.test(line);

          if (isCopyrightLine) {
            foundFirstCopyright = true;
            consecutiveNonCopyrightLines = 0;
            copyrightLines.push(trimmedLine);
          } else if (foundFirstCopyright) {
            // Check if this is a meaningful line (not just empty or whitespace)
            if (trimmedLine.length > 0) {
              consecutiveNonCopyrightLines++;
              if (consecutiveNonCopyrightLines >= maxGap) {
                // Too many non-copyright lines, stop here
                break;
              }
            }
            // Empty lines don't count towards the gap, but we don't add them
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

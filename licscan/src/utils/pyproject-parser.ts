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

    // Detect the Python environment
    const env = await detectPythonEnvironment(projectRoot);
    const cmdPrefix = buildCommandPrefix(env);

    // Build the pip show command with appropriate prefix
    const pipShowCommand = cmdPrefix ? `${cmdPrefix} pip show ${packageName}` : `pip show ${packageName}`;

    // Execute command in the project root directory
    const { stdout } = await execAsync(pipShowCommand, { cwd: projectRoot });

    const info: PythonPackageInfo = {
      name: packageName,
      version: 'unknown',
    };

    let packageLocation = '';
    let packageRealName = '';

    // Parse pip show output
    const lines = stdout.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (key === 'Name') {
        packageRealName = value;
      } else if (key === 'Version') {
        info.version = value;
      } else if (key === 'License') {
        info.license = value;
      } else if (key === 'Author') {
        info.author = value;
      } else if (key === 'Home-page') {
        info.homepage = value;
      } else if (key === 'Location') {
        packageLocation = value;
      }
    }

    // Try to get copyright from package metadata
    if (packageLocation && packageRealName && info.version) {
      info.copyright = await extractPythonCopyright(
        packageRealName,
        info.version,
        packageLocation,
      );
    }

    return info;
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

        // Look for copyright lines
        const lines = content.split('\n');
        const copyrightLines = lines
          .filter((line) => /copyright/i.test(line))
          .map((line) => line.trim())
          .slice(0, 3);

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

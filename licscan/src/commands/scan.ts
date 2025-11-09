import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import * as packageParser from '../utils/package-parser.js';
import * as pyprojectParser from '../utils/pyproject-parser.js';

export interface ScanOptions {
  includeDev?: boolean;
  format?: 'text' | 'json' | 'csv';
  output?: string;
  npmOnly?: boolean;
  pythonOnly?: boolean;
}

export interface ScanResult {
  type: 'npm' | 'python';
  packages: Array<{
    name: string;
    version: string;
    license?: string;
    copyright?: string;
    author?: string;
    repository?: string;
    homepage?: string;
  }>;
}

export async function scanCommand(projectPath: string, options: ScanOptions = {}) {
  const absolutePath = path.resolve(projectPath);

  logger.info(`Scanning project at: ${absolutePath}`);

  // Validate conflicting options
  if (options.npmOnly && options.pythonOnly) {
    logger.error('Cannot specify both --npm-only and --python-only options');
    return;
  }

  const results: ScanResult[] = [];

  // Check for package.json (unless pythonOnly is specified)
  if (!options.pythonOnly) {
    const packageJsonPath = path.join(absolutePath, 'package.json');
    if (await fileExists(packageJsonPath)) {
      logger.info('Found package.json, scanning npm dependencies...');
      const npmResult = await scanNpmDependencies(absolutePath, options.includeDev || false);
      if (npmResult) {
        results.push(npmResult);
      }
    }
  }

  // Check for pyproject.toml (unless npmOnly is specified)
  if (!options.npmOnly) {
    const pyprojectPath = path.join(absolutePath, 'pyproject.toml');
    if (await fileExists(pyprojectPath)) {
      logger.info('Found pyproject.toml, scanning Python dependencies...');
      const pythonResult = await scanPythonDependencies(absolutePath, options.includeDev || false);
      if (pythonResult) {
        results.push(pythonResult);
      }
    }
  }

  if (results.length === 0) {
    logger.error('No package.json or pyproject.toml found in the specified directory');
    return;
  }

  // Output results
  await outputResults(results, options);

  logger.success('Scan completed!');
}

async function scanNpmDependencies(
  projectPath: string,
  includeDev: boolean,
): Promise<ScanResult | null> {
  // Use getAllInstalledPackages to get all dependencies recursively
  const deps = await packageParser.getAllInstalledPackages(projectPath);

  if (deps.size === 0) {
    logger.warn('No npm dependencies found');
    return null;
  }

  logger.info(`Found ${deps.size} npm dependencies (including nested)`);

  const packages: ScanResult['packages'] = [];

  for (const [name] of deps) {
    const info = await packageParser.getPackageInfo(name, projectPath);
    if (info) {
      packages.push(info);
    } else {
      // Add minimal info if package info couldn't be retrieved
      packages.push({
        name,
        version: 'unknown',
        license: 'Unknown',
      });
    }
  }

  return {
    type: 'npm',
    packages,
  };
}

async function scanPythonDependencies(
  projectPath: string,
  includeDev: boolean,
): Promise<ScanResult | null> {
  // Use getAllInstalledPackages to get all dependencies recursively
  const deps = await pyprojectParser.getAllInstalledPackages(projectPath);

  if (deps.size === 0) {
    logger.warn('No Python dependencies found');
    return null;
  }

  logger.info(`Found ${deps.size} Python dependencies (including nested)`);

  const packages: ScanResult['packages'] = [];

  for (const [name] of deps) {
    const info = await pyprojectParser.getPythonPackageInfo(name, projectPath);
    if (info) {
      packages.push(info);
    } else {
      // Add minimal info if package info couldn't be retrieved
      packages.push({
        name,
        version: 'unknown',
        license: 'Unknown',
      });
    }
  }

  return {
    type: 'python',
    packages,
  };
}

async function outputResults(results: ScanResult[], options: ScanOptions) {
  const format = options.format || 'text';

  let output = '';

  switch (format) {
    case 'json':
      output = formatJson(results);
      break;
    case 'csv':
      output = formatCsv(results);
      break;
    case 'text':
    default:
      output = formatText(results);
      break;
  }

  if (options.output) {
    await fs.writeFile(options.output, output, 'utf-8');
    logger.success(`Results written to: ${options.output}`);
  } else {
    console.log('\n' + output);
  }
}

function formatText(results: ScanResult[]): string {
  let output = '';

  for (const result of results) {
    output += `\n${'='.repeat(80)}\n`;
    output += `${result.type.toUpperCase()} PACKAGES (${result.packages.length})\n`;
    output += `${'='.repeat(80)}\n\n`;

    for (const pkg of result.packages) {
      output += `Package: ${pkg.name}@${pkg.version}\n`;
      output += `License: ${pkg.license || 'Unknown'}\n`;

      if (pkg.author) {
        output += `Author:  ${pkg.author}\n`;
      }

      if (pkg.homepage) {
        output += `Homepage: ${pkg.homepage}\n`;
      }

      if (pkg.repository) {
        output += `Repository: ${pkg.repository}\n`;
      }

      if (pkg.copyright) {
        output += `Copyright:\n`;
        const copyrightLines = pkg.copyright.split('\n');
        for (const line of copyrightLines) {
          output += `  ${line}\n`;
        }
      }

      output += `${'-'.repeat(80)}\n`;
    }
  }

  return output;
}

function formatJson(results: ScanResult[]): string {
  return JSON.stringify(results, null, 2);
}

function formatCsv(results: ScanResult[]): string {
  let csv = 'Type,Name,Version,License,Author,Homepage,Repository,Copyright\n';

  for (const result of results) {
    for (const pkg of result.packages) {
      const row = [
        result.type,
        pkg.name,
        pkg.version,
        pkg.license || '',
        pkg.author || '',
        pkg.homepage || '',
        pkg.repository || '',
        (pkg.copyright || '').replace(/\n/g, ' '),
      ];

      csv += row.map((field) => `"${field}"`).join(',') + '\n';
    }
  }

  return csv;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

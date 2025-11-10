import { promises as fs } from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { logger } from '../utils/logger.js';
import * as packageParser from '../utils/package-parser.js';
import * as pyprojectParser from '../utils/pyproject-parser.js';

export interface ScanOptions {
  includeDev?: boolean;
  format?: 'text' | 'json' | 'csv' | 'markdown';
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
    licenseText?: string;
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
    case 'markdown':
      output = await formatMarkdown(results);
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

      if (pkg.licenseText) {
        output += `License Text:\n`;
        output += `${'~'.repeat(80)}\n`;
        output += pkg.licenseText;
        if (!pkg.licenseText.endsWith('\n')) {
          output += '\n';
        }
        output += `${'~'.repeat(80)}\n`;
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
  let csv = 'Type,Name,Version,License,Author,Homepage,Repository,Copyright,LicenseText\n';

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
        (pkg.licenseText || '').replace(/\n/g, ' '),
      ];

      csv += row.map((field) => `"${field}"`).join(',') + '\n';
    }
  }

  return csv;
}

async function formatMarkdown(results: ScanResult[]): Promise<string> {
  // Register Handlebars helper for generating anchor links
  Handlebars.registerHelper('anchor', (name: string, version: string) => {
    // Create a URL-safe anchor from package name and version
    // Format: name@version, then convert to lowercase and replace non-alphanumeric chars with hyphens
    const fullName = `${name}@${version}`;
    return fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric sequences with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  });

  // Load template
  const templatePath = path.join(__dirname, '../templates/licenses.md.hbs');
  const templateSource = await fs.readFile(templatePath, 'utf-8');
  const template = Handlebars.compile(templateSource);

  // Separate npm and Python packages
  const npmPackages: any[] = [];
  const pythonPackages: any[] = [];

  for (const result of results) {
    if (result.type === 'npm') {
      npmPackages.push(...result.packages);
    } else if (result.type === 'python') {
      pythonPackages.push(...result.packages);
    }
  }

  // Sort packages alphabetically by name
  const sortPackages = (a: any, b: any) => a.name.localeCompare(b.name);
  npmPackages.sort(sortPackages);
  pythonPackages.sort(sortPackages);

  // Render template with data
  const output = template({
    npmPackages,
    pythonPackages,
  });

  return output;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

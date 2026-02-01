import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import * as esbuild from 'esbuild';
import { ConfigManager } from '../utils/config';
import { Logger } from '../utils/logger';

/**
 * Check if runtime is Node.js/TypeScript
 */
function isNodeRuntime(runtime: string): boolean {
  return runtime.startsWith('nodejs');
}

/**
 * Extract entry file name from handler (e.g., "index.handler" -> "index")
 */
function getEntryFileFromHandler(handler: string): string {
  const parts = handler.split('.');
  return parts[0];
}

export interface MakeZipOptions {
  verbose?: boolean;
}

export async function makeZipCommand(functionName: string, options: MakeZipOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);

  try {
    logger.info(`Creating deployment package for Lambda function: ${chalk.cyan(functionName)}`);

    // Load configuration
    const configManager = new ConfigManager(functionName, logger);
    const config = await configManager.loadConfig({});

    logger.verbose('Configuration loaded:', config);

    const functionsDir = config.functionsDirectory || 'functions';
    const vendorDir = path.join(functionsDir, 'vendor');
    const zipFileName = `${functionName}.zip`;

    // Remove existing vendor directory if it exists
    try {
      await fs.access(vendorDir);
      logger.verbose(`Removing existing vendor directory: ${vendorDir}`);
      await fs.rm(vendorDir, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, continue
    }

    // Remove existing ZIP file if it exists
    try {
      await fs.access(zipFileName);
      logger.verbose(`Removing existing ZIP file: ${zipFileName}`);
      await fs.unlink(zipFileName);
    } catch (error) {
      // File doesn't exist, continue
    }

    // Branch based on runtime
    if (isNodeRuntime(config.runtime)) {
      // Node.js/TypeScript Lambda
      logger.info(`Runtime: ${chalk.cyan(config.runtime)} (Node.js/TypeScript)`);

      const bundledFile = await installNodeDependencies(
        config.requirements || [],
        functionsDir,
        config.handler,
        logger
      );

      await createNodeDeploymentZip(bundledFile, functionsDir, config, zipFileName, logger);
    } else {
      // Python Lambda (existing behavior)
      logger.info(`Runtime: ${chalk.cyan(config.runtime)} (Python)`);

      // Install Python dependencies if requirements are specified
      if (config.requirements && config.requirements.length > 0) {
        logger.info('Installing Python dependencies...');
        await installPythonDependencies(config.requirements, vendorDir, logger);
      }

      // Create deployment ZIP
      await createDeploymentZip(functionsDir, config, zipFileName, logger);
    }

    logger.success(`✅ Deployment package created successfully: ${chalk.cyan(zipFileName)}`);

  } catch (error) {
    logger.error(`❌ Failed to create deployment package: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

async function installPythonDependencies(requirements: string[], vendorDir: string, logger: Logger): Promise<void> {
  // Create vendor directory
  await fs.mkdir(vendorDir, { recursive: true });

  // Install each requirement
  for (const requirement of requirements) {
    logger.verbose(`Installing: ${requirement}`);
    await runCommand('pip', [
      'install',
      '--target', vendorDir,
      '--upgrade',
      requirement
    ], logger);
  }

  logger.success('Dependencies installed successfully');
}

/**
 * Install Node.js dependencies and bundle with esbuild
 */
async function installNodeDependencies(
  requirements: string[],
  functionsDir: string,
  handler: string,
  logger: Logger
): Promise<string> {
  const tempDir = path.join(functionsDir, '.lctl_build');
  const entryFile = getEntryFileFromHandler(handler);

  // Find entry point file (.ts or .js)
  let entryPoint: string | null = null;
  for (const ext of ['.ts', '.js', '.mts', '.mjs']) {
    const candidate = path.join(functionsDir, `${entryFile}${ext}`);
    try {
      await fs.access(candidate);
      entryPoint = candidate;
      break;
    } catch {
      // File doesn't exist, try next extension
    }
  }

  if (!entryPoint) {
    throw new Error(`Entry point not found: ${entryFile}.ts or ${entryFile}.js in ${functionsDir}`);
  }

  logger.verbose(`Entry point found: ${entryPoint}`);

  // Clean up existing build directory
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Directory doesn't exist, continue
  }
  await fs.mkdir(tempDir, { recursive: true });

  // Generate temporary package.json if requirements exist
  if (requirements.length > 0) {
    const packageJson = {
      name: 'lambda-build-temp',
      version: '1.0.0',
      private: true,
      dependencies: Object.fromEntries(
        requirements.map(req => {
          // Parse requirement (e.g., "axios@1.0.0" or "axios")
          const match = req.match(/^(@?[^@]+)(?:@(.+))?$/);
          if (match) {
            return [match[1], match[2] || '*'];
          }
          return [req, '*'];
        })
      )
    };

    const packageJsonPath = path.join(tempDir, 'package.json');
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

    logger.info('Installing Node.js dependencies...');
    await runCommand('npm', ['install', '--prefix', tempDir], logger);
  }

  // Bundle with esbuild
  logger.info('Bundling with esbuild...');
  const outfile = path.join(tempDir, `${entryFile}.js`);

  const nodePaths = requirements.length > 0
    ? [path.join(tempDir, 'node_modules')]
    : [];

  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile,
    format: 'cjs',
    external: ['@aws-sdk/*'],
    minify: true,
    sourcemap: false,
    nodePaths,
  });

  logger.success('Bundle created successfully');

  return outfile;
}

/**
 * Create deployment ZIP for Node.js Lambda
 */
async function createNodeDeploymentZip(
  bundledFile: string,
  functionsDir: string,
  config: any,
  zipFileName: string,
  logger: Logger
): Promise<void> {
  logger.info('Creating ZIP package for Node.js Lambda...');

  const originalCwd = process.cwd();
  const tempDir = path.join(functionsDir, '.lctl_zip');

  try {
    // Clean up and create temp directory
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    await fs.mkdir(tempDir, { recursive: true });

    // Copy bundled file
    const bundledFileName = path.basename(bundledFile);
    await fs.copyFile(bundledFile, path.join(tempDir, bundledFileName));

    // Copy additional files if specified (excluding .ts/.js source files)
    if (config.files && config.files.length > 0) {
      for (const file of config.files) {
        // Skip TypeScript/JavaScript source files (already bundled)
        if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.mts') || file.endsWith('.mjs')) {
          continue;
        }

        const srcPath = path.join(functionsDir, file);
        const destPath = path.join(tempDir, file);

        try {
          const stat = await fs.stat(srcPath);
          if (stat.isDirectory()) {
            await runCommand('cp', ['-r', srcPath, destPath], logger);
          } else {
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.copyFile(srcPath, destPath);
          }
        } catch {
          logger.verbose(`Skipping non-existent file: ${file}`);
        }
      }
    }

    // Create ZIP
    process.chdir(tempDir);
    await runCommand('zip', ['-r', zipFileName, '.'], logger);

    // Move ZIP to project root
    await fs.rename(zipFileName, path.join(originalCwd, zipFileName));

  } finally {
    process.chdir(originalCwd);
    // Clean up temp directories
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(path.join(functionsDir, '.lctl_build'), { recursive: true, force: true }).catch(() => {});
  }
}

async function createDeploymentZip(functionsDir: string, config: any, zipFileName: string, logger: Logger): Promise<void> {
  logger.info('Creating ZIP package...');

  // Change to functions directory
  const originalCwd = process.cwd();
  process.chdir(functionsDir);

  try {
    // Create a temporary directory to build the final package
    const tempDir = 'temp_package';
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Copy user files to temp directory
      if (config.files && config.files.length > 0) {
        for (const file of config.files) {
          if (file.includes('*')) {
            // Handle glob patterns with find command
            await runCommand('sh', ['-c', `find . -path "${file}" -type f -exec cp --parents {} ${tempDir}/ \\;`], logger);
          } else {
            // Copy regular files/directories
            await runCommand('cp', ['-r', file, tempDir], logger);
          }
        }
      } else {
        // Copy all files except excludes
        const excludes = config.zip_excludes || ['*.git*', 'node_modules/*', '*.zip', 'dist/*', '.DS_Store'];
        const excludeArgs = excludes.map((exclude: string) => `--exclude=${exclude}`).join(' ');
        await runCommand('sh', ['-c', `rsync -av ${excludeArgs} --exclude=${tempDir} --exclude=vendor . ${tempDir}/`], logger);
      }

      // Copy vendor dependencies to root level of temp directory (if exists)
      const vendorPath = 'vendor';
      try {
        await fs.access(vendorPath);
        logger.verbose('Copying vendor dependencies to package root...');
        await runCommand('sh', ['-c', `cp -r vendor/* ${tempDir}/`], logger);
      } catch (error) {
        // No vendor directory, continue
      }

      // Create ZIP from temp directory
      process.chdir(tempDir);
      await runCommand('zip', ['-r', `../${zipFileName}`, '.'], logger);
      process.chdir('..');

      // Move ZIP to project root
      await fs.rename(zipFileName, path.join('..', zipFileName));

      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true });

    } catch (error) {
      // Clean up temp directory on error
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }

  } finally {
    // Always return to original directory
    process.chdir(originalCwd);
  }
}

function runCommand(command: string, args: string[], logger: Logger): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.verbose(`Running: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to run command: ${command} ${args.join(' ')}: ${error.message}`));
    });
  });
}

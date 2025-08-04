import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { ConfigManager } from '../utils/config';
import { Logger } from '../utils/logger';

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

    // Install Python dependencies if requirements are specified
    if (config.requirements && config.requirements.length > 0) {
      logger.info('Installing Python dependencies...');
      await installPythonDependencies(config.requirements, vendorDir, logger);
    }

    // Create deployment ZIP
    await createDeploymentZip(functionsDir, config, zipFileName, logger);

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

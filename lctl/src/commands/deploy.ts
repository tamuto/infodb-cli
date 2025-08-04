import chalk from 'chalk';
import { spawn } from 'child_process';
import { ScriptGenerator } from '../utils/script-generator';
import { Logger } from '../utils/logger';
import { makeZipCommand } from './makezip';
import { exportCommand } from './export';

export interface DeployOptions {
  verbose?: boolean;
}

export async function deployCommand(functionName: string, options: DeployOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);

  try {
    logger.info(`Deploying Lambda function: ${chalk.cyan(functionName)}`);

    // Step 1: Create deployment package
    logger.info('Step 1: Creating deployment package...');
    await makeZipCommand(functionName, { verbose: options.verbose });

    // Step 2: Export deployment script
    logger.info('Step 2: Generating deployment script...');
    const scriptFileName = `deploy-${functionName}.sh`;
    await exportCommand(functionName, { 
      output: scriptFileName, 
      verbose: options.verbose,
      cleanupZip: true
    });

    // Step 3: Execute the deployment script
    logger.info('Step 3: Executing deployment script...');
    try {
      // Set environment variables for the script
      const env = {
        ...process.env,
      };

      await executeScript(scriptFileName, env, logger);

    } finally {
      // Clean up script file
      const scriptGenerator = new ScriptGenerator(logger);
      await scriptGenerator.cleanupScript(scriptFileName);
    }

  } catch (error) {
    logger.error(`❌ Failed to deploy Lambda function: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

function executeScript(scriptPath: string, env: NodeJS.ProcessEnv, logger: Logger): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [scriptPath], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      if (logger) {
        process.stdout.write(output);
      }
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      if (logger) {
        process.stderr.write(chalk.yellow(output));
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Deployment script failed (exit code ${code}): ${stderr || 'Unknown error'}`));
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to execute deployment script: ${error.message}`));
    });
  });
}

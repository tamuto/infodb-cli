import chalk from 'chalk';
import { spawn } from 'child_process';
import { ConfigManager } from '../utils/config';
import { ScriptGenerator } from '../utils/script-generator';
import { Logger } from '../utils/logger';

export interface DeployOptions {
  verbose?: boolean;
}

export async function deployCommand(functionName: string, options: DeployOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);

  try {
    logger.info(`Deploying Lambda function: ${chalk.cyan(functionName)}`);

    // Load configuration
    const configManager = new ConfigManager(functionName, logger);
    const config = await configManager.loadConfig({});

    logger.verbose('Configuration loaded:', config);

    // Generate and execute deployment script
    const scriptGenerator = new ScriptGenerator(logger);
    const actualFunctionName = config.function_name || functionName;
    const script = scriptGenerator.generateDeployScript(actualFunctionName, config);
    const scriptPath = await scriptGenerator.saveScript(functionName, script);

    try {
      // Set environment variables for the script
      const env = {
        ...process.env,
      };

      // Execute the script
      logger.info('Executing deployment script...');
      await executeScript(scriptPath, env, logger);

      // スクリプト内で成功メッセージが出力されるため、ここでは出力しない

    } finally {
      // Clean up script file
      await scriptGenerator.cleanupScript(scriptPath);
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

import chalk from 'chalk';
import { spawn } from 'child_process';
import { ConfigManager } from '../utils/config';
import { ScriptGenerator } from '../utils/script-generator';
import { Logger } from '../utils/logger';

export interface DeployOptions {
  runtime?: string;
  handler?: string;
  role?: string;
  config?: string;
  function?: string;
  region?: string;
  profile?: string;
  verbose?: boolean;
}

export async function deployCommand(functionName: string, options: DeployOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);

  try {
    logger.info(`Deploying Lambda function: ${chalk.cyan(functionName)}`);

    // Load configuration
    const configManager = new ConfigManager(functionName, logger);
    const config = await configManager.loadConfig({
      runtime: options.runtime,
      handler: options.handler,
      role: options.role,
    }, options.config, options.function);

    logger.verbose('Configuration loaded:', config);

    // Generate and execute deployment script
    const scriptGenerator = new ScriptGenerator(logger);
    const script = scriptGenerator.generateDeployScript(functionName, config);
    const scriptPath = await scriptGenerator.saveScript(functionName, script);

    try {
      // Set environment variables for the script
      const env = {
        ...process.env,
        AWS_PROFILE: options.profile || process.env.AWS_PROFILE || 'default',
        AWS_REGION: options.region || process.env.AWS_REGION || 'ap-northeast-1',
      };

      // Execute the script
      logger.info('Executing deployment script...');
      await executeScript(scriptPath, env, logger);

      logger.success(`✅ Lambda function ${chalk.cyan(functionName)} deployed successfully!`);

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

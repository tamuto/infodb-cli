import chalk from 'chalk';
import { ConfigManager } from '../utils/config';
import { ScriptGenerator } from '../utils/script-generator';
import { Logger } from '../utils/logger';

export interface ExportOptions {
  runtime?: string;
  handler?: string;
  role?: string;
  params?: string[];
  region?: string;
  profile?: string;
  verbose?: boolean;
  output?: string;
}

export async function exportCommand(functionName: string, options: ExportOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);

  try {
    logger.info(`Exporting deploy script for Lambda function: ${chalk.cyan(functionName)}`);

    // Parse parameters
    const params: Record<string, string> = {};
    if (options.params) {
      for (const param of options.params) {
        const [key, value] = param.split('=');
        if (key && value) {
          params[key] = value;
        } else {
          throw new Error(`Invalid parameter format: ${param}. Use key=value format.`);
        }
      }
    }

    // Load configuration
    const configManager = new ConfigManager(functionName, params, logger);
    const config = await configManager.loadConfig({
      runtime: options.runtime,
      handler: options.handler,
      role: options.role,
    });

    logger.verbose('Configuration loaded:', config);

    // Generate script
    const scriptGenerator = new ScriptGenerator(logger);
    const script = scriptGenerator.generateDeployScript(functionName, config);

    // Save script
    const outputPath = options.output || `deploy-${functionName}.sh`;
    const scriptPath = await scriptGenerator.saveScript(outputPath, script);

    logger.success(`✅ Deploy script exported successfully: ${chalk.cyan(scriptPath)}`);
    logger.info(`Run with: ${chalk.yellow(`bash ${scriptPath}`)}`);

  } catch (error) {
    logger.error(`❌ Failed to export deploy script: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

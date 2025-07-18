import chalk from 'chalk';
import { ConfigManager } from '../utils/config';
import { ScriptGenerator } from '../utils/script-generator';
import { Logger } from '../utils/logger';

export interface ExportOptions {
  output?: string;
  verbose?: boolean;
}

export async function exportCommand(functionName: string, options: ExportOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);

  try {
    logger.info(`Exporting deploy script for Lambda function: ${chalk.cyan(functionName)}`);

    // Load configuration
    const configManager = new ConfigManager(functionName, logger);
    const config = await configManager.loadConfig({});

    logger.verbose('Configuration loaded:', config);

    // Generate script
    const scriptGenerator = new ScriptGenerator(logger);
    const actualFunctionName = config.function_name || functionName;
    const script = scriptGenerator.generateDeployScript(actualFunctionName, config);

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

import chalk from 'chalk';
import { AwsCliManager } from '../utils/aws-cli';
import { ConfigManager } from '../utils/config';
import { Logger } from '../utils/logger';

export interface DeleteOptions {
  verbose?: boolean;
}

export async function deleteCommand(functionName: string, options: DeleteOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);

  try {
    logger.info(`Deleting Lambda function: ${chalk.cyan(functionName)}`);

    // Load configuration to get actual function name
    const configManager = new ConfigManager(functionName, logger);
    const config = await configManager.loadConfig({});
    const actualFunctionName = config.function_name || functionName;

    const awsCliManager = new AwsCliManager(undefined, undefined, logger);
    await awsCliManager.deleteFunction(actualFunctionName);

    logger.success(`✅ Lambda function ${chalk.cyan(actualFunctionName)} deleted successfully!`);

  } catch (error) {
    logger.error(`❌ Failed to delete Lambda function: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

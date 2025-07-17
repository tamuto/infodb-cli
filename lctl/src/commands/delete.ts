import chalk from 'chalk';
import { AwsCliManager } from '../utils/aws-cli';
import { Logger } from '../utils/logger';

export interface DeleteOptions {
  region?: string;
  profile?: string;
  verbose?: boolean;
}

export async function deleteCommand(functionName: string, options: DeleteOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);

  try {
    logger.info(`Deleting Lambda function: ${chalk.cyan(functionName)}`);

    const awsCliManager = new AwsCliManager(options.region, options.profile, logger);
    await awsCliManager.deleteFunction(functionName);

    logger.success(`✅ Lambda function ${chalk.cyan(functionName)} deleted successfully!`);

  } catch (error) {
    logger.error(`❌ Failed to delete Lambda function: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

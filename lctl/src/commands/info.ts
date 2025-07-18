import chalk from 'chalk';
import { AwsCliManager } from '../utils/aws-cli';
import { ConfigManager } from '../utils/config';
import { Logger } from '../utils/logger';

export interface InfoOptions {
  verbose?: boolean;
}

export async function infoCommand(functionName: string, options: InfoOptions): Promise<void> {
  const logger = new Logger(options.verbose || false);

  try {
    logger.info(`Getting information for Lambda function: ${chalk.cyan(functionName)}`);

    // Load configuration to get actual function name
    const configManager = new ConfigManager(functionName, logger);
    const config = await configManager.loadConfig({});
    const actualFunctionName = config.function_name || functionName;

    const awsCliManager = new AwsCliManager(undefined, undefined, logger);
    const functionInfo = await awsCliManager.getFunctionInfo(actualFunctionName);

    // Display function information in a readable format
    console.log(chalk.green('\n📋 Lambda Function Information:'));
    console.log(chalk.cyan('Function Name:'), functionInfo.FunctionName);
    console.log(chalk.cyan('Runtime:'), functionInfo.Runtime);
    console.log(chalk.cyan('Handler:'), functionInfo.Handler);
    console.log(chalk.cyan('Memory Size:'), `${functionInfo.MemorySize} MB`);
    console.log(chalk.cyan('Timeout:'), `${functionInfo.Timeout} seconds`);
    console.log(chalk.cyan('Last Modified:'), functionInfo.LastModified);
    console.log(chalk.cyan('Code Size:'), `${functionInfo.CodeSize} bytes`);
    console.log(chalk.cyan('State:'), functionInfo.State);
    console.log(chalk.cyan('Architecture:'), functionInfo.Architectures?.join(', ') || 'x86_64');

    if (functionInfo.Description) {
      console.log(chalk.cyan('Description:'), functionInfo.Description);
    }

    if (functionInfo.Environment?.Variables && Object.keys(functionInfo.Environment.Variables).length > 0) {
      console.log(chalk.cyan('\n🔧 Environment Variables:'));
      Object.entries(functionInfo.Environment.Variables).forEach(([key, value]) => {
        console.log(`  ${chalk.yellow(key)}: ${value}`);
      });
    }

    if (functionInfo.Layers && functionInfo.Layers.length > 0) {
      console.log(chalk.cyan('\n📦 Layers:'));
      functionInfo.Layers.forEach((layer, index) => {
        console.log(`  ${index + 1}. ${layer.Arn}`);
      });
    }

  } catch (error) {
    logger.error(`❌ Failed to get Lambda function information: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

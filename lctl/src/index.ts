#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { deployCommand } from './commands/deploy';
import { deleteCommand } from './commands/delete';
import { infoCommand } from './commands/info';
import { exportCommand } from './commands/export';
import { makeZipCommand } from './commands/makezip';

const program = new Command();

program
  .name('lctl')
  .description('AWS Lambda Control Tool - Simple CLI for managing Lambda functions')
  .version('0.9.0');

// Deploy command
program
  .command('deploy')
  .description('Deploy Lambda function (create or update)')
  .argument('<function-name>', 'Configuration file name (without .yaml extension)')
  .option('--verbose', 'Verbose output')
  .action(deployCommand);

// Delete command
program
  .command('delete')
  .description('Delete Lambda function')
  .argument('<function-name>', 'Configuration file name (without .yaml extension)')
  .option('--verbose', 'Verbose output')
  .action(deleteCommand);

// Info command
program
  .command('info')
  .description('Show Lambda function information')
  .argument('<function-name>', 'Configuration file name (without .yaml extension)')
  .option('--verbose', 'Verbose output')
  .action(infoCommand);

// MakeZip command
program
  .command('makezip')
  .description('Create deployment ZIP package')
  .argument('<function-name>', 'Configuration file name (without .yaml extension)')
  .option('--verbose', 'Verbose output')
  .action(makeZipCommand);

// Export command
program
  .command('export')
  .description('Export deployment script')
  .argument('<function-name>', 'Configuration file name (without .yaml extension)')
  .option('--output <file>', 'Output script file path')
  .option('--verbose', 'Verbose output')
  .action(exportCommand);

program.parse();

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught exception:'), error);
  process.exit(1);
});

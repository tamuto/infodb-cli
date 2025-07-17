#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { deployCommand } from './commands/deploy';
import { deleteCommand } from './commands/delete';
import { infoCommand } from './commands/info';
import { exportCommand } from './commands/export';

const program = new Command();

program
  .name('lctl')
  .description('AWS Lambda Control Tool - Simple CLI for managing Lambda functions')
  .version('0.2.0');

// Deploy command
program
  .command('deploy')
  .description('Deploy Lambda function (create or update)')
  .argument('<function-name>', 'Lambda function name')
  .option('--runtime <runtime>', 'Runtime environment', 'python3.12')
  .option('--handler <handler>', 'Handler function')
  .option('--role <role-arn>', 'IAM role ARN (required for new functions)')
  .option('--params <key=value>', 'Parameters for YAML variable substitution', [])
  .option('--config <directory>', 'Config directory path', 'configs')
  .option('--function <directory>', 'Functions directory path', 'functions')
  .option('--region <region>', 'AWS region')
  .option('--profile <profile>', 'AWS profile')
  .option('--verbose', 'Verbose output')
  .action(deployCommand);

// Delete command
program
  .command('delete')
  .description('Delete Lambda function')
  .argument('<function-name>', 'Lambda function name')
  .option('--region <region>', 'AWS region')
  .option('--profile <profile>', 'AWS profile')
  .option('--verbose', 'Verbose output')
  .action(deleteCommand);

// Info command
program
  .command('info')
  .description('Show Lambda function information')
  .argument('<function-name>', 'Lambda function name')
  .option('--region <region>', 'AWS region')
  .option('--profile <profile>', 'AWS profile')
  .option('--verbose', 'Verbose output')
  .action(infoCommand);

// Export command
program
  .command('export')
  .description('Export deployment script')
  .argument('<function-name>', 'Lambda function name')
  .option('--runtime <runtime>', 'Runtime environment', 'python3.12')
  .option('--handler <handler>', 'Handler function')
  .option('--role <role-arn>', 'IAM role ARN (required for new functions)')
  .option('--params <key=value>', 'Parameters for YAML variable substitution', [])
  .option('--config <directory>', 'Config directory path', 'configs')
  .option('--function <directory>', 'Functions directory path', 'functions')
  .option('--output <file>', 'Output script file path')
  .option('--region <region>', 'AWS region')
  .option('--profile <profile>', 'AWS profile')
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
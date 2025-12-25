#!/usr/bin/env node

import { Command } from 'commander';
import { startCommand } from './commands/start.js';
import { validateCommand } from './commands/validate.js';
import { initCommand } from './commands/init.js';

const program = new Command();

program
  .name('revx')
  .description('Reverse proxy CLI tool with YAML configuration')
  .version('0.2.2');

program
  .command('start')
  .description('Start the reverse proxy server')
  .argument('[config-file]', 'Configuration file path', 'revx.yaml')
  .option('--verbose', 'Verbose output')
  .action(startCommand);

program
  .command('validate')
  .description('Validate configuration file')
  .argument('<config-file>', 'Configuration file path')
  .option('--verbose', 'Verbose output')
  .action(validateCommand);

program
  .command('init')
  .description('Create a sample configuration file')
  .option('--simple', 'Create a simple configuration file')
  .option('--output <file>', 'Output file path', 'revx.yaml')
  .option('--verbose', 'Verbose output')
  .action(initCommand);

program.parse();

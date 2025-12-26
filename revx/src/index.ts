#!/usr/bin/env node

import { Command } from 'commander';
import { startCommand } from './commands/start.js';
import { validateCommand } from './commands/validate.js';
import { initCommand } from './commands/init.js';

const program = new Command();

program
  .name('revx')
  .description('Multi-Vite project development server')
  .version('1.0.0');

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
  .description('Create a sample configuration file (default: Vite multi-project)')
  .option('--simple', 'Create a simple Vite proxy configuration')
  .option('--proxy', 'Create a reverse proxy configuration')
  .option('--output <file>', 'Output file path', 'revx.yaml')
  .option('--verbose', 'Verbose output')
  .action(initCommand);

program.parse();

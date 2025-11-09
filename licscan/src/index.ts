#!/usr/bin/env node

import { Command } from 'commander';
import { scanCommand } from './commands/scan.js';
import { logger } from './utils/logger.js';

const program = new Command();

program
  .name('licscan')
  .description('License and Copyright Scanner for package.json and pyproject.toml')
  .version('0.8.2');

program
  .command('scan')
  .description('Scan a project for license and copyright information')
  .argument('[path]', 'Path to project directory', '.')
  .option('-d, --include-dev', 'Include dev dependencies', false)
  .option('-f, --format <format>', 'Output format (text, json, csv)', 'text')
  .option('-o, --output <file>', 'Output file path')
  .option('--npm-only', 'Scan only npm dependencies (package.json)', false)
  .option('--python-only', 'Scan only Python dependencies (pyproject.toml)', false)
  .action(async (projectPath: string, options) => {
    try {
      await scanCommand(projectPath, options);
    } catch (error) {
      logger.error(`Scan failed: ${error}`);
      process.exit(1);
    }
  });

// Default command
program
  .argument('[path]', 'Path to project directory', '.')
  .option('-d, --include-dev', 'Include dev dependencies', false)
  .option('-f, --format <format>', 'Output format (text, json, csv)', 'text')
  .option('-o, --output <file>', 'Output file path')
  .option('--npm-only', 'Scan only npm dependencies (package.json)', false)
  .option('--python-only', 'Scan only Python dependencies (pyproject.toml)', false)
  .action(async (projectPath: string, options) => {
    try {
      await scanCommand(projectPath, options);
    } catch (error) {
      logger.error(`Scan failed: ${error}`);
      process.exit(1);
    }
  });

program.parse(process.argv);

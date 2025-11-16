#!/usr/bin/env node

import { Command } from 'commander';
import { exportCommand } from './commands/export';
import { downloadCommand } from './commands/download';

const program = new Command();

program
  .name('tfme')
  .description('Terraform schema to YAML conversion and documentation download')
  .version('0.2.0');

// Export command
program
  .command('export')
  .description('Export Terraform resource schema to YAML format')
  .requiredOption('-r, --resource <resource>', 'Resource name (e.g., aws_vpc)')
  .option('-o, --output <dir>', 'Output directory', 'output')
  .option('--clear-cache', 'Clear cache before downloading', false)
  .action(async (options) => {
    try {
      await exportCommand(options);
    } catch (error) {
      console.error('Export failed:', error);
      process.exit(1);
    }
  });

// Download command
program
  .command('download')
  .description('Download Markdown documentation from Terraform Registry')
  .requiredOption('-r, --resource <resource>', 'Resource name (e.g., aws_vpc)')
  .option('-o, --output <dir>', 'Output directory', 'docs')
  .option('-n, --namespace <namespace>', 'Provider namespace (default: hashicorp)')
  .option('-v, --version <version>', 'Provider version (default: latest)', 'latest')
  .action(async (options) => {
    try {
      await downloadCommand(options);
    } catch (error) {
      console.error('Download failed:', error);
      process.exit(1);
    }
  });

program.parse();

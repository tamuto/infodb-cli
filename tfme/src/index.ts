#!/usr/bin/env node

import { Command } from 'commander';
import { exportCommand } from './commands/export';
import { downloadCommand } from './commands/download';

const program = new Command();

program
  .name('tfme')
  .description('Terraform schema to YAML conversion and documentation download')
  .version('0.1.0');

// Export command
program
  .command('export')
  .description('Export Terraform provider schema to YAML format')
  .argument('<json-path>', 'Path to providers.json file (from terraform providers schema -json)')
  .option('-p, --provider <provider>', 'Filter by provider name (e.g., aws, azurerm)')
  .option('-r, --resource <resource>', 'Export specific resource (e.g., aws_instance)')
  .option('-o, --output <dir>', 'Output directory', 'output')
  .option('-s, --split', 'Generate split files (one per resource)', false)
  .action(async (jsonPath: string, options) => {
    try {
      await exportCommand(jsonPath, options);
    } catch (error) {
      console.error('Export failed:', error);
      process.exit(1);
    }
  });

// Download command
program
  .command('download')
  .description('Download Markdown documentation from Terraform Registry')
  .argument('<json-path>', 'Path to providers.json file (from terraform providers schema -json)')
  .option('-p, --provider <provider>', 'Filter by provider name (e.g., aws, azurerm)')
  .option('-r, --resource <resource>', 'Download specific resource documentation')
  .option('-o, --output <dir>', 'Output directory', 'docs')
  .option('-v, --version <version>', 'Provider version (default: latest)', 'latest')
  .action(async (jsonPath: string, options) => {
    try {
      await downloadCommand(jsonPath, options);
    } catch (error) {
      console.error('Download failed:', error);
      process.exit(1);
    }
  });

program.parse();

#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import {
  ConfigError,
  DEFAULT_SECTION,
  defaultConfigPath,
  loadConfig,
  resolveKeywords,
  SAMPLE_CONFIG,
} from './config.js';
import { createMatcher, listPresets } from './matchers/index.js';
import { DEFAULT_EXCLUDES, search, SearchStats } from './search.js';
import { formatLine, toJson } from './output.js';

const EXIT_FOUND = 0;
const EXIT_NOT_FOUND = 1;
const EXIT_ERROR = 2;

interface SearchCommandOptions {
  section: string;
  config: string;
  ignoreCase: boolean;
  exclude: string[];
  defaultExcludes: boolean;
  maxFileSize: string;
  filesWithMatches: boolean;
  json: boolean;
}

const program = new Command();

program
  .name('wfind')
  .description('Search folders for predefined keywords (text, regex, presets) defined in keywords.toml')
  .version('0.1.0');

program
  .command('search', { isDefault: true })
  .description('Search files under the path for keywords of the section (+ default section)')
  .argument('[path]', 'File or directory to search', '.')
  .option('-s, --section <name>', 'Keyword section (default section is always included)', DEFAULT_SECTION)
  .option('-c, --config <file>', 'Keyword config file', defaultConfigPath())
  .option('-i, --ignore-case', 'Ignore case for all keywords', false)
  .option('-x, --exclude <names...>', 'File or directory names to exclude', [])
  .option('--no-default-excludes', `Do not exclude ${DEFAULT_EXCLUDES.join(', ')}`)
  .option('--max-file-size <bytes>', 'Skip files larger than this size', String(10 * 1024 * 1024))
  .option('-l, --files-with-matches', 'Print only names of files with matches', false)
  .option('--json', 'Output results as JSON Lines', false)
  .action(async (target: string, options: SearchCommandOptions) => {
    process.exitCode = await runSearch(target, options);
  });

program
  .command('list')
  .description('Show keywords used for the section (default section is always included)')
  .argument('[section]', 'Section name', DEFAULT_SECTION)
  .option('-c, --config <file>', 'Keyword config file', defaultConfigPath())
  .action((section: string, options: { config: string }) => {
    handleErrors(() => {
      const config = loadConfig(options.config);
      console.log(chalk.gray(`# ${config.path}`));
      console.log(chalk.gray(`# sections: ${[...config.sections.keys()].join(', ') || '(none)'}`));
      for (const { section: from, spec } of resolveKeywords(config, section)) {
        const label = spec.label ? `  ${chalk.yellow(`(${spec.label})`)}` : '';
        console.log(`[${from}] ${chalk.cyan(spec.type.padEnd(6))} ${spec.value}${label}`);
      }
    });
  });

program
  .command('presets')
  .description('List available presets (abstract keywords such as phone numbers)')
  .action(() => {
    for (const preset of listPresets()) {
      const aliases = preset.aliases.length > 0 ? chalk.gray(` (${preset.aliases.join(', ')})`) : '';
      console.log(`${chalk.cyan(preset.name)}${aliases}\n  ${preset.description}`);
    }
  });

program
  .command('init')
  .description('Create a sample keyword config file')
  .option('-c, --config <file>', 'Keyword config file', defaultConfigPath())
  .option('-f, --force', 'Overwrite an existing file', false)
  .action((options: { config: string; force: boolean }) => {
    handleErrors(() => {
      if (fs.existsSync(options.config) && !options.force) {
        throw new ConfigError(`${options.config} already exists (use --force to overwrite)`);
      }
      fs.mkdirSync(path.dirname(options.config), { recursive: true });
      fs.writeFileSync(options.config, SAMPLE_CONFIG);
      console.log(`Created ${options.config}`);
    });
  });

async function runSearch(target: string, options: SearchCommandOptions): Promise<number> {
  try {
    const config = loadConfig(options.config);
    const matchers = resolveKeywords(config, options.section).map(({ section, spec }) =>
      createMatcher(spec, section, { ignoreCase: options.ignoreCase }),
    );
    if (matchers.length === 0) {
      throw new ConfigError(`No keywords defined for section "${options.section}" in ${config.path}`);
    }
    if (!fs.existsSync(target)) {
      throw new ConfigError(`Path not found: ${target}`);
    }
    const maxFileSize = Number(options.maxFileSize);
    if (!Number.isFinite(maxFileSize) || maxFileSize < 0) {
      throw new ConfigError(`Invalid --max-file-size: ${options.maxFileSize}`);
    }

    const stats: SearchStats = { filesScanned: 0, filesSkipped: 0 };
    const excludes = [...(options.defaultExcludes ? DEFAULT_EXCLUDES : []), ...options.exclude];
    let found = false;
    let lastFile: string | undefined;

    for await (const result of search(target, matchers, { excludes, maxFileSize }, stats)) {
      found = true;
      if (options.filesWithMatches) {
        if (result.file !== lastFile) console.log(result.file);
      } else if (options.json) {
        console.log(JSON.stringify(toJson(result)));
      } else {
        console.log(formatLine(result));
      }
      lastFile = result.file;
    }

    if (!options.json && !options.filesWithMatches) {
      console.error(
        chalk.gray(
          `${stats.filesScanned} files scanned, ${stats.filesSkipped} skipped (binary/large), ` +
            `${matchers.length} keywords [${DEFAULT_SECTION}${options.section === DEFAULT_SECTION ? '' : ` + ${options.section}`}]`,
        ),
      );
    }
    return found ? EXIT_FOUND : EXIT_NOT_FOUND;
  } catch (error) {
    printError(error);
    return EXIT_ERROR;
  }
}

function handleErrors(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    printError(error);
    process.exitCode = EXIT_ERROR;
  }
}

function printError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red('✗'), message);
}

program.parseAsync(process.argv);

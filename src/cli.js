#!/usr/bin/env node

const program = require('commander')

const docker = require('./docker')
const gitsync = require('./gitsync')
const tmpl = require('./template')
const serve = require('./serve')
const minify = require('./minify')
const es = require('./es')
const runall = require('./runall')

program
  .version('0.1.7', '--version', 'output the current version')
  .usage('<cmd> [options]')

program
  .command('docker <start|stop> [file]')
  .description('execute docker-compose.')
  .action(docker.command)

program
  .command('gitsync')
  .description('git submodule foreach git pull origin master')
  .action(gitsync.command)

program
  .command('template')
  .description('convert JSON using a template')
  .usage('template [options]')
  .requiredOption('-t, --template <file>', 'template file')
  .requiredOption('-i, --input <file>', 'input file')
  .requiredOption('-o, --output <file>', 'output file')
  .action(tmpl.command)

program
  .command('serve')
  .description('web server for react-route')
  .usage('serve [folder]')
  .action(serve.command)

program
  .command('minify')
  .usage('[options]')
  .option('-i --input <file>', 'target file', 'src/index.html')
  .option('-o, --output-dir <dir>', 'output directory', 'dist')
  .description('minify')
  .action(minify.command)

program
  .command('es')
  .usage('<file> [options]')
  .option('-i --input <file>', 'target file', 'src/index.js')
  .option('-o, --output-dir <dir>', 'output directory', 'dist')
  .option('--no-bundle', 'bundle option', true)
  .option('--minify', 'minify', false)
  .option('--source-map', 'output source map', false)
  .description('esbuild')
  .action(es.command)

program
  .command('runall <name>')
  .description('runall')
  .action(runall.command)

program.parse(process.argv)

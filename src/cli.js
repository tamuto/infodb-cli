#!/usr/bin/env node

const program = require('commander')

const docker = require('./docker')
const gitsync = require('./gitsync')
const tmpl = require('./template')
const serve = require('./serve')
const minify = require('./minify')
const es = require('./es')
const runall = require('./runall')
const init = require('./init')
const docview = require('./docview')
const shell = require('./shell')
const verup = require('./verup')
const nbenv = require('./nbenv')
const pack = require('./pack')

program
  .version('0.12.0', '--version', 'output the current version')
  .usage('<cmd> [options]')

program
  .command('init <prjname>')
  .description('new project from boilerplate')
  .option('--boilerplate <url>', 'boilerplate url', 'https://codeload.github.com/tamuto/boilerplate/zip/main')
  .action(init.command)

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
  .requiredOption('-t, --template <file>', 'template file')
  .requiredOption('-i, --input <file>', 'input file')
  .requiredOption('-o, --output <file>', 'output file')
  .action(tmpl.command)

program
  .command('serve')
  .description('web server for react-route')
  .option('-d, --dir <dir>', 'webroot dir', 'dist')
  .option('-p, --port <port>', 'port number', '8080')
  .action(serve.command)

program
  .command('minify')
  .option('-i --input <file>', 'target file', 'src/index.html')
  .option('-o, --output-dir <dir>', 'output directory', 'dist')
  .description('minify')
  .action(minify.command)

program
  .command('es')
  .option('-i --input <file>', 'target file', 'src/index.js')
  .option('-o, --output-dir <dir>', 'output directory', 'dist')
  .option('--no-bundle', 'bundle option', true)
  .option('--minify', 'minify', false)
  .option('--source-map', 'output source map', false)
  .option('--emotion <shim>', undefined)
  .description('esbuild')
  .action(es.command)

program
  .command('runall <name>')
  .description('runall')
  .action(runall.command)

program
  .command('docview')
  .option('-d, --dir <dir>', 'base directory', 'docs')
  .action(docview.command)

program
  .command('shell <file>')
  .requiredOption('-c, --command <cmd>', 'command')
  .action(shell.command)

program
  .command('verup <file>')
  .action(verup.command)

program
  .command('nbenv')
  .action(nbenv.command)

program
  .command('pack')
  .option('--input <dir>', 'input directory', '.')
  .option('--output <dir>', 'output directory', 'dist')
  .option('--add-version', '', false)
  .option('--info', '', false)
  .option('--verbose', '', false)
  .option('--static-date-modified', '', false)
  .action(pack.command)

program.parse(process.argv)

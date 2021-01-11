#!/usr/bin/env node

const program = require('commander')

const docker = require('./docker')
const build = require('./build')
const gitsync = require('./gitsync')
const tmpl = require('./template')

program
    .version('0.0.1')
    .usage('<cmd> [options] <file ...>')

program
    .command('docker <start|stop> [file]')
    .description('execute docker-compose.')
    .action(docker.command)

program
    .command('build')
    .description('execute build command')
    .usage('build [options]')
    .option('-o, --output <path>', 'output folder', 'dist')
    .option('--main <name>', 'main script', 'index.html')
    .option('--run-all <name>', 'run npm scripts', 'nothing')
    .action(build.command)

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

program.parse(process.argv)

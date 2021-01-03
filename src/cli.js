#!/usr/bin/env node

const program = require('commander')

const docker = require('./docker')
// const build = require('./build')
const gitsync = require('./gitsync')

program
    .version('0.0.1')
    .usage('<cmd> [options] <file ...>')

program
    .command('docker <start|stop> [file]')
    .description('execute docker-compose.')
    .action(docker.command)

// program
//     .command('build')
//     .usage('build [options]')
//     .option('-o, --output <path>', 'output', 'dist')
//     .option('--main <name>', 'main', 'index.html')
//     .action(build.command)

program
    .command('gitsync')
    .description('git submodule foreach git pull origin master')
    .action(gitsync.command)

program.parse(process.argv)

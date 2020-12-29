#!/usr/bin/env node

const program = require('commander')

const docker = require('./docker')

program
    .version('0.0.1')
    .usage('<cmd> [options] <file ...>')

program
    .command('docker <start|stop> [file]')
    .description('execute docker-compose.')
    .action(docker.command)

program.parse(process.argv)

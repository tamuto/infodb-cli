Path = require('path')
fs = require('fs')
runAll = require('npm-run-all')

module.exports.command = (options) => {
    var main = options.main
    var outdir = options.output
    var sourceMaps = options.sourceMaps
    var outpath = Path.join(process.cwd(), outdir)

    const Bundler = require('parcel-bundler')
    const entryFiles = Path.join(process.cwd(), 'src', main)

    const opt = {
        outDir: outpath,
        outFile: main,
        watch: false,
        sourceMaps: sourceMaps
    }
    async function exec() {
        const bundler = new Bundler(entryFiles, opt)
        await bundler.bundle().catch(error => {
            process.exit(-1)
        })
        if(options.runAll != 'nothing') {
            await runAll([options.runAll], {parallel: false, stdout: process.stdout, silent: true}).catch(error => {
                process.exit(-1)
            })
        }
    }
    exec()
}

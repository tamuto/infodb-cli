const esbuild = require('esbuild')
const resolver = require('./resolver');

module.exports.command = (opts) => {
  esbuild.build({
    entryPoints: [opts.input],
    bundle: true,
    loader: {
      '.js': 'jsx'
    },
    outfile: resolver.outpath(opts.input, opts.outputDir),
  }).catch((e) => {
    console.log(e)
    process.exit(1)
  })
}

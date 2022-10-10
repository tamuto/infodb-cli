const esbuild = require('esbuild')
const { yamlPlugin } = require('esbuild-plugin-yaml')
const resolver = require('./resolver')

const onResolverPlugin = {
  name: 'resolver',
  setup(build) {
    const path = require('path')

    build.onResolve({ filter: /^~\// }, args => {
      const newPath = path.join(process.cwd(), 'frontend', args.path.substring(1))
      if (path.extname(newPath) === '') {
        return { path: newPath + '.js' }
      }
      return { path: newPath }
    })
  }
}

module.exports.command = (opts) => {
  esbuild.build({
    entryPoints: [opts.input],
    sourcemap: opts.sourceMap,
    bundle: opts.bundle,
    minify: opts.minify,
    plugins: [
      onResolverPlugin,
      yamlPlugin()
    ],
    loader: {
      '.js': 'jsx',
      '.png': 'file'
    },
    outfile: resolver.outpath(opts.input, opts.outputDir),
  }).catch((e) => {
    console.log(e)
    process.exit(1)
  })
}

const esbuild = require('esbuild')
const { yamlPlugin } = require('esbuild-plugin-yaml')
const resolver = require('./resolver')

const onResolverPlugin = {
  name: 'resolver',
  setup(build) {
    const path = require('path')
    const fs = require('fs')
    const https = require('https')
    const http = require('http')

    build.onResolve({ filter: /^~\// }, args => {
      const newPath = path.join(process.cwd(), 'frontend', args.path.substring(1))
      if (path.extname(newPath) === '') {
        return { path: newPath + '.js' }
      }
      return { path: newPath }
    })
    build.onResolve({ filter: /^https?:\/\/.*\.js$/}, (args) => {
      const fname = path.join(process.cwd(), '.cache', ...args.path.split('/').slice(2))
      if (fs.existsSync(fname)) {
        console.log(`Using Cache: ${args.path}`)
        return { path: fname }
      }
      const cacheDir = path.join(process.cwd(), '.cache', ...args.path.split('/').slice(2, -1))
      fs.mkdirSync(cacheDir, { recursive: true })

      const stream = fs.createWriteStream(fname)
      return new Promise((resolve, reject) => {
        function fetch(url) {
          console.log(`Downloading: ${url}`)
          const lib = url.startsWith('https') ? https : http
          const req = lib.get(args.path, res => {
            if ([301, 302, 307].includes(res.statusCode)) {
              fetch(new URL(res.header.location, url).toString())
              req.abort()
            } else if (res.statusCode == 200) {
              res.on('data', chunk => stream.write(chunk))
              res.on('end', () => {
                stream.end()
                resolve({ path: fname })
              })
            }
          }).on('error', reject)
        }
        fetch(args.path)
      })
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

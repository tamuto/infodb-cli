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
          const req = lib.get(url, res => {
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
    build.onResolve({ filter: /^github:\/\/.*\.js$/}, (args) => {
      const work = args.path.split('/').slice(2)
      const fname = path.join(process.cwd(), '.cache', 'api.github.com', ...work)
      if (fs.existsSync(fname)) {
        return { path: fname }
      }
      const cacheDir = path.join(process.cwd(), '.cache', 'api.github.com', ...work.slice(0, -1))
      fs.mkdirSync(cacheDir, { recursive: true })

      const stream = fs.createWriteStream(fname)
      return new Promise((resolve, reject) => {
        function fetch(owner, repos, content) {
          console.log(`Downloading from Github: ${owner}, ${repos}, ${content}`)
          const options = {
            protocol: 'https:',
            host: 'api.github.com',
            path: `/repos/${owner}/${repos}/contents/${content}`,
            method: 'GET',
            headers: {
              'Accept': 'application/vnd.github.raw',
              'User-Agent': 'infodb-cli'
            }
          }
          const req = https.request(options, res => {
            if (res.statusCode == 200) {
              res.on('data', chunk => stream.write(chunk))
              res.on('end', () => {
                stream.end()
                resolve({ path: fname })
              })
            } else {
              console.log(res.statusCode)
              req.abort()
            }
          }).on('error', reject)
          req.end()
        }
        const owner = work[0]
        const repos = work[1]
        const content = path.join(...work.slice(2))
        fetch(owner, repos, content)
      })
    })
  }
}

module.exports.command = (opts) => {
  console.log('###', __dirname)
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
      '.png': 'file',
      '.jpg': 'file',
      '.jpeg': 'file'
    },
    jsxFactory: 'jsx',
    inject: [`${__dirname}/ts/emotion-shim.ts`],
    outfile: resolver.outpath(opts.input, opts.outputDir),
  }).catch((e) => {
    console.log(e)
    process.exit(1)
  })
}

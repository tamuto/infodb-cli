const { pack } = require('npm-pack-zip')

module.exports.command = (opts) => {
  pack({
    source: opts.input,
    destination: opts.output,
    info: opts.info,
    verbose: opts.verbose,
    addVersion: opts.addVersion,
    staticDateModified: opts.staticDateModified
  })
    .then(() => process.exit(0))
    .catch((e) => {
      console.log(e)
      process.exit(1)
    })
}

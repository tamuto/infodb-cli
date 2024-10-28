runAll = require('npm-run-all')

module.exports.command = (name) => {
  async function exec() {
    await runAll([name], {parallel: false, stdout: process.stdout, silent: true}).catch(error => {
      console.log(error)
      process.exit(-1)
    })
  }
  exec()
}

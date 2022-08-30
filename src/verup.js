const fs = require('fs')

module.exports.command = (file, options) => {
  fs.writeFileSync(file, JSON.stringify({ version: Date.now() }))
}

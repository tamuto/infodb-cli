const cp = require('child_process')
const fs = require('fs')

const toml = `
[tool.poetry]
name = "your_project"
version = "0.1.0"
description = ""
authors = ["your_mail <yourmail@sample.com>"]

[tool.poetry.dependencies]
python = "^3.9"
jupyter = "^1.0.0"


[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
`

module.exports.command = (option) => {
  fs.writeFileSync('pyproject.toml', toml)
  cp.exec('poetry install', (err, stdout, stderr) => {
    console.log(stdout)
    console.log(stderr)
  })
}

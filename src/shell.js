const fs = require('fs')
const readline = require('readline')
const { spawn } = require('child_process')
const { process } = require('htmlnano')

async function* g(stream) {
  reader = readline.createInterface({ input: stream })
  for await (const data of reader) {
    yield data
  }
}


module.exports.command = async (file, options) => {
  const stream = fs.createReadStream(file, {
    encoding: 'utf8',
    highWaterMark: 1024
  })
  const reader = g(stream)
  const cmdlist = options.command.split()
  const exec = cmdlist.shift()
  const cmd = spawn(exec, cmdlist, { shell: true })
  cmd.stderr.on('data', data => console.log(data.toString()))
  cmd.stdout.on('data', async (data) => {
    console.log(data.toString())
    read = await reader.next()
    if(read.done) {
      cmd.stdin.end("\n")
    } else {
      cmd.stdin.write(read.value + "\n")
    }
  })

  cmd.stdin.write((await reader.next()).value + "\n")
}

const https = require('follow-redirects').https
const fs = require('fs')
const AdmZip = require('adm-zip')

module.exports.command = (prjname, opts) => {
  const extract = () => {
    const zip = new AdmZip('work.zip')
    zip.extractAllTo('.', false)

    fs.renameSync('boilerplate-main/boilerplate', prjname)
    fs.unlinkSync('work.zip')
    fs.rmSync('boilerplate-main', { recursive: true })
  }

  const file = fs.createWriteStream('work.zip')
  const request = https.get(opts.boilerplate, response => {
    response.pipe(file)

    file.on('finish', () => file.close(extract))
  })
  request.end()

  request.on('error', err => {
    fs.unlinkSync('work.zip')
    console.log(err.message)
  })
}

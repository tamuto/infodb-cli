const http = require('http')
const path = require('path')
const fs = require('fs')
const util = require('util')

const readFile = util.promisify(fs.readFile)

const mimeTypes = {
    '.js': 'text/javascript',
    '.html': 'text/html',
    '.css': 'text/css',
}

module.exports.command = (option) => {
    folder = option.folder || 'dist'

    http.createServer(async (req, res) => {
        let url = decodeURI(req.url)
        // 拡張子がなければindex.htmlを返す
        let filepath = folder + '/' + 'index.html'
        if(path.extname(url) != '') {
            filepath = folder + '/' + path.basename(url)
        }
        try {
            const data = await readFile(filepath)
            const headers = {'Content-Type': mimeTypes[path.extname(filepath)] + ';charset=utf-8'}

            res.writeHead(200, headers)
            res.end(data)
            console.log('[200]' + filepath)
        }
        catch(err) {
            console.log('[404]' + filepath)
            res.writeHead(404)
            res.end('page is not found')
        }
    }).listen(8080, () => console.log('Server http://localhost:8080'));
}

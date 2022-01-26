const http = require('http')
const path = require('path')
const URL = require('url').URL
const fs = require('fs')
const util = require('util')
const marked = require('marked')

const readFile = util.promisify(fs.readFile)

const mimeTypes = {
    '.js': 'text/javascript',
    '.html': 'text/html',
    '.css': 'text/css',
}

const make_anchor_key = (value) => {
    value = value.replaceAll(/<("[^"]*"|'[^']*'|[^'">])*>/g, '')
    value = value.replaceAll(/[\(\)/]/g, '')
    value = value.replaceAll(/[\u30a0-\u30ff\u3040-\u309f\u3005-\u3006\u30e0-\u9fcf]+/g, '_')
    return value.toLowerCase()
}

var ancnt = {}
const renderer = new marked.Renderer()
renderer.code = (code, language) => {
    if (language == 'marmaid') {
        return `<div class='mermaid'>${code}</code>`
    } else {
        return `<pre><code>${code}</code></pre>`
    }
}
renderer.heading = (text, level) => {
    const name = make_anchor_key(text)
    var num = 1
    if (name in ancnt) {
        num = ancnt[name]
    }
    ancnt[name] = num + 1
    ancname = `${name}${num}`
    return `<h${level}>${text}<a name='${ancname}' class='anchor' href='#${ancname}'><span class='header-link'></span></a></h${level}>`
}

const html = (title, content) => {
    return (
        `
<!DOCTYPE html>
<meta charset='utf-8'>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
body {
    font-family: Arial;
}
.container {
    width: 960px;
    margin-left: auto;
    margin-right: auto;
}
.footer {
    margin-bottom: 30px;
}
.anchor {
    text-decoration: none;
}
.anchor:after {
    margin-left: 5px;
    content: '¶';
    text-decoration: none;
    color: #DDDDDD;
}
table {
    border-collapse: collapse;
}
th {
    padding: 0.3em 1em;
    border: solid 1px grey;
    background-color: lightgrey;
}
td {
    padding: 0.3em 1em;
    border: solid 1px grey;
}
code {
    color: black;
    background-color: lightgoldenrodyellow;
    border: 1px solid darkorange;
    padding-top: 0.3em;
    padding-bottom: 0.3em;
    padding-left: 0.5em;
    padding-right: 0.5em;
}
pre {
    background-color: #EEEEEE;
    border: solid 1px grey;
    padding: 0.3em;
}
pre>code {
    background-color: inherit;
    border: none;
}
</style>
<body>
<div class='container is-max-desktop'>${content}</div>
<div class='footer'></div>
</body>
        `
    )
}

module.exports.command = (option) => {
    console.log(process.cwd())
    http.createServer(async (req, res) => {
        const urlpath = new URL(decodeURI(req.url), req.protocol+"://"+req.headers.host).pathname

        let filepath = option.dir + urlpath + 'index.md'
        if (path.extname(urlpath) != '') {
            filepath = option.dir + urlpath
        }
        try {
            let data = await readFile(filepath)
            let ext = path.extname(filepath)
            if (ext.toLowerCase() === '.md') {
                ext = '.html'

                ancnt = {}
                data = marked.parse(data.toString(), { renderer: renderer })
                data = html(path.basename(urlpath), data)
            }
            const headers = {'Content-Type': mimeTypes[ext] + ';charset=utf-8'}

            res.writeHead(200, headers)
            res.end(data)
            console.log('[200]' + filepath)
        }
        catch(err) {
            console.log('[404]' + filepath)
            console.log(err)
            res.writeHead(404)
            res.end('page is not found')
        }
    }).listen(8081, () => console.log('DocView Server http://localhost:8081'))
}

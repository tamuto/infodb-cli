const hbs = require('handlebars')
const fs = require('fs')
const yaml = require('yaml')

module.exports.command = (options) => {
    var tmplFile = options.template
    var yamlFile = options.input
    var outputFile = options.output

    async function exec() {
        var tmlp = fs.readFileSync(tmplFile)
        var template = hbs.compile(tmlp.toString())
    
        var yml = fs.readFileSync(yamlFile)
        var data = yaml.parse(yml.toString())
    
        fs.writeFileSync(outputFile, template(data))
    }
    exec()
}

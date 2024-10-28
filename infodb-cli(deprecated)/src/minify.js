const posthtml = require('posthtml');
const fs = require('fs')
const resolver = require('./resolver');

const options = {
  removeComments: true, // Disable the module "removeComments"
  collapseWhitespace: 'collapseWhitespace' // Pass options to the module "collapseWhitespace"
};
const posthtmlPlugins = [
  /* other PostHTML plugins */
  require('htmlnano')(options)
];

module.exports.command = (opts) => {
  html = fs.readFileSync(opts.input)
  posthtml(posthtmlPlugins)
    .process(html)
    .then((result) => {
      out = resolver.outpath(opts.input, opts.outputDir)
      fs.writeFileSync(out, result.html)
    })
}

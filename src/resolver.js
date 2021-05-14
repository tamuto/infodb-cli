const path = require('path')

// TODO 階層構造を持つパスには対応していない。
module.exports.outpath = (input, outputDir) => {
  let base = path.basename(input)
  return path.join(outputDir, base)
}

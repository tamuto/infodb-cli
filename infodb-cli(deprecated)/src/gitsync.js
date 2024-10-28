const cp = require('child_process')

module.exports.command = () => {
    cp.exec('git submodule foreach git pull origin master', (err, stdout, stderr) => {
        console.log(stdout)
        console.log(stderr)
    })
}

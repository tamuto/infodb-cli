const cp = require('child_process')

module.exports.command = (cmd, file) => {
    if(cmd == 'start') {
        cp.exec('docker-compose -f ' + file + ' up -d', (err, stdout, stderr) => {
            console.log(stdout)
            console.log(stderr)
        })
    } else {
        cp.exec('docker-compose -f ' + file + ' down', (err, stdout, stderr) => {
            console.log(stdout)
            console.log(stderr)
        })
    }
}

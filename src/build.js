path = require('path')
Parcel = require('@parcel/core/lib/Parcel')


module.exports.command = (options) => {
    async function exec() {
        const bundler = new Parcel._Parcel.Parcel({
            entries: path.join(__dirname, 'src/index.js'),
            defaultConfig: require.resolve('@parcel/config-default'),
            defaultEngines: {
                browsers: ['last 1 Chrome version'],
                node: "10"
            }
        })
        await bundler.run()
    }
    exec()
}

module.exports = {
    entry: './src/app.js',
    devtool: 'inline-source-map',
    mode: 'production',
    output: {
        path: __dirname,
        filename: 'bundle.js'
    },
    module: {},
    node: {
        fs: 'empty'
    }
};

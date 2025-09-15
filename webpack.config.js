module.exports = {
    entry: './src/app.js',
    devtool: 'inline-source-map',
    mode: 'production',
    output: {
        path: __dirname,
        filename: 'bundle.js'
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    node: {
        fs: 'empty'
    }
};

var path = require('path');
var MiniCssExtractPlugin = require('mini-css-extract-plugin');
module.exports = {
    entry: {
        main: './src/main.ts'
    },
    mode: 'development',
    output: {
        path: path.resolve(__dirname, 'public', 'dist'),
        filename: 'js/[name].js'
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader'
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: true
                            // options...
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'css/main.css'
        })
    ]
};
//# sourceMappingURL=webpack.config.js.map
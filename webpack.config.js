const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

// Changes with every build, so browsers fetch the matching worker rather than a cached old one
const BUILD_ID = Date.now().toString(36);

module.exports = {
  entry: {
    main: './src/main.ts',
    processor: './src/processor.ts'
  },
  mode: 'development',
  output: {
    path: path.resolve(__dirname, 'public', 'dist'),
    filename: 'js/[name].js',
    // Lazily loaded code (three.js, geotiff...) lands next to the main bundle. The content hash
    // means a new build never picks up a cached chunk from an older one.
    chunkFilename: 'js/[name].[contenthash:8].js',
    // Remove chunks left over from earlier builds; keep everything else in dist
    clean: {
      keep: (asset) => !/^js\/[^/]+\.[0-9a-f]{8}\.js(\.LICENSE\.txt)?$/.test(asset)
    }
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
        test: /\.s?css$/,
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
      },
      {
        test: /\.html$/i,
        loader: 'html-loader'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      __BUILD__: JSON.stringify(BUILD_ID)
    }),
    new MiniCssExtractPlugin({
      filename: 'css/main.css'
    })
  ]
};

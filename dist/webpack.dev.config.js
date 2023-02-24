var path = require('path');
var merge = require('webpack-merge').merge;
var common = require('./webpack.config.js');
module.exports = merge(common, {
    devtool: 'inline-source-map'
});
//# sourceMappingURL=webpack.dev.config.js.map
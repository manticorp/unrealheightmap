var path = require('path');
var merge = require('webpack-merge').merge;
var common = require('./webpack.config.js');
module.exports = merge(common, {
    mode: 'production'
});
//# sourceMappingURL=webpack.production.config.js.map
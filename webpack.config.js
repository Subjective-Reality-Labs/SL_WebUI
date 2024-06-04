const path = require('path');

module.exports = {
  entry: {
    index: './js/index.js',
    // custom_select: './js/custom_select.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  experiments: {
    topLevelAwait: true
  },
  module: {
    rules: [
      {
        test: /main\.js$/,
        loader: 'string-replace-loader',
        options: {
          search: 'const URL = "http://192.168.2.194"',
          replace: 'const URL = ""',
        }
      }
    ]
  },
};
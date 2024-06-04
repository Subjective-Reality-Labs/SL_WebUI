const path = require('path');

module.exports = {
  entry: {
    main: './js/app/main.js',
    custom_select: './js/custom_select.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  experiments: {
    topLevelAwait: true
  }
};
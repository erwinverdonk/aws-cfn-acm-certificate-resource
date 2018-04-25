const path = require('path');

module.exports = (env) => ({
  entry: './src/index.ts',
  externals: ['aws-sdk'],
  optimization: {
    minimize: env.WEBPACK_MINIMIZE !== 'false'
  },
  target: "node",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  output: {
    libraryTarget: 'commonjs',
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist')
  }
});
'use strict';

const path = require('path');
const webpack = require('webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');


module.exports = (env, argv) => {

  /**@type {import('webpack').Configuration}*/
  const config = {
    target: 'node',
    mode: 'none',

    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      library: {
        type: 'commonjs2',
      },
    },
    devtool: argv.mode === 'development' ? 'eval-cheap-module-source-map' : 'nosources-source-map',
    externals: {
      vscode: 'commonjs vscode'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'thread-loader',
              options: {
                // there should be 1 cpu for the fork-ts-checker-webpack-plugin
                workers: require('os').cpus().length - 1,
              },
            },
            {
              loader: 'ts-loader',
              options: {
                happyPackMode: true
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new webpack.ContextReplacementPlugin(/keyv/),
      new ForkTsCheckerWebpackPlugin({
        async: true,
        typescript: {
          diagnosticOptions: {
            semantic: true,
            syntactic: true,
          },
        },
        eslint: {
          files: ['./src/**/*.{ts,tsx,js,jsx}']
        }
      })
    ],
    cache: {
      type: 'memory',
    },
  };
  return config;
}
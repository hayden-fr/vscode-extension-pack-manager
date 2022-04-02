// @ts-check
"use strict";

const path = require("path");
const FriendlyErrorsWebpackPlugin = require("friendly-errors-webpack-plugin");
const WebpackBar = require("webpackbar");

/**@type {import('webpack').Configuration}*/
const commonConfig = {
  name: "common",
  devtool: "source-map",
  stats: "errors-only",
  resolve: {
    extensions: [".ts", ".js", ".tsx", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /.tsx?$/,
        exclude: /node_modules/,
        use: ["ts-loader"],
      },
      {
        test: /\.less$/,
        use: ["style-loader", "css-loader", "less-loader"],
      },
    ],
  },
  plugins: [
    new FriendlyErrorsWebpackPlugin({ clearConsole: false }),
    // @ts-ignore
    new WebpackBar(),
  ],
};

/**@type {import('webpack').Configuration}*/
const extension = {
  name: "extension",
  target: "node",
  entry: "./src/extension",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
    clean: true,
  },
  externals: {
    vscode: "commonjs vscode",
  },
  ...commonConfig,
};

/**@type {import('webpack').Configuration}*/
const webview = {
  name: "webview",
  target: "web",
  entry: "./src/webview",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "webview.js",
  },
  externals: {
    acquireVsCodeApi: "Window.acquireVsCodeApi",
  },
  ...commonConfig,
};

module.exports = [webview, extension];

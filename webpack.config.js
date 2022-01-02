// @ts-check
"use strict";

const path = require("path");
const FriendlyErrorsWebpackPlugin = require("friendly-errors-webpack-plugin");
const WebpackBar = require("webpackbar");

/**@type {import('webpack').Configuration}*/
const webpackConfig = {
  target: "node",
  entry: { extension: "./src/extension", webview: "./src/webview" },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  externals: {
    vscode: "commonjs vscode",
    acquireVsCodeApi: "Window.acquireVsCodeApi",
  },
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

module.exports = webpackConfig;

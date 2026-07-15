const path = require("node:path");
const { container } = require("webpack");

const { ModuleFederationPlugin } = container;

module.exports = {
  mode: "production",
  context: __dirname,
  entry: {},
  devtool: false,
  experiments: {
    outputModule: true,
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    clean: true,
    filename: "[name].js",
    chunkFilename: "[name].[contenthash].js",
    library: { type: "module" },
    module: true,
    uniqueName: "signalkNearlcrewsUiEsmFixture",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: path.resolve(__dirname, "../../../tsconfig.json"),
            transpileOnly: true,
            compilerOptions: { noEmit: false },
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "signalkNearlcrewsUiEsmFixture",
      filename: "remoteEntry.js",
      library: { type: "module" },
      exposes: {
        "./Panel": path.resolve(__dirname, "../Panel.tsx"),
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: ">=19.0.0 <20.0.0",
          import: false,
        },
      },
    }),
  ],
};

const path = require("node:path");
const { container } = require("webpack");
const { FEDERATION_SHARED } = require("../shared.cjs");

const { ModuleFederationPlugin } = container;
const packageJson = require("../../../package.json");
const moduleName = packageJson.name.replace(/[-@/]/g, "_");

module.exports = {
  mode: "production",
  context: __dirname,
  entry: {},
  devtool: false,
  output: {
    path: path.resolve(__dirname, "dist"),
    clean: true,
    filename: "[name].js",
    chunkFilename: "[name].[contenthash].js",
    library: { type: "var", name: moduleName },
    uniqueName: "signalkNearlcrewsUiClassicFixture",
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
      name: moduleName,
      filename: "remoteEntry.js",
      library: { type: "var", name: moduleName },
      exposes: {
        "./PluginConfigurationPanel": path.resolve(
          __dirname,
          "../PluginConfigurationPanel.tsx",
        ),
      },
      shared: FEDERATION_SHARED,
    }),
  ],
};

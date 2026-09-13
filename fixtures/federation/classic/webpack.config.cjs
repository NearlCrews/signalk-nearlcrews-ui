const path = require("node:path");
const { container } = require("webpack");
// Resolved through this package's own exports map (Node package
// self-reference), which is exactly the specifier a consumer writes.
const { shared } = require("signalk-nearlcrews-ui/federation");

const { ModuleFederationPlugin } = container;
// The fixture stands in for a consumer plugin and has no manifest of its own,
// so it derives its container name from this package. A real plugin derives it
// from its OWN package name with the same replacement, which is what
// docs/migration.md and README.md tell it to do and what
// tests/unit/panel-runtime.test.mjs covers. Do not copy this line verbatim.
const packageJson = require("signalk-nearlcrews-ui/package.json");
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
      shared,
    }),
  ],
};

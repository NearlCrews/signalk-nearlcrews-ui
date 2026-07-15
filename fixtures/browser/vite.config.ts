import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const federationRoots = {
  classic: resolve(repositoryRoot, "fixtures/federation/classic/dist"),
  esm: resolve(repositoryRoot, "fixtures/federation/esm/dist"),
} as const;

function federationAssetServer(): Plugin {
  return {
    name: "federation-asset-server",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost")
          .pathname;
        const match =
          /^\/federation-assets\/(classic|esm)\/([a-zA-Z0-9._-]+)$/.exec(
            pathname,
          );
        if (match === null) {
          next();
          return;
        }

        const [, format, filename] = match;
        if ((format !== "classic" && format !== "esm") || !filename) {
          next();
          return;
        }

        try {
          const source = readFileSync(
            resolve(federationRoots[format], filename),
          );
          response.statusCode = 200;
          response.setHeader("Cache-Control", "no-store");
          response.setHeader("Content-Type", "text/javascript; charset=utf-8");
          response.end(source);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig({
  root: import.meta.dirname,
  plugins: [federationAssetServer(), react()],
  resolve: {
    alias: {
      "signalk-nearlcrews-ui": resolve(repositoryRoot, "dist/index.js"),
    },
  },
  define: {
    __CLASSIC_REMOTE_URL__: JSON.stringify(
      "/federation-assets/classic/remoteEntry.js",
    ),
    __ESM_REMOTE_URL__: JSON.stringify("/federation-assets/esm/remoteEntry.js"),
  },
  server: {
    fs: {
      allow: [repositoryRoot],
    },
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});

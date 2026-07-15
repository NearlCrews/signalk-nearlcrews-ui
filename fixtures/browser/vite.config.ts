import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const federationRoots = {
  classic: resolve(repositoryRoot, "fixtures/federation/classic/dist"),
  esm: resolve(repositoryRoot, "fixtures/federation/esm/dist"),
} as const;

const CSP_FIXTURE_NONCE = "snui-csp-fixture";
const CSP_FIXTURE_MODULE_ID = "/csp-fixture.tsx";
const RESOLVED_CSP_FIXTURE_MODULE_ID = `\0${CSP_FIXTURE_MODULE_ID}`;

function cspFixtureServer(): Plugin {
  return {
    name: "csp-fixture-server",
    resolveId(id) {
      if (id === CSP_FIXTURE_MODULE_ID) {
        return RESOLVED_CSP_FIXTURE_MODULE_ID;
      }
      return undefined;
    },
    load(id) {
      if (id !== RESOLVED_CSP_FIXTURE_MODULE_ID) return undefined;

      return `
        import { createElement } from "react";
        import { createRoot } from "react-dom/client";
        import { Button, PanelRoot } from "signalk-nearlcrews-ui";

        const mode = new URLSearchParams(window.location.search).get("mode");
        const styleNonce =
          mode === "matching"
            ? ${JSON.stringify(CSP_FIXTURE_NONCE)}
            : mode === "wrong"
              ? "wrong-nonce"
              : undefined;
        const root = document.querySelector("#root");

        if (!(root instanceof HTMLElement)) {
          throw new Error("Missing CSP fixture root.");
        }

        createRoot(root).render(
          createElement(
            PanelRoot,
            { styleNonce },
            createElement(Button, { variant: "primary" }, "CSP target"),
          ),
        );
      `;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost")
          .pathname;
        if (pathname !== "/csp.html") {
          next();
          return;
        }

        void server
          .transformIndexHtml(
            pathname,
            `<!doctype html>
              <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Signal K NearlCrews UI CSP fixture</title>
                </head>
                <body>
                  <div id="root"></div>
                  <script type="module" src="${CSP_FIXTURE_MODULE_ID}"></script>
                </body>
              </html>`,
          )
          .then((html) => {
            response.statusCode = 200;
            response.setHeader("Cache-Control", "no-store");
            response.setHeader(
              "Content-Security-Policy",
              [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                `style-src 'nonce-${CSP_FIXTURE_NONCE}'`,
                "connect-src 'self' ws:",
                "img-src 'self' data:",
                "object-src 'none'",
                "base-uri 'none'",
              ].join("; "),
            );
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            response.end(html);
          })
          .catch(next);
      });
    },
  };
}

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
  plugins: [cspFixtureServer(), federationAssetServer(), react()],
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

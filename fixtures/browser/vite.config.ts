import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { BROWSER_HOST, BROWSER_PORT } from "./browser-server.js";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const federationRoots = {
  classic: resolve(repositoryRoot, "fixtures/federation/classic/dist"),
  esm: resolve(repositoryRoot, "fixtures/federation/esm/dist"),
} as const;

interface PackageAlias {
  readonly find: string;
  readonly replacement: string;
}

/**
 * The package's own entry points, aliased to the built files, derived from the
 * exports map so a new entry point reaches the browser fixtures without an
 * edit here. Vite matches a string alias by prefix, so the bare package name
 * resolves last: ahead of the subpaths it would swallow every one of them.
 */
function packageEntryAliases(): PackageAlias[] {
  const manifest = JSON.parse(
    readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
  ) as {
    readonly exports: Readonly<Record<string, unknown>>;
    readonly name: string;
  };

  const subpathAliases: PackageAlias[] = [];
  let rootAlias: PackageAlias | undefined;
  for (const [subpath, declaration] of Object.entries(manifest.exports)) {
    const target =
      typeof declaration === "object" &&
      declaration !== null &&
      "import" in declaration
        ? (declaration as { readonly import?: unknown }).import
        : undefined;
    if (typeof target !== "string" || !target.endsWith(".js")) continue;

    const replacement = resolve(repositoryRoot, target);
    if (subpath === ".") {
      rootAlias = { find: manifest.name, replacement };
      continue;
    }
    subpathAliases.push({
      find: `${manifest.name}/${subpath.replace(/^\.\//, "")}`,
      replacement,
    });
  }

  if (rootAlias === undefined) {
    throw new Error("package.json declares no root JavaScript export.");
  }
  return [...subpathAliases, rootAlias];
}

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
        import { Progress } from "signalk-nearlcrews-ui/composites";

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
            createElement(Progress, { label: "CSP progress", value: 50 }),
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
                // Only the fallback for the two directives below, and every
                // browser under test implements both, so this governs nothing
                // here. It stays for a host that implements neither.
                "style-src 'none'",
                `style-src-elem 'nonce-${CSP_FIXTURE_NONCE}'`,
                "style-src-attr 'unsafe-inline'",
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
    alias: packageEntryAliases(),
  },
  define: {
    __CLASSIC_REMOTE_URL__: JSON.stringify(
      "/federation-assets/classic/remoteEntry.js",
    ),
    __ESM_REMOTE_URL__: JSON.stringify("/federation-assets/esm/remoteEntry.js"),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        showcase: resolve(import.meta.dirname, "showcase.html"),
      },
    },
  },
  server: {
    fs: {
      allow: [repositoryRoot],
    },
    host: BROWSER_HOST,
    port: BROWSER_PORT,
    strictPort: true,
  },
});

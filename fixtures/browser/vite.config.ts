import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import {
  BROWSER_HOST,
  BROWSER_PORT,
  CSP_FIXTURE_NONCE,
  CSP_FIXTURE_PATH,
  CSP_WRONG_NONCE,
} from "./browser-server.js";

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

/** The path a request asks for, without its query. */
function requestPathname(request: {
  readonly url?: string | undefined;
}): string {
  return new URL(request.url ?? "/", "http://localhost").pathname;
}

/**
 * Serves the CSP fixture page under a policy that admits one style nonce.
 * The page is an ordinary one, so the middleware sets the header and hands
 * the request on, and the page's panel is what has to carry the nonce.
 */
function cspFixtureHeader(): Plugin {
  return {
    name: "csp-fixture-header",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (requestPathname(request) === CSP_FIXTURE_PATH) {
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
        }
        next();
      });
    },
  };
}

function federationAssetServer(): Plugin {
  return {
    name: "federation-asset-server",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const match =
          /^\/federation-assets\/(classic|esm)\/([a-zA-Z0-9._-]+)$/.exec(
            requestPathname(request),
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
  plugins: [cspFixtureHeader(), federationAssetServer(), react()],
  resolve: {
    alias: packageEntryAliases(),
  },
  define: {
    __CLASSIC_REMOTE_URL__: JSON.stringify(
      "/federation-assets/classic/remoteEntry.js",
    ),
    __CSP_FIXTURE_NONCE__: JSON.stringify(CSP_FIXTURE_NONCE),
    __CSP_WRONG_NONCE__: JSON.stringify(CSP_WRONG_NONCE),
    __ESM_REMOTE_URL__: JSON.stringify("/federation-assets/esm/remoteEntry.js"),
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

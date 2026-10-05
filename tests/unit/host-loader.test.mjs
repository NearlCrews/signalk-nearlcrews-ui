import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import {
  compareLoaderHashes,
  extractSnippet,
  hashSnippet,
  LOADER_FACTS,
  latestSignalKReleaseTag,
  readLoaderSources,
} from "../../scripts/lib/host-loader.mjs";
import { repositoryPath } from "../../scripts/lib/paths.mjs";
import { runNode } from "./lib/run-node.mjs";
import { removeTemporaryTrees, temporaryTree } from "./lib/temporary-tree.mjs";

const SCRIPT = repositoryPath("scripts", "check-host-loader.mjs");

/** A cut-down Admin loader holding each watched snippet. */
const DYNAMIC_UTILITIES = `let cachedShareScope = null

const getShareScope = (): ShareScope => {
  if (cachedShareScope) {
    return cachedShareScope
  }
  // Webpack's fallback scope: react and react-dom only.
  cachedShareScope = { react: {}, 'react-dom': {} }
  return cachedShareScope
}

const findRemoteEntryScript = (moduleName: string) => {
  const scripts = document.querySelectorAll('script[src$="/remoteEntry.js"]')
  return scripts[0] ?? null
}

export const toLazyDynamicComponent = (moduleName: string) =>
  React.lazy(async () => {
    if (remoteEntryScript) {
      if (remoteEntryScript.type === 'module') {
        const esmModule = await import(url)
        container = esmModule
      } else {
        await loadScriptOnce(url, () => window[safeId] !== undefined)
      }
    }
    return container
  })

export const toSafeModuleId = (moduleName: string): string =>
  moduleName.replace(/[-@/]/g, '_')

export const APP_PANEL = './AppPanel'
`;

const SERVER_ROUTES = `function serveIndexWithAddonScripts(indexPath, res) {
  res.send(
    indexContent.toString().replace(
      /%ADDONSCRIPTS%/g,
      addonScripts
        .map((moduleInfo) =>
          moduleInfo.type === 'module'
            ? \`<script type="module" src="/\${moduleInfo.name}/remoteEntry.js"></script>\`
            : \`<script src="/\${moduleInfo.name}/remoteEntry.js"></script>\`
        )
        .join('\\n')
    )
  )
}
`;

const WEBAPPS = `function mountWebModules(app: WebappsApp, keyword: string): NpmPackageData[] {
  const modules = modulesWithKeyword(app.config, keyword)
  modules.forEach((moduleData) => {
    let webappPath = path.join(moduleData.location, moduleData.module)
    if (fs.existsSync(webappPath + '/public/')) {
      webappPath += '/public/'
    }
  })
  return modules
}

function mountApis(app) {}
`;

const EMBEDDED_FORM = `import { useState } from 'react'

export default function EmbeddedPluginConfigurationForm({
  plugin,
  saveData
}: EmbeddedPluginConfigurationFormProps) {
  const [configuration, setConfiguration] = useState<unknown>(
    plugin.data.configuration
  )
  return null
}
`;

const FACT_NAMES = LOADER_FACTS.map(({ name }) => name).sort();

const SOURCES = {
  "packages/server-admin-ui/src/views/Configuration/EmbeddedPluginConfigurationForm.tsx":
    EMBEDDED_FORM,
  "packages/server-admin-ui/src/views/Webapps/dynamicutilities.ts":
    DYNAMIC_UTILITIES,
  "src/interfaces/webapps.ts": WEBAPPS,
  "src/serverroutes.ts": SERVER_ROUTES,
};

function checkout(files = SOURCES) {
  return temporaryTree("snui-loader-", files);
}

function runScript(...args) {
  return runNode(SCRIPT, ...args);
}

afterAll(removeTemporaryTrees);

describe("extracting a watched snippet", () => {
  it("takes a declaration through its balanced body", () => {
    expect(
      extractSnippet(DYNAMIC_UTILITIES, { anchor: "const getShareScope =" }),
    ).toBe(`const getShareScope = (): ShareScope => {
  if (cachedShareScope) {
    return cachedShareScope
  }
  // Webpack's fallback scope: react and react-dom only.
  cachedShareScope = { react: {}, 'react-dom': {} }
  return cachedShareScope
}`);
  });

  it("takes an expression body to the blank line after it", () => {
    expect(
      extractSnippet(DYNAMIC_UTILITIES, {
        anchor: "export const toSafeModuleId =",
      }),
    ).toBe(`export const toSafeModuleId = (moduleName: string): string =>
  moduleName.replace(/[-@/]/g, '_')`);
  });

  it("takes a branch until the block around it closes", () => {
    expect(
      extractSnippet(DYNAMIC_UTILITIES, {
        anchor: "if (remoteEntryScript.type === 'module')",
      }),
    ).toBe(`if (remoteEntryScript.type === 'module') {
        const esmModule = await import(url)
        container = esmModule
      } else {
        await loadScriptOnce(url, () => window[safeId] !== undefined)
      }`);
  });

  it("widens to the call that holds the anchor, template strings included", () => {
    const snippet = extractSnippet(SERVER_ROUTES, {
      anchor: "/%ADDONSCRIPTS%/g",
      enclosingCall: ".replace(",
    });

    expect(snippet.startsWith(".replace(\n      /%ADDONSCRIPTS%/g")).toBe(true);
    expect(snippet.endsWith(".join('\\n')\n    )")).toBe(true);
  });

  it("names a snippet it cannot find", () => {
    expect(() =>
      extractSnippet("const other = 1", { anchor: "const getShareScope =" }),
    ).toThrow("const getShareScope =");
  });
});

describe("hashing and comparing", () => {
  it("hashes whitespace-insensitively and nothing else", () => {
    expect(hashSnippet("a  =\n  b")).toBe(hashSnippet("a = b"));
    expect(hashSnippet("a = b")).not.toBe(hashSnippet("a = c"));
    expect(hashSnippet("a = b")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reads every watched fact from a checkout", async () => {
    const hashes = await readLoaderSources({ source: checkout() });

    expect(Object.keys(hashes).sort()).toEqual(FACT_NAMES);
  });

  it("lists the facts whose hash moved", () => {
    expect(compareLoaderHashes({ a: "1", b: "2" }, { a: "1", b: "3" })).toEqual(
      ["b"],
    );
    expect(compareLoaderHashes({ a: "1" }, { a: "1", c: "4" })).toEqual(["c"]);
  });
});

describe("finding the latest release", () => {
  it("asks GitHub for the latest release, with a token when one is set", async () => {
    const requests = [];
    const fetchJson = async (url, init) => {
      requests.push({ init, url });
      return { tag_name: "v2.33.0" };
    };

    await expect(
      latestSignalKReleaseTag({ fetchJson, token: "t" }),
    ).resolves.toBe("v2.33.0");
    expect(requests[0].url).toBe(
      "https://api.github.com/repos/SignalK/signalk-server/releases/latest",
    );
    expect(requests[0].init.headers.Authorization).toBe("Bearer t");
    await expect(
      latestSignalKReleaseTag({ fetchJson: async () => ({}) }),
    ).rejects.toThrow("no tag_name");
  });
});

describe("check-host-loader", () => {
  it("records a baseline, passes against it, and fails when a fact moves", () => {
    const source = checkout();
    const baseline = join(source, "baseline.json");

    const update = runScript(
      "--source",
      source,
      "--baseline",
      baseline,
      "--update",
    );
    expect(update.status, update.stderr).toBe(0);
    const recorded = JSON.parse(readFileSync(baseline, "utf8"));
    expect(recorded.tag).toBe("local checkout");
    expect(Object.keys(recorded.hashes).sort()).toEqual(FACT_NAMES);

    const same = runScript("--source", source, "--baseline", baseline);
    expect(same.status, same.stderr).toBe(0);
    expect(same.stdout).toContain("unchanged");

    const moved = checkout({
      ...SOURCES,
      "packages/server-admin-ui/src/views/Webapps/dynamicutilities.ts":
        DYNAMIC_UTILITIES.replace("/[-@/]/g", "/[-@/.]/g"),
    });
    const result = runScript("--source", moved, "--baseline", baseline);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("toSafeModuleId");
    expect(result.stderr).toContain("npm run host-contract:loader:update");
  });

  it("refuses an option it does not take", () => {
    const result = runScript("--sources", "x");

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--sources is not an option");
  });
});

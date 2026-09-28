/**
 * The Signal K server code this package and its consumers build on, watched by
 * content hash.
 *
 * The share map, the consumer check's loading rules, and the host harness all
 * rest on a handful of functions in two server files and two Admin files. The
 * npm inventory recorded in tests/host-contract.baseline.json does not move
 * when they do: the loader changed its share behavior in 2.26 with no
 * inventory change at all. So each function is hashed, and a moved hash asks a
 * reviewer to recheck the facts listed beside it and record the new hashes.
 *
 * A hash compares the code with its whitespace collapsed, so a change of
 * indentation does not move it and any change of token does. That is
 * deliberately blunt: a semantic reading of TypeScript would need a parser
 * this repository does not carry, and a notice that turns out harmless costs
 * one review.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { latestReleaseTag } from "./github-releases.mjs";

export const SIGNALK_REPOSITORY = "SignalK/signalk-server";

const DYNAMIC_UTILITIES =
  "packages/server-admin-ui/src/views/Webapps/dynamicutilities.ts";
const EMBEDDED_FORM =
  "packages/server-admin-ui/src/views/Configuration/EmbeddedPluginConfigurationForm.tsx";
const SERVER_ROUTES = "src/serverroutes.ts";
const WEBAPPS = "src/interfaces/webapps.ts";

/**
 * Each watched snippet: the file it lives in, the text it starts at (or the
 * call around that text), and the facts that depend on it.
 */
export const LOADER_FACTS = Object.freeze([
  {
    anchor: "const getShareScope =",
    facts:
      "the fallback share scope names exactly react and react-dom, each keyed by the module's own version, from adminUI, eager, loaded, and a singleton with a caret requiredVersion (the federation share map, createHostShareScope, and hostNotes)",
    file: DYNAMIC_UTILITIES,
    name: "getShareScope",
  },
  {
    anchor: "if (remoteEntryScript.type === 'module')",
    facts:
      "a module script tag is imported and its get and init exports are the container, and a classic tag is awaited and its window global read (snui-check-consumer's remote format rule and loadPanelRemote)",
    file: DYNAMIC_UTILITIES,
    name: "toLazyDynamicComponent script type branch",
  },
  {
    anchor: "export const toSafeModuleId =",
    facts:
      "a classic container's global is the package name with -, @, and / replaced by underscores (the default --container)",
    file: DYNAMIC_UTILITIES,
    name: "toSafeModuleId",
  },
  {
    anchor: "const findRemoteEntryScript =",
    facts:
      "the loader finds a remote only through a script whose src ends in /remoteEntry.js (the public/remoteEntry.js location rule)",
    file: DYNAMIC_UTILITIES,
    name: "findRemoteEntryScript",
  },
  {
    anchor: "/%ADDONSCRIPTS%/g",
    enclosingCall: ".replace(",
    facts:
      'the server writes <script type="module"> for a package whose type is "module" and a classic tag otherwise, into every Admin page (the remote format rule and the remote entry size check)',
    file: SERVER_ROUTES,
    name: "%ADDONSCRIPTS% replacement",
  },
  {
    anchor: "function mountWebModules(",
    facts:
      "a package is mounted by its keyword and served from its public/ directory when one exists (the configurator keyword and location rules)",
    file: WEBAPPS,
    name: "mountWebModules",
  },
  {
    anchor: "export default function EmbeddedPluginConfigurationForm(",
    facts:
      "the panel receives configuration seeded from plugin.data.configuration and a save that replaces it (the host states --runtime renders and HostPanelFrame)",
    file: EMBEDDED_FORM,
    name: "EmbeddedPluginConfigurationForm",
  },
]);

const OPENING = new Set(["(", "[", "{"]);
const CLOSING = new Set([")", "]", "}"]);

/**
 * The index just past a string or comment starting at `index`, or undefined
 * when none starts there. Template strings are skipped with their `${}`
 * substitutions, which may hold strings of their own.
 */
function skipLiteral(source, index) {
  const character = source[index];
  if (character === "/" && source[index + 1] === "/") {
    const end = source.indexOf("\n", index);
    return end === -1 ? source.length : end;
  }
  if (character === "/" && source[index + 1] === "*") {
    const end = source.indexOf("*/", index + 2);
    return end === -1 ? source.length : end + 2;
  }
  if (character === "'" || character === '"') {
    let position = index + 1;
    while (position < source.length && source[position] !== character) {
      position += source[position] === "\\" ? 2 : 1;
    }
    return position + 1;
  }
  if (character === "`") {
    let position = index + 1;
    while (position < source.length && source[position] !== "`") {
      if (source[position] === "\\") {
        position += 2;
      } else if (source[position] === "$" && source[position + 1] === "{") {
        position = skipBalanced(source, position + 1);
      } else {
        position += 1;
      }
    }
    return position + 1;
  }
  return undefined;
}

/** The index just past the bracket group opening at `index`. */
function skipBalanced(source, index) {
  let depth = 0;
  let position = index;
  while (position < source.length) {
    const skipped = skipLiteral(source, position);
    if (skipped !== undefined) {
      position = skipped;
      continue;
    }
    const character = source[position];
    if (OPENING.has(character)) depth += 1;
    else if (CLOSING.has(character)) {
      depth -= 1;
      if (depth === 0) return position + 1;
    }
    position += 1;
  }
  return source.length;
}

/**
 * The snippet a fact names: from its anchor (or from the call enclosing the
 * anchor) to the first semicolon or blank line outside any bracket, or to the
 * bracket that closes a block the snippet did not open.
 */
export function extractSnippet(source, { anchor, enclosingCall }) {
  const found = source.indexOf(anchor);
  if (found === -1) {
    throw new Error(`The source no longer contains ${anchor}.`);
  }
  const start =
    enclosingCall === undefined
      ? found
      : source.lastIndexOf(enclosingCall, found);
  if (start === -1) {
    throw new Error(`No ${enclosingCall} call encloses ${anchor}.`);
  }

  let depth = 0;
  let position = start;
  while (position < source.length) {
    const skipped = skipLiteral(source, position);
    if (skipped !== undefined) {
      position = skipped;
      continue;
    }
    const character = source[position];
    if (OPENING.has(character)) {
      depth += 1;
    } else if (CLOSING.has(character)) {
      depth -= 1;
      if (depth < 0) break;
    } else if (depth === 0 && character === ";") {
      break;
    } else if (
      depth === 0 &&
      /^\n[ \t]*\n/.test(source.slice(position, position + 80))
    ) {
      break;
    }
    position += 1;
  }
  return source.slice(start, position).trimEnd();
}

/** A snippet's hash with its whitespace collapsed. */
export function hashSnippet(snippet) {
  return createHash("sha256")
    .update(snippet.replaceAll(/\s+/g, " ").trim())
    .digest("hex");
}

/**
 * Reads every watched file and hashes each fact. `source` is a local checkout;
 * otherwise `fetchText` reads each file at `tag` from the repository.
 */
export async function readLoaderSources({ fetchText, source, tag }) {
  const files = [...new Set(LOADER_FACTS.map(({ file }) => file))];
  const texts = new Map(
    await Promise.all(
      files.map(async (file) => [
        file,
        source === undefined
          ? await fetchText(
              `https://raw.githubusercontent.com/${SIGNALK_REPOSITORY}/${tag}/${file}`,
            )
          : await readFile(join(source, file), "utf8"),
      ]),
    ),
  );
  return Object.fromEntries(
    LOADER_FACTS.map((fact) => {
      try {
        return [
          fact.name,
          hashSnippet(extractSnippet(texts.get(fact.file), fact)),
        ];
      } catch (cause) {
        throw new Error(
          `${fact.name} could not be read from ${fact.file}: ${cause.message} Recheck what depends on it: ${fact.facts}.`,
          { cause },
        );
      }
    }),
  );
}

/** The names of the facts whose hash differs from the recorded one. */
export function compareLoaderHashes(recorded, current) {
  return Object.keys(current).filter(
    (name) => recorded[name] !== current[name],
  );
}

/**
 * The tag of the Signal K server's latest release, as GitHub marks it. A
 * plain highest-version tag would be wrong here: the repository carries a
 * stray v6.6.6 tag that no release uses.
 */
export function latestSignalKReleaseTag({ fetchJson, token }) {
  return latestReleaseTag(SIGNALK_REPOSITORY, { fetchJson, token });
}

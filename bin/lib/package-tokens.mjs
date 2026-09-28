/**
 * Checks the stylesheets a built remote ships for references to this
 * package's custom properties and container name that no longer mean
 * anything. A misspelled token, or one a CSS modules pipeline renamed, fails
 * silently in the browser: the property takes its inherited or initial value,
 * and the panel renders without its theme in Dark and Night with no error
 * anywhere.
 *
 * Only CSS assets are read. The JavaScript chunks carry this package's own
 * style strings, whose internal custom properties are not part of what a
 * consumer may reference, so a scan over them would report the library
 * against itself.
 */
import { readCss } from "./css-source.mjs";

/**
 * Custom properties the package reads with a `var()` fallback, or sets for a
 * consumer to read, and documents as consumer hooks rather than listing among
 * the foundation tokens. The API reference names each one; a unit test holds
 * this list to it.
 */
export const CONSUMER_HOOK_NAMES = Object.freeze([
  "--snui-data-grid-column-min",
  "--snui-data-grid-max-block-size",
  "--snui-sticky-clearance",
  "--snui-table-cell-min",
]);

/**
 * The container name `PanelRoot` sets, which a consumer's `@container` query
 * names to size against the panel. The package exports the same value as
 * `PANEL_CONTAINER_NAME`; a unit test holds the two together.
 */
export const PANEL_CONTAINER_NAME = "snui-panel";

/** The package's own prefix, which every public name carries. */
const PREFIX = "snui-";

/**
 * Prefixes that may precede the package prefix without renaming anything: a
 * custom property's two dashes and a data attribute's `data-`.
 */
const LEGITIMATE_PREFIXES = new Set(["", "--", "data-"]);

/** An identifier character, for walking out from an occurrence of the prefix. */
const IDENTIFIER_CHARACTER = /[\w-]/;

/** The custom properties a token stylesheet declares. */
export function declaredTokenNames(tokenStylesheet) {
  return new Set(
    readCss(tokenStylesheet)
      .declarations.map(({ property }) => property)
      .filter((property) => property.startsWith(`--${PREFIX}`)),
  );
}

/** Every identifier in the text that contains the package prefix, split around it. */
function prefixedIdentifiers(text) {
  const identifiers = [];
  let from = 0;
  for (;;) {
    const found = text.indexOf(PREFIX, from);
    if (found === -1) return identifiers;
    let start = found;
    while (start > 0 && IDENTIFIER_CHARACTER.test(text[start - 1])) start -= 1;
    let end = found + PREFIX.length;
    while (end < text.length && IDENTIFIER_CHARACTER.test(text[end])) end += 1;
    identifiers.push({
      identifier: text.slice(start, end),
      prefix: text.slice(start, found),
      rest: text.slice(found, end),
    });
    from = end;
  }
}

/** The container name an `@container` prelude opens with, if any. */
function containerNameOf(prelude) {
  const name = /^([A-Za-z_-][\w-]*)/.exec(prelude)?.[1];
  // `not`, `style()`, and a bare condition carry no name.
  return name === undefined || name === "not" ? undefined : name;
}

/**
 * The problems in one stylesheet, as sentences. `allowedNames` holds every
 * custom property a consumer may reference or set: the installed release's
 * public tokens and the documented consumer hooks.
 */
export function findTokenProblems(source, allowedNames) {
  const { atRules, declarations, rules } = readCss(source);
  const problems = new Set();

  // The package names a rename can start from, without their dashes, longest
  // first so a suffix is measured from the fullest name that matches.
  const knownNames = [
    ...[...allowedNames].map((name) => name.replace(/^--/, "")),
    PANEL_CONTAINER_NAME,
  ].sort((first, second) => second.length - first.length);
  // The package name a renamed identifier was made from: the text after the
  // prefix is that name, alone or followed by a hash after a - or _.
  const renamedFrom = (rest) =>
    knownNames.find(
      (name) =>
        rest === name ||
        rest.startsWith(`${name}-`) ||
        rest.startsWith(`${name}_`),
    );
  const renamed = new Set();
  const texts = [
    ...rules.flatMap(({ selectors }) => selectors),
    ...atRules.map(({ prelude }) => prelude),
    ...declarations.flatMap(({ property, value }) => [property, value]),
  ];
  for (const text of texts) {
    for (const { identifier, prefix, rest } of prefixedIdentifiers(text)) {
      if (LEGITIMATE_PREFIXES.has(prefix)) continue;
      const original = renamedFrom(rest);
      if (original === undefined) continue;
      renamed.add(identifier);
      problems.add(
        `${identifier} is a renamed form of the package's ${original}. A CSS modules pipeline renamed it, so it no longer matches anything the package declares; switch off identifier renaming for the package's names.`,
      );
    }
  }

  for (const { value } of declarations) {
    for (const match of value.matchAll(/var\(\s*(--snui-[\w-]*)/g)) {
      if (!allowedNames.has(match[1])) {
        problems.add(
          `var(${match[1]}) names no public token or documented consumer hook, so the property silently takes its fallback, inherited, or initial value.`,
        );
      }
    }
  }
  for (const { property } of declarations) {
    if (property.startsWith(`--${PREFIX}`) && !allowedNames.has(property)) {
      problems.add(
        `${property} is set, but it is no public token or documented consumer hook, so nothing in the package reads it.`,
      );
    }
  }

  for (const { name, prelude } of atRules) {
    if (name !== "container") continue;
    const container = containerNameOf(prelude);
    // A renamed container name is reported above, as a rename.
    if (
      container?.includes(PREFIX) === true &&
      container !== PANEL_CONTAINER_NAME &&
      !renamed.has(container)
    ) {
      problems.add(
        `@container ${container} names no container. The panel container is named exactly ${PANEL_CONTAINER_NAME}.`,
      );
    }
  }
  return [...problems];
}

/**
 * Asserts every stylesheet references only names the installed release
 * declares. `files` are the CSS assets as name and source pairs.
 */
export function assertPackageTokens(files, allowedNames) {
  const problems = files.flatMap(({ name, source }) =>
    findTokenProblems(source, allowedNames).map(
      (problem) => `${name}: ${problem}`,
    ),
  );
  if (problems.length > 0) {
    throw new Error(
      `The built remote's CSS references package names the installed release does not declare:\n${problems.join("\n")}`,
    );
  }
}

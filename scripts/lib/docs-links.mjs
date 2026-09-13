/**
 * Reads the headings and the local link destinations of a Markdown document.
 *
 * The rules live here rather than in the checking script so a unit test can
 * exercise them without the script's own repository-wide crawl running as a
 * side effect of the import.
 */
import { prose, withoutInlineCode } from "./markdown.mjs";

const HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

const INLINE_LINK =
  /(!?)\[[^\]]*\]\(\s*<?([^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;

const REFERENCE_DEFINITION = /^\s*\[[^\]]+\]:\s*<?([^\s>]+)>?/g;

function stripHtmlTags(text) {
  let result = "";
  let insideTag = false;

  for (const character of text) {
    if (character === "<") {
      insideTag = true;
      continue;
    }
    if (character === ">" && insideTag) {
      insideTag = false;
      continue;
    }
    if (!insideTag) result += character;
  }

  return result;
}

export function githubSlug(text) {
  return stripHtmlTags(text)
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

/** Every anchor a heading in the document creates, deduplicated as GitHub does. */
export function markdownAnchors(markdown) {
  const anchors = new Set();
  const counts = new Map();

  for (const { text } of prose(markdown)) {
    const heading = HEADING.exec(text)?.[1];
    if (heading === undefined) continue;

    const base = githubSlug(heading);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}

function isLocal(destination) {
  return (
    destination !== undefined &&
    !destination.startsWith("//") &&
    !/^[a-z][a-z\d+.-]*:/i.test(destination)
  );
}

/**
 * Repository-local link destinations, with the line each one sits on and
 * whether it is an image target. Readers that care about the Signal K App
 * Store need the distinction: it rewrites image paths and nothing else.
 */
export function localDestinations(markdown) {
  const destinations = [];

  for (const { number, text } of prose(markdown)) {
    const line = withoutInlineCode(text);

    for (const [, bang, destination] of line.matchAll(INLINE_LINK)) {
      if (!isLocal(destination)) continue;
      destinations.push({ destination, image: bang === "!", line: number });
    }
    for (const [, destination] of line.matchAll(REFERENCE_DEFINITION)) {
      if (!isLocal(destination)) continue;
      destinations.push({ destination, image: false, line: number });
    }
  }

  return destinations;
}

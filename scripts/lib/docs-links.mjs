/**
 * Reads the headings and the local link destinations of a Markdown document.
 *
 * The rules live here rather than in the checking script so a unit test can
 * exercise them without the script's own repository-wide crawl running as a
 * side effect of the import.
 */
import { headingText, prose, withoutInlineCode } from "./markdown.mjs";

const DESTINATION = String.raw`\(\s*<?([^\s)>]+)>?(?:\s+["'][^"']*["'])?\s*\)`;

const INLINE_LINK = new RegExp(String.raw`(!?)\[[^\]]*\]${DESTINATION}`, "g");

// A badge-style image inside a link, [![alt](image)](href). The generic
// pattern would end the link text at the image's own bracket and never see the
// outer destination, so this shape is read first and removed from the line.
const LINKED_IMAGE = new RegExp(
  String.raw`\[!\[[^\]]*\]${DESTINATION}\]${DESTINATION}`,
  "g",
);

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
  return (
    stripHtmlTags(text)
      .trim()
      .toLowerCase()
      // Emphasis markers disappear from the rendered heading GitHub slugs, but
      // an underscore inside a word is text and stays in the anchor.
      .replace(/(^|[\s(])_+([^_]+?)_+(?=$|[\s).,:;!?])/g, "$1$2")
      .replace(/[`*~]/g, "")
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s+/g, "-")
  );
}

/** Every anchor a heading in the document creates, deduplicated as GitHub does. */
export function markdownAnchors(markdown) {
  const anchors = new Set();
  const counts = new Map();

  for (const { text } of prose(markdown)) {
    const heading = headingText(text);
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
 * A local destination's decoded path, without its query, and decoded fragment,
 * each empty when absent. Answers undefined when either half carries a
 * malformed percent-escape, so the caller reports that one link rather than
 * the whole check failing on the URIError decodeURIComponent throws.
 */
export function splitDestination(destination) {
  const [pathWithQuery, rawFragment = ""] = destination.split("#", 2);
  const [rawPath] = pathWithQuery.split("?", 1);
  try {
    return {
      fragment: decodeURIComponent(rawFragment),
      path: decodeURIComponent(rawPath),
    };
  } catch (error) {
    if (error instanceof URIError) return undefined;
    throw error;
  }
}

/**
 * Repository-local link destinations, with the line each one sits on and
 * whether it is an image target. Readers that care about the Signal K App
 * Store need the distinction: it rewrites image paths and nothing else.
 */
export function localDestinations(markdown) {
  const destinations = [];

  for (const { number, text } of prose(markdown)) {
    let line = withoutInlineCode(text);

    for (const [, image, href] of line.matchAll(LINKED_IMAGE)) {
      if (isLocal(image)) {
        destinations.push({ destination: image, image: true, line: number });
      }
      if (isLocal(href)) {
        destinations.push({ destination: href, image: false, line: number });
      }
    }
    line = line.replace(LINKED_IMAGE, "");

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

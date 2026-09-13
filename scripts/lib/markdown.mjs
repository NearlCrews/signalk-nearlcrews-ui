/**
 * Reads Markdown as prose: the lines outside fenced code blocks.
 *
 * Every reader that looks for headings or links has to skip fenced examples,
 * and each one that rolled its own toggle also treated a backtick fence and a
 * tilde fence as the same kind, so a ``` line inside a ~~~ block ended the
 * block early. Tracking the character that opened the block keeps a fence of
 * one kind from closing a block of the other.
 */
const FENCE = /^\s*(?<marker>`{3,}|~{3,})/;

const INLINE_CODE = /`[^`]*`/g;

/** Yields `{ number, text }` for each line outside a fenced code block. */
export function* prose(markdown) {
  let fenceCharacter;

  for (const [index, text] of markdown.split(/\r?\n/).entries()) {
    const marker = FENCE.exec(text)?.groups?.marker;
    if (marker !== undefined) {
      if (fenceCharacter === undefined) fenceCharacter = marker[0];
      else if (marker[0] === fenceCharacter) fenceCharacter = undefined;
      continue;
    }
    if (fenceCharacter !== undefined) continue;

    yield { number: index + 1, text };
  }
}

/** Drops inline code spans, so an example link is not read as a real one. */
export function withoutInlineCode(text) {
  return text.replace(INLINE_CODE, "");
}

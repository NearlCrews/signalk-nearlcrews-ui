/**
 * Reads Markdown line by line, telling prose from fenced code.
 *
 * Every reader that looks for headings or links has to skip fenced examples,
 * and each one that rolled its own toggle also treated a backtick fence and a
 * tilde fence as the same kind, so a ``` line inside a ~~~ block ended the
 * block early. One scanner tracks the fence that opened the block, so a fence
 * of the other kind, a shorter one, or one with an info string stays part of
 * the block it sits in.
 *
 * Indented code blocks are not recognized: a four-space indent is also how a
 * list item continues, and telling the two apart needs a full parser. This
 * repository's Markdown fences its examples, and the link check would flag an
 * indented example link loudly rather than miss one.
 */

/** A fence line: its indentation, its run of backticks or tildes, and the rest. */
const FENCE = /^(?<indent>[ \t]*)(?<marker>`{3,}|~{3,})(?<info>.*)$/;

const HEADING = /^\s{0,3}#{1,6}\s+(?<text>.+?)\s*#*\s*$/;

const INLINE_CODE = /`[^`]*`/g;

/**
 * Yields every line as `{ kind, number, text }`, where `kind` is `prose`
 * outside a fenced block, and `open`, `body`, or `close` for the lines of
 * one. An `open` line also carries its `fence`: `{ indent, info, marker }`.
 * A closing fence repeats the opening character at least as many times and
 * carries no info string. A block left open runs to the end of the document.
 */
export function* markdownLines(markdown) {
  let open;

  for (const [index, text] of markdown.split(/\r?\n/).entries()) {
    const number = index + 1;
    const fence = FENCE.exec(text)?.groups;
    if (open === undefined) {
      if (fence === undefined) {
        yield { kind: "prose", number, text };
      } else {
        open = fence;
        yield { fence, kind: "open", number, text };
      }
      continue;
    }

    const closes =
      fence !== undefined &&
      fence.marker[0] === open.marker[0] &&
      fence.marker.length >= open.marker.length &&
      fence.info.trim() === "";
    if (closes) open = undefined;
    yield { kind: closes ? "close" : "body", number, text };
  }
}

const HTML_COMMENT = /<!--.*?-->/g;

/**
 * Yields `{ number, text }` for each line outside a fenced code block, with
 * HTML comments removed: a link or heading inside one renders as nothing, so
 * it is neither checked as a link nor counted as an anchor. A comment that
 * spans lines hides every line it covers.
 */
export function* prose(markdown) {
  let insideComment = false;
  for (const { kind, number, text } of markdownLines(markdown)) {
    if (kind !== "prose") continue;
    let visible = text.replace(HTML_COMMENT, "");
    if (insideComment) {
      const end = visible.indexOf("-->");
      if (end === -1) continue;
      visible = visible.slice(end + 3);
      insideComment = false;
    }
    const start = visible.indexOf("<!--");
    if (start !== -1) {
      visible = visible.slice(0, start);
      insideComment = true;
    }
    yield { number, text: visible };
  }
}

/** The text of an ATX heading line, or undefined for any other line. */
export function headingText(line) {
  return HEADING.exec(line)?.groups?.text;
}

/** Drops inline code spans, so an example link is not read as a real one. */
export function withoutInlineCode(text) {
  return text.replace(INLINE_CODE, "");
}

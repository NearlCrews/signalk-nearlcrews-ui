/**
 * Runs a synchronous spec step against the document of a fresh iframe: a
 * second window with its own element constructors, the way a panel rendered
 * into a secondary window sees the page. The frame is removed afterwards,
 * whether the step passed or threw, so no later spec inherits it.
 */
export function withFrameDocument<T>(run: (frameDocument: Document) => T): T {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  try {
    const frameDocument = frame.contentDocument;
    if (frameDocument === null) throw new Error("The frame has no document.");
    return run(frameDocument);
  } finally {
    frame.remove();
  }
}

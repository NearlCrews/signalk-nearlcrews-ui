/**
 * Wraps a release so it runs at most once, however many times a caller hands
 * it back. React can run an effect cleanup and an explicit teardown for the
 * same subscription, and a second release would drop a reference the registry
 * never took.
 */
export function once(release: () => void): () => void {
  let released = false;
  return () => {
    if (released) return;
    released = true;
    release();
  };
}

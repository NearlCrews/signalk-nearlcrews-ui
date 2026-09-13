/**
 * The React floor the package's components are written against, and the two
 * answers a panel needs about the copy the host actually supplied.
 *
 * The Module Federation share map is a non-strict singleton on purpose, so a
 * host offering an older React resolves and wins. Without this check the panel
 * throws somewhere inside its error boundary with nothing naming React as the
 * cause, and the plugin author reads a stack from a hook that does not exist
 * yet.
 */

/*
 * Kept as a pair of numbers rather than as a string so the comparison never
 * becomes a string compare, where "19.10" sorts below "19.2".
 */
const REACT_FLOOR: readonly [number, number] = [19, 2];

/** The floor written the way the peer range writes it. */
export const REACT_FLOOR_LABEL = `${String(REACT_FLOOR[0])}.${String(REACT_FLOOR[1])}`;

/**
 * Whether a reported React version is old enough to break the panel. A
 * prerelease or an unparsable version reads as new enough: the check exists to
 * name a known-old host, not to refuse an unusual one.
 */
export function reactBelowFloor(reactVersion: string): boolean {
  const parts = /^(\d+)\.(\d+)/.exec(reactVersion);
  if (parts === null) return false;
  const major = Number(parts[1]);
  const minor = Number(parts[2]);
  if (major !== REACT_FLOOR[0]) return major < REACT_FLOOR[0];
  return minor < REACT_FLOOR[1];
}

/** What the compatibility notice says when React is the reason. */
export function reactFloorMessage(reactVersion: string): string {
  return `This panel needs React ${REACT_FLOOR_LABEL} or newer, and the host supplied ${reactVersion}. The shared React is the host's, so update the host application rather than this panel.`;
}

/**
 * The formatting and state-resolution helpers, with no React in the graph.
 *
 * A Signal K panel formats the same ages, counts, and lists outside its
 * component tree as well as inside it: in a web worker, in a service worker
 * that renders a notification, and in a plain Node script that prints the same
 * wording to a terminal. Importing the package root there pulls React in for
 * nothing, so the pure half is published on its own and the components import
 * exactly these modules.
 */
export {
  type FormatRelativeAgeOptions,
  formatRelativeAge,
  formatRelativeAgeSince,
  RELATIVE_AGE_EN,
  RELATIVE_AGE_NARROW,
  type RelativeAgeNegative,
  type RelativeAgeTimestamp,
} from "./utils/format-relative-age.js";
export { type Freshness, resolveFreshness } from "./utils/freshness.js";
export {
  REACHABILITY_STATUS,
  type Reachability,
  type ReachabilityStatus,
  resolveReachability,
} from "./utils/reachability.js";
export { formatCount, joinList } from "./utils/text.js";
export type { SemanticTone, StatusTone } from "./utils/tone.js";

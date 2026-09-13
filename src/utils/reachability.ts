import type { StatusTone } from "./tone.js";

/** Whether a remote endpoint answered, with null for not yet contacted. */
export type Reachability = boolean | null;

export interface ReachabilityStatus {
  /** Default wording. A consumer may show its own and keep the tone. */
  readonly label: string;
  readonly tone: StatusTone;
}

/**
 * The tone and default wording for each state of a tri-state reachability
 * flag.
 *
 * The unknown state is neutral rather than a warning on purpose: a panel that
 * has not reached the endpoint yet is reporting its own progress, and painting
 * that as a warning tells an operator something is wrong with the vessel's
 * equipment when nothing yet is.
 */
export const REACHABILITY_STATUS = {
  reachable: { label: "Reachable", tone: "success" },
  unknown: { label: "Not yet contacted", tone: "neutral" },
  unreachable: { label: "Unreachable", tone: "danger" },
} as const satisfies Readonly<Record<string, ReachabilityStatus>>;

/** Maps a tri-state reachability flag onto its tone and default wording. */
export function resolveReachability(
  reachable: Reachability,
): ReachabilityStatus {
  if (reachable === null) return REACHABILITY_STATUS.unknown;
  return reachable
    ? REACHABILITY_STATUS.reachable
    : REACHABILITY_STATUS.unreachable;
}

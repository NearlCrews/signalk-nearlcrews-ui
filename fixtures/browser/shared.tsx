import type { ReactNode } from "react";

import { Cluster, ThemeToggle } from "signalk-nearlcrews-ui";

/*
 * What the fixture pages render alike: the page header, the Log detail
 * options, and how a fleet's vessels are named.
 */

const TITLE_STYLE = { margin: 0, fontSize: "1.4rem" };

/**
 * The header of the panel and showcase pages: the page title over a status
 * indicator, with the theme selector at the row's end. `status` is the
 * indicator itself, so each page decides whether it announces.
 */
export function PageHeader({
  status,
  title,
}: {
  readonly status: ReactNode;
  readonly title: string;
}): React.JSX.Element {
  return (
    <Cluster justify="between" gap={4}>
      <div>
        <h1 style={TITLE_STYLE}>{title}</h1>
        {status}
      </div>
      <ThemeToggle />
    </Cluster>
  );
}

/** The Log detail choices both pages offer in a segmented control. */
export const LOG_DETAIL_OPTIONS = [
  { value: "minimal", label: "Minimal" },
  { value: "normal", label: "Normal" },
  { value: "verbose", label: "Verbose" },
] as const;

/**
 * The id and name of a fleet's vessel at an index. Specs find rows by these
 * names, "Vessel 001" onward, on every page that renders a fleet.
 */
export function vesselIdentity(index: number): { id: string; name: string } {
  return {
    id: `vessel-${String(index + 1)}`,
    name: `Vessel ${String(index + 1).padStart(3, "0")}`,
  };
}

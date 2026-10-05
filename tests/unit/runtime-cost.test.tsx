import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  Cell,
  Column,
  DataGrid,
  Row,
  type RowProps,
} from "../../src/data-grid.js";
import { PanelRoot, RELATIVE_AGE_EN, RelativeAge } from "../../src/index.js";
import { advanceTimers } from "../helpers.js";
import { NOW } from "./lib/clock.js";
import { bodyRows, rowAt } from "./lib/data-grid-fixture.js";

/**
 * What a scrolling panel costs is measured in the browser suite, where there
 * is layout to measure. These are the two costs a jsdom render can hold to a
 * number: renders committed per clock tick, and the state a grid throws away
 * when its row count moves.
 */

/** Stamps a panel might show at once in a fleet or an alarm list. */
const STAMP_HOURS = Array.from({ length: 20 }, (_, index) => 3 + index);

interface Vessel {
  readonly id: string;
  readonly name: string;
}

const FLEET: readonly Vessel[] = Array.from({ length: 20 }, (_, index) => ({
  id: `vessel-${String(index)}`,
  name: `Vessel ${String(index)}`,
}));

function renderVesselRow(vessel: Vessel): ReactElement<RowProps<Vessel>> {
  return (
    <Row>
      <Cell>{vessel.name}</Cell>
    </Row>
  );
}

function fleetGrid(items: readonly Vessel[]): ReactElement {
  return (
    <PanelRoot>
      <DataGrid
        aria-label="Fleet"
        items={items}
        renderRow={renderVesselRow}
        selectionMode="multiple"
        virtualize="never"
        virtualizeThreshold={10}
      >
        <Column id="name" isRowHeader>
          Vessel
        </Column>
      </DataGrid>
    </PanelRoot>
  );
}

function selectedRowNames(container: HTMLElement): string[] {
  return [...bodyRows(container)]
    .filter((row) => row.getAttribute("aria-selected") === "true")
    .map((row) => row.textContent || "");
}

describe("runtime cost", () => {
  it("commits no render for a panel of settled stamps on a clock tick", () => {
    vi.useFakeTimers({ now: NOW });
    let renders = 0;

    function StampList(): React.JSX.Element {
      renders += 1;
      return (
        <ul>
          {STAMP_HOURS.map((hours) => (
            <li key={hours}>
              <RelativeAge
                since={NOW - hours * 3_600_000}
                tickMs={1_000}
                options={RELATIVE_AGE_EN}
              />
            </li>
          ))}
        </ul>
      );
    }

    const { container } = render(<StampList />);
    expect(container.querySelectorAll("time")).toHaveLength(STAMP_HOURS.length);
    const initial = renders;

    // Sixty ticks, and none of the twenty ages crosses into a new hour, so the
    // shared clock costs the panel nothing but the comparison each stamp makes.
    advanceTimers(60_000);

    expect(renders).toBe(initial);
    expect(screen.getAllByText("3 hours ago")).toHaveLength(1);
  });

  it("keeps an uncontrolled grid selection when the row count crosses the threshold", async () => {
    // Under the default "auto" the two bodies are different element trees, so
    // crossing the threshold remounts the table and the state it held goes
    // with it. Pinning the mode is what a grid that grows, filters, or drains
    // while it is on screen does instead, and this is the promise that buys.
    const user = userEvent.setup();
    const view = render(fleetGrid(FLEET.slice(0, 8)));

    const container = view.container;
    await user.click(rowAt(container, 2));
    expect(selectedRowNames(container)).toEqual(["Vessel 2"]);

    view.rerender(fleetGrid(FLEET));

    expect(bodyRows(container)).toHaveLength(FLEET.length);
    expect(selectedRowNames(container)).toEqual(["Vessel 2"]);
  });
});

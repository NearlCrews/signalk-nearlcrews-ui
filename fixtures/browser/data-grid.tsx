import { useState } from "react";

import { Banner, type Density, PanelRoot, Stack } from "signalk-nearlcrews-ui";
import {
  Cell,
  Column,
  DataGrid,
  type DataGridVirtualizeMode,
  Row,
  type Selection,
} from "signalk-nearlcrews-ui/data-grid";
import { mountFixture } from "./mount.js";

/*
 * The same small fleet in both DataGrid layouts, the table the grid renders
 * below its virtualize threshold and the virtualized one, the latter also at
 * compact density, beside a Banner whose tone bar the grid's selection bar is
 * measured against.
 */

interface Vessel {
  readonly depth: number;
  readonly id: string;
  readonly name: string;
  readonly source: string;
}

const FLEET: readonly Vessel[] = Array.from({ length: 6 }, (_, index) => ({
  depth: 3 + index,
  id: `vessel-${String(index + 1)}`,
  name: `Vessel ${String(index + 1).padStart(3, "0")}`,
  source: index % 2 === 0 ? "GPS" : "Depth sounder",
}));

function Fleet({
  density,
  label,
  virtualize,
}: {
  readonly density?: Density | undefined;
  readonly label: string;
  readonly virtualize: DataGridVirtualizeMode;
}): React.JSX.Element {
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  return (
    <DataGrid
      aria-label={label}
      density={density}
      items={FLEET}
      selectionMode="multiple"
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
      virtualize={virtualize}
      // A virtualized grid scrolls inside a bounded box.
      style={virtualize === "always" ? { height: 260 } : undefined}
      renderRow={(vessel) => (
        <Row>
          <Cell>{vessel.name}</Cell>
          <Cell>{vessel.depth} m</Cell>
          <Cell>{vessel.source}</Cell>
        </Row>
      )}
    >
      <Column id="name">Boat</Column>
      <Column id="depth" numeric>
        Depth
      </Column>
      <Column id="source">Source</Column>
    </DataGrid>
  );
}

mountFixture(
  <PanelRoot>
    <Stack gap={4}>
      <Banner tone="info" title="Tone bar">
        The grid's selection bar matches this bar's width.
      </Banner>
      <Fleet label="Table fleet" virtualize="never" />
      <Fleet label="Virtualized fleet" virtualize="always" />
      {/* Compact, like the showcase's Fleet grid, with its own inset. */}
      <Fleet
        label="Compact virtualized fleet"
        virtualize="always"
        density="compact"
      />
    </Stack>
  </PanelRoot>,
);

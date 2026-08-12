import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { Accordion, EmptyState, Progress } from "../../src/composites.js";
import { Cell, Column, DataGrid, Row } from "../../src/data-grid.js";
import { Radio, RadioGroup, Switch } from "../../src/forms.js";
import {
  ActionBar,
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  CollapsibleSection,
  FieldGroup,
  InlineConfirm,
  LabeledField,
  Metric,
  NumberInput,
  PanelRoot,
  RangeInput,
  Section,
  Select,
  StatusIndicator,
  Textarea,
  TextInput,
  ThemeToggle,
} from "../../src/index.js";

interface FixtureRow {
  readonly id: string;
  readonly name: string;
  readonly state: string;
}

const GRID_ROWS: readonly FixtureRow[] = [
  { id: "depth", name: "Depth", state: "Fresh" },
  { id: "wind", name: "Wind", state: "Stale" },
  { id: "gps", name: "GPS", state: "Fresh" },
];

describe("accessibility", () => {
  it("has no detectable serious accessibility violations", async () => {
    // Overlays (Dialog, AlertDialog, Menu, Popover, Toast) stay out of this
    // fixture: they portal and need open state, so their unit tests own the
    // rendered markup and the browser suite runs axe against them live.
    const { container } = render(
      <main>
        <PanelRoot>
          <ThemeToggle />
          <Banner tone="info" title="Provider detected">
            Configure the provider before saving.
          </Banner>
          <Banner tone="neutral" title="Units follow the server">
            Values display in the Signal K unit preferences.
          </Banner>
          <Section title="Connection" description="Signal K server connection">
            <LabeledField label="Server URL" required>
              <TextInput defaultValue="http://localhost:3000" />
            </LabeledField>
            <LabeledField
              label="Refresh interval"
              description="Stored in seconds"
            >
              <NumberInput defaultValue={10} min={1} />
            </LabeledField>
            <LabeledField label="Provider mode">
              <Select defaultValue="automatic">
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </Select>
            </LabeledField>
            <LabeledField label="Operator notes">
              <Textarea defaultValue="Watch the depth offset." />
            </LabeledField>
            <LabeledField label="Confidence threshold">
              <RangeInput defaultValue={75} min={0} max={100} />
            </LabeledField>
            <Checkbox label="Enable provider" />
            <Switch defaultChecked>Sync on startup</Switch>
            <CollapsibleSection title="Advanced settings" defaultOpen>
              No advanced settings are required.
            </CollapsibleSection>
          </Section>
          <FieldGroup
            legend="Notifications"
            description="Choose what the panel announces"
          >
            <RadioGroup label="Announcement level" defaultValue="alerts">
              <Radio value="all">Everything</Radio>
              <Radio value="alerts">Alerts only</Radio>
              <Radio value="none">Nothing</Radio>
            </RadioGroup>
          </FieldGroup>
          <Accordion>
            <CollapsibleSection title="Depth alarms" defaultOpen>
              Depth alarm settings.
            </CollapsibleSection>
            <CollapsibleSection title="Wind alarms">
              Wind alarm settings.
            </CollapsibleSection>
          </Accordion>
          <Card>
            <Metric label="Depth below keel" value="3.2" unit="m" />
            <Badge tone="success">Healthy</Badge>
          </Card>
          <Progress label="Sync progress" value={40} />
          <DataGrid
            aria-label="Data freshness"
            items={GRID_ROWS}
            renderRow={(row) => (
              <Row>
                <Cell>{row.name}</Cell>
                <Cell>{row.state}</Cell>
              </Row>
            )}
          >
            <Column id="name">Source</Column>
            <Column id="state">State</Column>
          </DataGrid>
          <EmptyState
            title="No waypoints stored"
            description="Saved waypoints appear here."
          />
          <InlineConfirm
            open
            message="This action requires confirmation."
            onCancel={() => undefined}
            onConfirm={() => undefined}
          />
          <ActionBar
            status={<StatusIndicator tone="success">Ready</StatusIndicator>}
            actions={
              <>
                <Button loading>Saving</Button>
                <Button variant="primary">Save</Button>
              </>
            }
          />
        </PanelRoot>
      </main>,
    );

    const result = await axe.run(container, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
      rules: {
        // jsdom cannot compute rendered colors, so color-contrast would
        // report incomplete rather than pass. The browser suite covers
        // contrast against real layout, and contrast.test.ts audits the
        // token pairs directly.
        "color-contrast": { enabled: false },
      },
    });

    expect(result.violations).toEqual([]);
  });
});

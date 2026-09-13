import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  Accordion,
  CheckboxGroup,
  EmptyState,
  Progress,
} from "../../src/composites.js";
import { Cell, Column, DataGrid, Row } from "../../src/data-grid.js";
import { Radio, RadioGroup, SecretInput, Switch } from "../../src/forms.js";
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
  NumberField,
  NumberInput,
  PanelRoot,
  RangeInput,
  Section,
  SegmentedControl,
  Select,
  StatusIndicator,
  Textarea,
  TextInput,
  ThemeToggle,
} from "../../src/index.js";
import { expectNoAxeViolations } from "../helpers.js";

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

    await expectNoAxeViolations(container);
  });

  it("has no detectable violations while fields are refusing input", async () => {
    // The invalid state is the most intricate wiring in the forms layer,
    // aria-invalid against aria-errormessage against the live region that
    // reads the message, and it is the state the fixture above never enters.
    const user = userEvent.setup();
    const { container } = render(
      <main>
        <PanelRoot>
          <Section title="Refused input">
            <LabeledField
              label="Server URL"
              description="The address of the Signal K server."
              error="Enter an HTTP or HTTPS URL."
              errorLive="polite"
            >
              <TextInput defaultValue="not a URL" />
            </LabeledField>
            <NumberField
              label="Refresh interval"
              defaultValue={10}
              min={1}
              unit="s"
            />
            <LabeledField label="API key">
              <SecretInput defaultValue="fixture-secret" />
            </LabeledField>
            <Checkbox
              label="Accept the provider agreement"
              error="Accept the provider agreement before saving."
              errorLive="polite"
            />
            <RadioGroup
              label="Announcement level"
              error="Choose an announcement level."
              errorLive="polite"
            >
              <Radio value="all">Everything</Radio>
              <Radio value="none">Nothing</Radio>
            </RadioGroup>
            <SegmentedControl
              label="Log detail"
              defaultValue="normal"
              error="Verbose logging is unavailable on this server."
              errorLive="polite"
              options={[
                { value: "minimal", label: "Minimal" },
                { value: "normal", label: "Normal" },
              ]}
            />
            <CheckboxGroup
              legend="Data sources"
              options={[
                { label: "AIS targets", value: "ais" },
                { label: "Depth", value: "depth" },
              ]}
              defaultValue={[]}
              emptyWarning="Select at least one data source."
              selectAllLabel="Select all sources"
            />
            <FieldGroup
              label="Provider behavior"
              description="Optional capabilities remain consumer-owned."
              error="Enable at least one capability."
            >
              <Checkbox label="Enable provider" />
            </FieldGroup>
          </Section>
        </PanelRoot>
      </main>,
    );

    // Every other field is refused by a prop; the number field is refused by
    // what the operator typed, so the draft has to be made invalid before the
    // sweep sees that state at all.
    const interval = screen.getByRole("spinbutton", {
      name: /Refresh interval/,
    });
    await user.clear(interval);
    await user.type(interval, "0");
    expect(interval).toHaveAttribute("aria-invalid", "true");

    await expectNoAxeViolations(container);
  });
});

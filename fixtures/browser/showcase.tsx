import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  ActionBar,
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  Cluster,
  Code,
  CollapsibleSection,
  FieldGroup,
  InlineConfirm,
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
  LabeledField,
  LiveRegion,
  Metric,
  MetricGrid,
  NumberField,
  NumberInput,
  PanelRoot,
  RangeInput,
  RelativeAge,
  Section,
  SegmentedControl,
  Select,
  Stack,
  StatusIndicator,
  Text,
  Textarea,
  TextInput,
  ThemeToggle,
  VisuallyHidden,
} from "signalk-nearlcrews-ui";
import {
  Accordion,
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
  EmptyState,
  Progress,
  Tab,
  TabList,
  Table,
  TableCell,
  TableHeaderCell,
  TableScrollRegion,
  TabPanel,
  Tabs,
} from "signalk-nearlcrews-ui/composites";
import {
  Cell,
  Column,
  DataGrid,
  type Key,
  Row,
  type Selection,
  type SortDescriptor,
} from "signalk-nearlcrews-ui/data-grid";
import {
  Radio,
  RadioGroup,
  SecretInput,
  Switch,
} from "signalk-nearlcrews-ui/forms";
import {
  AlertDialog,
  Dialog,
  Menu,
  MenuItem,
  MenuSeparator,
  Popover,
  ToastRegion,
  toast,
} from "signalk-nearlcrews-ui/overlays";

const showcaseParameters = new URLSearchParams(window.location.search);
/** Mirrors the Admin's fixed header and sidebar around the panel. */
const showHostChrome = showcaseParameters.has("host-chrome");

const BANNER_TONES = [
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
] as const;
const STATUS_TONES = [
  "neutral",
  "info",
  "success",
  "warning",
  "danger",
] as const;
const TOAST_TONES = ["info", "success", "warning", "danger"] as const;

const BANNER_COPY: Readonly<Record<(typeof BANNER_TONES)[number], string>> = {
  neutral: "Daylight saving time shifts tide tables by one hour tomorrow.",
  info: "A chart update is available for the covered regions.",
  success: "All provider checks passed during the last sync.",
  warning: "The depth provider has not reported in five minutes.",
  danger: "The route export failed because the server rejected the write.",
};

const TEXT_TONES = [
  "neutral",
  "muted",
  "info",
  "success",
  "warning",
  "danger",
] as const;

interface PathRow {
  readonly ageMs: number;
  readonly path: string;
  readonly source: string;
  readonly value: string;
}

const PATH_ROWS: readonly PathRow[] = [
  {
    ageMs: 1_000,
    path: "environment.depth.belowTransducer",
    source: "Depth sounder",
    value: "3.1 m",
  },
  {
    ageMs: 12_000,
    path: "environment.wind.speedApparent",
    source: "Masthead unit",
    value: "6.2 m/s",
  },
  {
    ageMs: 45_000,
    path: "environment.water.temperature",
    source: "Depth sounder",
    value: "287.4 K",
  },
  {
    ageMs: 300_000,
    path: "electrical.batteries.house.stateOfCharge",
    source: "Battery monitor",
    value: "0.87",
  },
];

/*
 * Deliberately wider than the panel. The long `updates` line is what makes the
 * block overflow, and overflow is the only condition under which a scrollable
 * region that cannot take focus is reported at all. Shortening this line would
 * leave the audit passing over a block that never scrolls, retiring the
 * regression it exists to catch without failing anything first.
 */
const DELTA_SAMPLE = `{
  "context": "vessels.urn:mrn:imo:mmsi:234567890",
  "updates": [
    { "source": { "label": "N2K", "type": "NMEA2000", "pgn": 128267 }, "timestamp": "2026-09-09T11:04:31.281Z", "values": [{ "path": "environment.depth.belowTransducer", "value": 3.1 }] }
  ]
}`;

/** Pinned at load, so the live age counts from one moment for the whole run. */
const LAST_DELTA_AT = Date.now() - 90_000;

interface Boat {
  readonly id: string;
  readonly name: string;
  readonly depth: number;
  readonly wind: number;
}

const BOATS: readonly Boat[] = Array.from({ length: 240 }, (_, index) => ({
  id: `vessel-${String(index + 1)}`,
  name: `Vessel ${String(index + 1).padStart(3, "0")}`,
  depth: 1.5 + ((index * 17) % 60) / 10,
  wind: 4 + ((index * 7) % 28),
}));

function compareBoats(a: Boat, b: Boat, descriptor: SortDescriptor): number {
  const column = descriptor.column;
  const direction = descriptor.direction === "descending" ? -1 : 1;
  if (column === "name") return direction * a.name.localeCompare(b.name);
  if (column === "depth") return direction * (a.depth - b.depth);
  if (column === "wind") return direction * (a.wind - b.wind);
  return 0;
}

function Showcase(): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [expandedFirstVessel, setExpandedFirstVessel] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set<Key>());
  const [units, setUnits] = useState("server");
  const [depthAlarm, setDepthAlarm] = useState(2.5);

  const sortedBoats = useMemo(
    () => [...BOATS].sort((a, b) => compareBoats(a, b, sortDescriptor)),
    [sortDescriptor],
  );

  return (
    <PanelRoot width="wide">
      <Stack gap={5}>
        <Cluster justify="between" gap={4}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem" }}>
              Component showcase
            </h1>
            <StatusIndicator tone="success" live="polite">
              Every export rendered
            </StatusIndicator>
          </div>
          <ThemeToggle />
        </Cluster>

        <Section
          title="Feedback"
          description="Banners, badges, and status indicators in every tone."
        >
          <Stack gap={3}>
            {BANNER_TONES.map((tone) => (
              <Banner key={tone} tone={tone} title={`${tone} banner`}>
                {BANNER_COPY[tone]}
              </Banner>
            ))}
            <Cluster gap={3}>
              {STATUS_TONES.map((tone) => (
                <StatusIndicator key={tone} tone={tone}>
                  {tone}
                </StatusIndicator>
              ))}
            </Cluster>
            <Cluster gap={2}>
              {STATUS_TONES.map((tone) => (
                <Badge key={tone} tone={tone}>
                  {tone}
                </Badge>
              ))}
            </Cluster>
          </Stack>
        </Section>

        <Section title="Metrics">
          <MetricGrid>
            <Metric
              label="Depth"
              value="3.1"
              unit="m"
              tone="info"
              live="polite"
            />
            <Metric
              label="Wind"
              value="12"
              unit="kn"
              detail="Ten minute average"
            />
            <Metric label="Battery" value="87" unit="%" tone="success" />
            <Metric label="Bilge" value="Clear" tone="neutral" />
            <Metric label="Engine" value="Hot" tone="danger" />
          </MetricGrid>
        </Section>

        <Section title="Buttons">
          <Stack gap={3}>
            <Cluster gap={2}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button size="compact">Compact</Button>
              <Button shape="pill" variant="secondary">
                Pill
              </Button>
              <Button iconOnly variant="ghost" aria-label="Refresh data">
                <span aria-hidden="true">+</span>
              </Button>
              <Button as="a" href="https://signalk.org/" variant="ghost">
                Anchor form
              </Button>
            </Cluster>
            <Button fullWidth variant="primary">
              Full width action
            </Button>
          </Stack>
        </Section>

        <Section title="Progress">
          <Stack gap={3}>
            <Progress label="Log upload" value={64} valueText="64 percent" />
            <Progress label="Battery reserve" value={24} tone="warning" />
            <Progress label="Syncing with the server" />
          </Stack>
        </Section>

        <Section
          title="Form controls"
          description="Fields, inputs, and groups with validation states."
        >
          <Stack gap={3}>
            <LabeledField
              label="Server URL"
              description="The address of the Signal K server."
              name="server-url"
              required
            >
              <TextInput type="url" defaultValue="http://localhost:3000" />
            </LabeledField>
            <LabeledField label="Call sign" optionalLabel="Optional">
              <TextInput type="text" />
            </LabeledField>
            <LabeledField label="API key">
              <SecretInput defaultValue="harbor-master-token" />
            </LabeledField>
            <LabeledField
              label="Waypoint name"
              error="A waypoint with this name already exists."
            >
              <TextInput type="text" defaultValue="Home" />
            </LabeledField>
            <LabeledField label="Season start">
              <TextInput type="month" />
            </LabeledField>
            <LabeledField label="Regatta week">
              <TextInput type="week" />
            </LabeledField>
            <LabeledField label="Provider mode">
              <Select defaultValue="automatic">
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </Select>
            </LabeledField>
            <LabeledField label="Operator notes">
              <Textarea defaultValue="Watch the bar at low tide." />
            </LabeledField>
            <LabeledField label="Crew size" layout="inline" density="compact">
              {(controlProps) => (
                <InputGroup density="compact">
                  <InputGroupControl width="grow">
                    <RangeInput
                      {...controlProps}
                      defaultValue={4}
                      min={1}
                      max={12}
                    />
                  </InputGroupControl>
                  <InputGroupControl width="fixed">
                    <NumberInput
                      aria-label="Crew size exact value"
                      aria-describedby={controlProps["aria-describedby"]}
                      defaultValue={4}
                      min={1}
                      max={12}
                    />
                    <InputGroupAddon>crew</InputGroupAddon>
                  </InputGroupControl>
                </InputGroup>
              )}
            </LabeledField>
            <NumberField
              label="Depth alarm"
              description="Sounds when the depth falls below this value."
              value={depthAlarm}
              onValueChange={setDepthAlarm}
              min={0.5}
              max={50}
              step={0.1}
              unit="m"
            />
            <Checkbox label="Enable anchor alarm" defaultChecked />
            <Checkbox label="Share position with the fleet" />
            <Checkbox indeterminate label="Some sensors calibrated" />
            <Switch defaultChecked>Track recording</Switch>
            <RadioGroup
              label="Units source"
              name="units-source"
              description="Where displayed units come from."
              value={units}
              onValueChange={setUnits}
            >
              <Radio value="server">Follow the server</Radio>
              <Radio value="metric">Force metric</Radio>
              <Radio value="imperial">Force imperial</Radio>
            </RadioGroup>
            <FieldGroup
              legend="Alerts"
              description="Alert routing stays with the consumer."
              error="Choose at least one alert channel."
              actions={
                <Button size="compact" shape="pill">
                  Test
                </Button>
              }
            >
              <Checkbox label="Depth alarm" />
              <Checkbox label="Wind alarm" />
            </FieldGroup>
          </Stack>
        </Section>

        <Section title="Segmented control">
          <Stack gap={3}>
            <SegmentedControl
              label="Log detail"
              labelVisibility="visible"
              name="log-detail"
              defaultValue="normal"
              onValueChange={() => undefined}
              options={[
                { value: "minimal", label: "Minimal" },
                { value: "normal", label: "Normal" },
                { value: "verbose", label: "Verbose" },
              ]}
            />
            <SegmentedControl
              label="Panel density"
              orientation="vertical"
              defaultValue="comfortable"
              onValueChange={() => undefined}
              options={[
                { value: "comfortable", label: "Comfortable" },
                { value: "compact", label: "Compact" },
              ]}
            />
          </Stack>
        </Section>

        <Section
          title="Tabs"
          description="Selected, unselected, and disabled tabs over their panels."
        >
          <Tabs defaultValue="overview">
            <TabList aria-label="Provider detail">
              <Tab value="overview">Overview</Tab>
              <Tab value="sources" badge={<Badge tone="info">3</Badge>}>
                Sources
              </Tab>
              <Tab value="diagnostics" disabled>
                Diagnostics
              </Tab>
              <Tab value="advanced">Advanced</Tab>
            </TabList>
            <TabPanel value="overview">
              The provider reports depth, wind, and water temperature once a
              second.
            </TabPanel>
            <TabPanel value="sources">
              Three sources claim the depth path; the highest priority wins.
            </TabPanel>
            <TabPanel value="diagnostics">
              Diagnostics stay unavailable until the provider connects.
            </TabPanel>
            <TabPanel value="advanced">
              Advanced options change how often the plugin writes to the server.
            </TabPanel>
          </Tabs>
        </Section>

        <Section
          title="Data grid"
          description="Sortable headers, multiple selection, and compact density."
          actions={
            <Button
              size="compact"
              aria-pressed={expandedFirstVessel}
              onClick={() => setExpandedFirstVessel((expanded) => !expanded)}
            >
              {expandedFirstVessel
                ? "Collapse first vessel"
                : "Expand first vessel"}
            </Button>
          }
        >
          <DataGrid
            aria-label="Fleet"
            items={sortedBoats}
            style={{ height: 280 }}
            renderRow={(boat) => (
              <Row>
                <Cell>
                  <span
                    style={{
                      display: "block",
                      minHeight:
                        expandedFirstVessel && boat.id === "vessel-1"
                          ? 72
                          : undefined,
                    }}
                  >
                    {boat.name}
                  </span>
                </Cell>
                <Cell>{boat.depth.toFixed(1)} m</Cell>
                <Cell>{boat.wind} kn</Cell>
              </Row>
            )}
            selectionMode="multiple"
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
            density="compact"
            zebra
          >
            <Column id="name" allowsSorting>
              Boat
            </Column>
            <Column id="depth" allowsSorting>
              Depth
            </Column>
            <Column id="wind" allowsSorting>
              Wind
            </Column>
          </DataGrid>
        </Section>

        <Section
          title="Table"
          description="A wide semantic table scrolling inside its own focusable region."
        >
          <TableScrollRegion aria-label="Signal K paths, scrollable">
            <Table
              caption="Signal K paths"
              zebra
              // Wider than the panel at a narrow viewport, so the region
              // always has overflow for a keyboard user to reach.
              style={{ minWidth: "48rem" }}
            >
              <thead>
                <tr>
                  <TableHeaderCell>Path</TableHeaderCell>
                  <TableHeaderCell>Source</TableHeaderCell>
                  <TableHeaderCell numeric>Value</TableHeaderCell>
                  <TableHeaderCell numeric>Age</TableHeaderCell>
                </tr>
              </thead>
              <tbody>
                {PATH_ROWS.map((row) => (
                  <tr key={row.path}>
                    <TableHeaderCell scope="row">
                      <Code>{row.path}</Code>
                    </TableHeaderCell>
                    <TableCell>{row.source}</TableCell>
                    <TableCell numeric>{row.value}</TableCell>
                    <TableCell numeric>
                      <RelativeAge ageMs={row.ageMs} />
                    </TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScrollRegion>
        </Section>

        <Section title="Cards">
          <Stack gap={3}>
            <Card
              header={<strong>Passage plan</strong>}
              footer={
                <Button size="compact" variant="secondary">
                  Open plan
                </Button>
              }
            >
              Falmouth to Fowey, 34 nautical miles, departing with the fair
              tide.
            </Card>
            <Card density="compact">
              Compact card for dense status summaries.
            </Card>
          </Stack>
        </Section>

        <Section title="Overlays">
          <Cluster gap={2}>
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Button variant="danger" onClick={() => setAlertOpen(true)}>
              Open alert dialog
            </Button>
            <Popover
              trigger={
                <Button variant="secondary">About this anchorage</Button>
              }
              width={280}
            >
              <p style={{ margin: 0 }}>
                Popovers anchor free-form content to a trigger and flip when
                they collide with the viewport.
              </p>
            </Popover>
            <Menu
              label="Panel actions"
              triggerVariant="secondary"
              onAction={() => undefined}
            >
              <MenuItem id="refresh">Refresh data</MenuItem>
              <MenuItem id="columns">Choose columns</MenuItem>
              <MenuSeparator />
              <MenuItem id="reset" tone="danger">
                Reset layout
              </MenuItem>
            </Menu>
          </Cluster>
        </Section>

        <Section title="Collapsible content">
          <Stack gap={3}>
            <Accordion>
              <CollapsibleSection title="NMEA 2000 gateways" defaultOpen>
                Gateway wiring and source priorities stay with the consumer.
              </CollapsibleSection>
              <CollapsibleSection title="Derived data">
                Derived paths calculate only while this section has opened.
              </CollapsibleSection>
              <CollapsibleSection title="Storage">
                Retention policy and InfluxDB credentials live in the plugin.
              </CollapsibleSection>
            </Accordion>
            <CollapsibleSection
              title="Retained content"
              mountStrategy="retain"
              summary={<Badge tone="info">2 pending</Badge>}
              summaryVisibility="always"
            >
              Hidden content stays mounted and pauses its effects.
            </CollapsibleSection>
            <CollapsibleSection
              title="Lazily retained"
              mountStrategy="lazy-retain"
            >
              Content mounts on first open and stays mounted afterward.
            </CollapsibleSection>
            <CollapsibleSection title="Unmounted" mountStrategy="unmount">
              Content leaves the tree entirely while collapsed.
            </CollapsibleSection>
          </Stack>
        </Section>

        <Section
          title="Disclosure"
          description="A trigger that reveals content which is not a section of its own."
        >
          <Stack gap={3}>
            <Disclosure defaultOpen>
              <DisclosureTrigger variant="secondary">
                Last delta received
              </DisclosureTrigger>
              <DisclosurePanel>
                <Code block>{DELTA_SAMPLE}</Code>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger variant="secondary">
                Connection log
              </DisclosureTrigger>
              <DisclosurePanel>
                The provider reconnected twice during the last watch.
              </DisclosurePanel>
            </Disclosure>
          </Stack>
        </Section>

        <Section
          title="Text and timing"
          description="Type roles, monospace identifiers, and text only a screen reader reads."
        >
          <Stack gap={3}>
            <Cluster gap={3}>
              {TEXT_TONES.map((tone) => (
                <Text key={tone} tone={tone}>
                  {tone}
                </Text>
              ))}
            </Cluster>
            <Text as="p" size="sm" tone="muted">
              Small muted text carries a hint under a control.
            </Text>
            <Text as="p" size="xs" tone="muted">
              Extra small text carries a caption.
            </Text>
            <Text as="p">
              Depth is read from <Code>environment.depth.belowTransducer</Code>{" "}
              on the primary sounder.
            </Text>
            <p style={{ margin: 0 }}>
              Last delta <RelativeAge since={LAST_DELTA_AT} />
              <VisuallyHidden> from the primary sounder</VisuallyHidden>
            </p>
            <LiveRegion
              message={`Depth alarm set to ${depthAlarm.toFixed(1)} meters.`}
            />
          </Stack>
        </Section>

        <Section title="Empty state">
          <EmptyState
            icon={<span>∅</span>}
            title="No waypoints yet"
            description="Waypoints created on the chartplotter appear here."
            action={<Button size="compact">Add waypoint</Button>}
          />
        </Section>

        <Section title="Toasts">
          <Stack gap={3}>
            <Cluster gap={2}>
              {TOAST_TONES.map((tone) => (
                <Button
                  key={tone}
                  size="compact"
                  variant="secondary"
                  onClick={() => {
                    toast.enqueue({
                      title: `${tone} toast`,
                      // Sticky, so an audit inspects the tone rather than
                      // racing its timeout.
                      duration: 0,
                      description: "Enqueued from the showcase.",
                      tone,
                    });
                  }}
                >
                  {tone} toast
                </Button>
              ))}
            </Cluster>
            <ToastRegion queue={toast} />
          </Stack>
        </Section>

        <Section title="Inline confirmation">
          <Stack gap={3}>
            <Cluster gap={2}>
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                Reset panel
              </Button>
            </Cluster>
            <InlineConfirm
              open={resetOpen}
              title="Reset panel?"
              message="Saved panel settings return to their defaults."
              confirmLabel="Reset"
              onCancel={() => setResetOpen(false)}
              onConfirm={() => setResetOpen(false)}
            />
          </Stack>
        </Section>

        <ActionBar
          sticky="bottom"
          status={
            <StatusIndicator tone="warning">Unsaved changes</StatusIndicator>
          }
          actions={
            <>
              <Button variant="secondary">Discard</Button>
              <Button variant="primary">Save</Button>
            </>
          }
        />
      </Stack>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Anchorage details"
        description="Tide, holding, and approach notes for the selected anchorage."
        actions={
          <Button variant="primary" onClick={() => setDialogOpen(false)}>
            Done
          </Button>
        }
      >
        <Stack gap={3}>
          <p style={{ margin: 0 }}>
            Sand over mud, good holding, swell wraps in from the southeast above
            fifteen knots.
          </p>
          <Popover trigger={<Button>Show approach note</Button>}>
            Keep the red lateral mark to starboard on entry.
          </Popover>
        </Stack>
      </Dialog>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        cancelLabel="Keep route"
        title="Delete route?"
        description="Deleting the route removes it from every synced device."
        actions={
          <Button variant="danger" onClick={() => setAlertOpen(false)}>
            Delete
          </Button>
        }
      />
    </PanelRoot>
  );
}

const container = document.querySelector("#root");
if (!(container instanceof HTMLElement)) {
  throw new Error("Browser showcase root was not found.");
}

if (showHostChrome) document.body.classList.add("host-chrome");

createRoot(container).render(
  <StrictMode>
    {showHostChrome ? (
      <>
        <header className="app-header">Signal K host header</header>
        <nav className="sidebar" aria-label="Host navigation">
          Host sidebar
        </nav>
      </>
    ) : null}
    <main className={showHostChrome ? "app-body" : undefined}>
      <Showcase />
    </main>
  </StrictMode>,
);

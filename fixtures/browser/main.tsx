import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  ActionBar,
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  Cluster,
  CollapsibleSection,
  Disclosure,
  FieldGroup,
  InlineConfirm,
  InputGroup,
  InputGroupAddon,
  InputGroupControl,
  LabeledField,
  Metric,
  MetricGrid,
  NumberInput,
  PanelRoot,
  RangeInput,
  Section,
  SegmentedControl,
  Select,
  Stack,
  StatusIndicator,
  Textarea,
  TextInput,
  ThemeToggle,
} from "signalk-nearlcrews-ui";

type LogLevel = "minimal" | "normal" | "verbose";
const fixtureParameters = new URLSearchParams(window.location.search);
const showStates = fixtureParameters.has("states");
const startBusy = fixtureParameters.has("busy");
const becomeBusyOnConfirm = fixtureParameters.has("busy-on-confirm");

function Fixture(): React.JSX.Element {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(startBusy);
  const [logLevel, setLogLevel] = useState<LogLevel>("normal");
  const [noticeVisible, setNoticeVisible] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const indeterminateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (indeterminateRef.current !== null) {
      indeterminateRef.current.indeterminate = true;
    }
  }, []);

  return (
    <PanelRoot legacyThemeStorageKeys={["fixture-theme"]}>
      <Stack gap={4}>
        <Cluster justify="between" gap={4}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem" }}>Weather provider</h1>
            <StatusIndicator tone="success">Connected</StatusIndicator>
          </div>
          <ThemeToggle />
        </Cluster>

        {noticeVisible ? (
          <Banner
            tone="info"
            title="Server units apply"
            onDismiss={() => setNoticeVisible(false)}
          >
            Values are stored in SI and displayed using Signal K preferences.
            <br />
            <a href="https://signalk.org/">Read the Signal K documentation</a>.
          </Banner>
        ) : null}

        <Section
          title="Connection"
          description="Configure the provider without changing domain behavior."
        >
          <Stack gap={3}>
            <LabeledField
              label="Server URL"
              description="The address of the Signal K server."
              required
            >
              <TextInput type="url" defaultValue="http://localhost:3000" />
            </LabeledField>
            <LabeledField label="API token">
              <TextInput type="password" defaultValue="fixture-secret" />
            </LabeledField>
            <LabeledField label="Provider mode">
              <Select defaultValue="automatic">
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </Select>
            </LabeledField>
            <LabeledField label="Operator notes">
              <Textarea defaultValue="Shown only in this browser fixture." />
            </LabeledField>
            <LabeledField label="Refresh interval" description="Seconds">
              <NumberInput defaultValue={10} min={1} max={300} />
            </LabeledField>
            <LabeledField
              label="Confidence threshold"
              description="Percentage"
              layout="inline"
              density="compact"
            >
              {(controlProps) => (
                <InputGroup density="compact">
                  <InputGroupControl width="grow">
                    <RangeInput
                      {...controlProps}
                      defaultValue={75}
                      min={0}
                      max={100}
                    />
                  </InputGroupControl>
                  <InputGroupControl width="fixed">
                    <NumberInput
                      aria-label="Confidence threshold exact value"
                      aria-describedby={controlProps["aria-describedby"]}
                      defaultValue={75}
                      min={0}
                      max={100}
                    />
                    <InputGroupAddon data-testid="confidence-unit">
                      %
                    </InputGroupAddon>
                  </InputGroupControl>
                </InputGroup>
              )}
            </LabeledField>
            <FieldGroup
              legend="Provider behavior"
              description="Optional capabilities remain consumer-owned."
              actions={
                <Button size="compact" shape="pill">
                  Detect
                </Button>
              }
            >
              <Checkbox
                label="Enable provider"
                description="Missing optional capabilities degrade cleanly."
                defaultChecked
              />
            </FieldGroup>
            <Disclosure title="Advanced settings">
              <SegmentedControl
                legend="Log detail"
                value={logLevel}
                onChange={setLogLevel}
                options={[
                  { value: "minimal", label: "Minimal" },
                  { value: "normal", label: "Normal" },
                  { value: "verbose", label: "Verbose" },
                ]}
              />
            </Disclosure>
          </Stack>
        </Section>

        <CollapsibleSection
          title="Provider status and metrics"
          summary={<Badge tone="success">3 checks healthy</Badge>}
          summaryPlacement="header"
          actions={<Button size="compact">Refresh</Button>}
          open={statusOpen}
          onOpenChange={setStatusOpen}
          mountStrategy="unmount"
        >
          <MetricGrid aria-live="off">
            <Metric label="Updates" value="128" detail="Since startup" />
            <Metric
              label="API calls"
              value="12 / 100"
              detail="Rolling daily cap"
              tone="info"
            />
            <Metric label="Provider" value="Ready" tone="success" />
          </MetricGrid>
        </CollapsibleSection>

        {showStates ? (
          <Section title="Component states">
            <Stack gap={3}>
              <Banner
                tone="danger"
                title="Provider unavailable"
                actions={<Button size="compact">Retry</Button>}
              >
                Retry after checking the optional provider.
              </Banner>
              <LabeledField
                label="Invalid server URL"
                error="Enter an HTTP or HTTPS URL."
              >
                <TextInput defaultValue="not a URL" />
              </LabeledField>
              <Checkbox label="Unavailable option" disabled />
              <Checkbox label="Optional diagnostics" />
              <Checkbox
                ref={indeterminateRef}
                label="Partially configured option"
              />
              <Card>
                <Cluster gap={2}>
                  <Button disabled>Disabled</Button>
                  <Button ariaDisabled>Unavailable here</Button>
                  <Button loading>Saving</Button>
                  <Button onClick={() => setConfirmBusy((current) => !current)}>
                    Toggle confirmation busy
                  </Button>
                </Cluster>
              </Card>
            </Stack>
          </Section>
        ) : null}

        <InlineConfirm
          open={confirmOpen}
          busy={confirmBusy}
          title="Reset configuration?"
          message="The plugin-specific implementation would perform the reset."
          confirmLabel="Reset"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            if (becomeBusyOnConfirm) setConfirmBusy(true);
            else setConfirmOpen(false);
          }}
        />

        <ActionBar
          status={
            <StatusIndicator tone="warning">Unsaved changes</StatusIndicator>
          }
          actions={
            <>
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                Reset
              </Button>
              <Button variant="primary">Save</Button>
            </>
          }
        />
      </Stack>
    </PanelRoot>
  );
}

const container = document.querySelector("#root");
if (!(container instanceof HTMLElement)) {
  throw new Error("Browser fixture root was not found.");
}

createRoot(container).render(
  <StrictMode>
    <main>
      <Fixture />
    </main>
  </StrictMode>,
);

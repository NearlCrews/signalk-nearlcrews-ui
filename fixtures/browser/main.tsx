import { StrictMode, useRef, useState } from "react";
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
import { createToastQueue, ToastRegion } from "signalk-nearlcrews-ui/overlays";

type LogLevel = "minimal" | "normal" | "verbose";
const fixtureParameters = new URLSearchParams(window.location.search);
const showStates = fixtureParameters.has("states");
const startBusy = fixtureParameters.has("busy");
const becomeBusyOnConfirm = fixtureParameters.has("busy-on-confirm");
const testFocusLoading = fixtureParameters.has("focus-loading");
const simulateAdminHost = fixtureParameters.has("admin-host");
const showHostResetFixture = fixtureParameters.has("host-reset");
const showForcedColorActions = fixtureParameters.has("forced-color-actions");
const engineToastQueue = createToastQueue();
const networkToastQueue = createToastQueue();

function Fixture(): React.JSX.Element {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(startBusy);
  const [focusLoading, setFocusLoading] = useState(false);
  const [focusLoadingActivations, setFocusLoadingActivations] = useState(0);
  const [logLevel, setLogLevel] = useState<LogLevel>("normal");
  const [noticeVisible, setNoticeVisible] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const saveRef = useRef<HTMLButtonElement>(null);

  return (
    <PanelRoot {...(simulateAdminHost ? { width: "standard" } : {})}>
      <Stack gap={4}>
        {showHostResetFixture ? (
          <div data-testid="host-reset-fixture">
            <h2>Consumer heading</h2>
            <p>Consumer paragraph</p>
            <fieldset>
              <legend>Consumer legend</legend>
              <input aria-label="Consumer input" />
            </fieldset>
          </div>
        ) : null}
        <Cluster justify="between" gap={4}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem" }}>Weather provider</h1>
            <StatusIndicator tone="success">Connected</StatusIndicator>
          </div>
          <ThemeToggle />
        </Cluster>

        {simulateAdminHost ? (
          <Cluster gap={2}>
            <Button
              onClick={() =>
                engineToastQueue.enqueue({
                  duration: 0,
                  title: "Engine notification",
                  tone: "warning",
                })
              }
            >
              Show engine notification
            </Button>
            <Button
              onClick={() =>
                networkToastQueue.enqueue({
                  duration: 0,
                  title: "Network notification",
                })
              }
            >
              Show network notification
            </Button>
          </Cluster>
        ) : null}

        {noticeVisible ? (
          <Banner
            tone="info"
            title="Server units apply"
            actions={
              showForcedColorActions ? (
                <>
                  <button
                    type="button"
                    style={{ background: "transparent", color: "#f5f7fa" }}
                  >
                    Raw banner action
                  </button>
                  <input
                    type="button"
                    value="Raw input action"
                    style={{ background: "transparent", color: "#f5f7fa" }}
                  />
                </>
              ) : undefined
            }
            dismissFocusRef={saveRef}
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
              {(controlProps) => {
                const { descriptionId, errorId, ...rangeProps } = controlProps;
                return (
                  <InputGroup density="compact">
                    <InputGroupControl width="grow">
                      <RangeInput
                        {...rangeProps}
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
                );
              }}
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
            <CollapsibleSection title="Advanced settings">
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
            </CollapsibleSection>
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
              <LabeledField
                label="Invalid confidence threshold"
                error="Choose a supported confidence threshold."
              >
                <RangeInput defaultValue={25} min={0} max={100} />
              </LabeledField>
              <Checkbox
                label="Missing agreement"
                error="Accept the provider agreement."
              />
              <Checkbox label="Unavailable option" disabled />
              <Checkbox label="Optional diagnostics" />
              <Checkbox indeterminate label="Partially configured option" />
              <Card>
                <Cluster gap={2}>
                  <Button disabled>Disabled</Button>
                  <Button ariaDisabled>Unavailable here</Button>
                  {testFocusLoading ? (
                    <Button
                      data-testid="focus-loading-button"
                      data-activation-count={focusLoadingActivations}
                      loading={focusLoading}
                      loadingLabel="Saving"
                      onClick={() => {
                        setFocusLoading(true);
                        setFocusLoadingActivations((count) => count + 1);
                      }}
                    >
                      Fixture configuration
                    </Button>
                  ) : (
                    <Button loading>Saving</Button>
                  )}
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

        {simulateAdminHost ? (
          <div className="admin-host__tall-panel-content">
            <Button data-testid="admin-host-focus-target">
              Last panel action
            </Button>
          </div>
        ) : null}

        <ActionBar
          sticky={simulateAdminHost ? "viewport-bottom" : undefined}
          status={
            <StatusIndicator tone="warning">Unsaved changes</StatusIndicator>
          }
          actions={
            <>
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                Reset
              </Button>
              <Button ref={saveRef} variant="primary">
                Save
              </Button>
            </>
          }
        />
      </Stack>
      {simulateAdminHost ? (
        <>
          <ToastRegion queue={engineToastQueue} label="Engine notifications" />
          <ToastRegion
            queue={networkToastQueue}
            label="Network notifications"
          />
        </>
      ) : null}
    </PanelRoot>
  );
}

const container = document.querySelector("#root");
if (!(container instanceof HTMLElement)) {
  throw new Error("Browser fixture root was not found.");
}

createRoot(container).render(
  <StrictMode>
    <main className={simulateAdminHost ? "app-body" : undefined}>
      <Fixture />
      {simulateAdminHost ? (
        <div className="admin-host__after-panel-content" aria-hidden="true" />
      ) : null}
    </main>
  </StrictMode>,
);

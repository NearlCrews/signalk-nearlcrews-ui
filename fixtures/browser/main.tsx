import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  ActionBar,
  Banner,
  Button,
  Checkbox,
  Disclosure,
  InlineConfirm,
  LabeledField,
  NumberInput,
  PanelRoot,
  RangeInput,
  Section,
  SegmentedControl,
  StatusIndicator,
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
  const indeterminateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (indeterminateRef.current !== null) {
      indeterminateRef.current.indeterminate = true;
    }
  }, []);

  return (
    <PanelRoot legacyThemeStorageKeys={["fixture-theme"]}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem" }}>Weather provider</h1>
          <StatusIndicator tone="success">Connected</StatusIndicator>
        </div>
        <ThemeToggle />
      </header>

      <Banner tone="info" title="Server units apply">
        Values are stored in SI and displayed using Signal K preferences.
      </Banner>

      <Section
        title="Connection"
        description="Configure the provider without changing domain behavior."
      >
        <LabeledField
          label="Server URL"
          description="The address of the Signal K server."
          required
        >
          <TextInput defaultValue="http://localhost:3000" />
        </LabeledField>
        <LabeledField label="Refresh interval" description="Seconds">
          <NumberInput defaultValue={10} min={1} max={300} />
        </LabeledField>
        <LabeledField label="Confidence threshold">
          <RangeInput defaultValue={75} min={0} max={100} />
        </LabeledField>
        <Checkbox
          label="Enable provider"
          description="Missing optional capabilities degrade cleanly."
          defaultChecked
        />
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
      </Section>

      {showStates ? (
        <Section title="Component states">
          <Banner tone="danger" title="Provider unavailable">
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
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginTop: "0.75rem",
            }}
          >
            <Button disabled>Disabled</Button>
            <Button loading>Saving</Button>
            <Button onClick={() => setConfirmBusy((current) => !current)}>
              Toggle confirmation busy
            </Button>
          </div>
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

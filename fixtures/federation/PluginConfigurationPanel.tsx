import {
  Button,
  PanelRoot,
  StatusIndicator,
  ThemeToggle,
} from "signalk-nearlcrews-ui";
import { EmptyState } from "signalk-nearlcrews-ui/composites";
import { Cell, Column, DataGrid, Row } from "signalk-nearlcrews-ui/data-grid";
import { SecretInput } from "signalk-nearlcrews-ui/forms";
import { createToastQueue, ToastRegion } from "signalk-nearlcrews-ui/overlays";

interface FixtureConfiguration {
  readonly saveCount: number;
}

interface PluginConfigurationPanelProps {
  readonly configuration: unknown;
  readonly save: (configuration: unknown) => void;
}

const queue = createToastQueue();
const gridRows = [{ id: "entry", label: "Data-grid entry ready" }] as const;

function readConfiguration(value: unknown): FixtureConfiguration {
  if (
    typeof value === "object" &&
    value !== null &&
    "saveCount" in value &&
    typeof value.saveCount === "number"
  ) {
    return { saveCount: value.saveCount };
  }
  throw new Error("Federation fixture received an invalid configuration prop.");
}

export default function PluginConfigurationPanel({
  configuration: configurationValue,
  save,
}: PluginConfigurationPanelProps): React.JSX.Element {
  const configuration = readConfiguration(configurationValue);

  return (
    <PanelRoot>
      <ThemeToggle />
      <StatusIndicator tone="success">Fixture ready</StatusIndicator>
      <p>Saved {configuration.saveCount} times</p>
      <EmptyState
        title="Composite entry ready"
        description="Loaded through the composites subpath."
      />
      <DataGrid
        aria-label="Federation data-grid entry"
        items={gridRows}
        renderRow={(item) => (
          <Row>
            <Cell>{item.label}</Cell>
          </Row>
        )}
      >
        <Column isRowHeader>Entry</Column>
      </DataGrid>
      <SecretInput
        aria-label="Federation forms entry"
        defaultValue="Forms entry ready"
      />
      <Button
        variant="primary"
        onClick={() => {
          save({ saveCount: configuration.saveCount + 1 });
        }}
      >
        Save configuration
      </Button>
      <Button
        variant="primary"
        onClick={() => {
          queue.enqueue({ title: "Host portal ready", duration: 0 });
        }}
      >
        Notify
      </Button>
      <ToastRegion queue={queue} />
    </PanelRoot>
  );
}

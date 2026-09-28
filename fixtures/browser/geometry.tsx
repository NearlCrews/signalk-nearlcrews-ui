import {
  Badge,
  Banner,
  Button,
  Card,
  Cluster,
  CollapsibleSection,
  type CollapsibleSectionProps,
  PanelRoot,
  Stack,
} from "signalk-nearlcrews-ui";
import { Progress } from "signalk-nearlcrews-ui/composites";
import { mountFixture } from "./mount.js";

/*
 * Layouts only a browser can measure, for tests/browser/design.spec.ts: a
 * toned Progress glyph beside a one-line label and beside one that wraps, a
 * Banner whose only action is a link shorter than a control, a Card whose
 * long footnote must not widen it inside a start-aligned Cluster, and the
 * panel page's CollapsibleSection header with a summary badge and an action,
 * plain and toned.
 */

const FOOTNOTE =
  "Readings come from the engine gateway on the NMEA 2000 backbone and refresh every two seconds while the ignition is on, then every minute after it turns off.";

/** The panel page's collapsible header: a healthy badge and a Refresh action. */
function StatusSection(
  props: Pick<CollapsibleSectionProps, "title" | "tone">,
): React.JSX.Element {
  return (
    <CollapsibleSection
      {...props}
      summary={<Badge tone="success">3 checks healthy</Badge>}
      summaryPlacement="header"
      actions={<Button size="compact">Refresh</Button>}
    >
      Metrics appear here once the provider reports.
    </CollapsibleSection>
  );
}

mountFixture(
  <PanelRoot>
    <Stack gap={3}>
      <Progress label="Tank" tone="warning" value={40} />
      <Progress
        label="Fresh water tank level reported by the forward sender on the port side"
        tone="warning"
        value={40}
      />
      <Banner
        tone="info"
        title="Plugin settings moved"
        actions={<a href="#settings">Open plugin settings</a>}
      >
        Units now follow the server's preferences.
      </Banner>
      <Cluster align="start">
        <Card header="Engine" footer={FOOTNOTE}>
          Oil pressure 3.1 bar
        </Card>
        <Card header="Battery">12.6 V</Card>
      </Cluster>
      <StatusSection title="Provider status and metrics" />
      <StatusSection tone="info" title="Provider status" />
      <StatusSection tone="danger" title="Provider alerts and metrics" />
    </Stack>
  </PanelRoot>,
);

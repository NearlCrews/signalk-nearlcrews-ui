import {
  Button,
  PanelRoot,
  StatusIndicator,
  ThemeToggle,
} from "signalk-nearlcrews-ui";

export default function Panel(): React.JSX.Element {
  return (
    <PanelRoot>
      <ThemeToggle />
      <StatusIndicator tone="success">Fixture ready</StatusIndicator>
      <Button variant="primary">Save</Button>
    </PanelRoot>
  );
}

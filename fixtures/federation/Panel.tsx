import {
  Button,
  PanelRoot,
  StatusIndicator,
  ThemeToggle,
} from "signalk-nearlcrews-ui";
import { createToastQueue, ToastRegion } from "signalk-nearlcrews-ui/overlays";

const queue = createToastQueue();

export default function Panel(): React.JSX.Element {
  return (
    <PanelRoot>
      <ThemeToggle />
      <StatusIndicator tone="success">Fixture ready</StatusIndicator>
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

import { useEffect, useState } from "react";

import {
  Banner,
  Button,
  Cluster,
  type PanelAnnounce,
  PanelShell,
  Section,
  usePanelAnnouncer,
} from "signalk-nearlcrews-ui";
import { SaveActionBar } from "signalk-nearlcrews-ui/composites";
import {
  createToastQueue,
  Dialog,
  Menu,
  MenuItem,
  Popover,
  ToastRegion,
} from "signalk-nearlcrews-ui/overlays";
import { mountFixture } from "./mount.js";

/*
 * Every package surface that speaks, each reachable while an overlay hides the
 * rest of the panel, so the live-region spec can prove the words land in an
 * element assistive technology can still reach.
 */

declare global {
  interface Window {
    /**
     * The panel announcer, for a spec that has to speak while a menu or a
     * popover is open: activating anything in the panel would close it.
     */
    snuiLiveRegions?: { readonly announce: PanelAnnounce };
  }
}

const toastQueue = createToastQueue();

/** How long the fixture's save takes, so the saving state is observable. */
const SAVE_DURATION_MS = 150;

function LiveRegionsFixture(): React.JSX.Element {
  const announce = usePanelAnnouncer();
  useEffect(() => {
    window.snuiLiveRegions = { announce };
    return () => {
      delete window.snuiLiveRegions;
    };
  }, [announce]);
  const [bannerShown, setBannerShown] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dirty, setDirty] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveRequestedAt, setSaveRequestedAt] = useState<number | null>(null);

  return (
    <>
      <Section title="Speaking surfaces">
        <Cluster gap={2}>
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Dialog
            title="Anchor watch"
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            actions={(close) => <Button onClick={close}>Done</Button>}
          >
            <Cluster gap={2}>
              <Button onClick={() => announce("Anchor watch armed")}>
                Announce from the dialog
              </Button>
              <Button
                onClick={() =>
                  announce("Anchor drag detected", { assertive: true })
                }
              >
                Interrupt from the dialog
              </Button>
              <Button
                onClick={() =>
                  toastQueue.enqueue({
                    title: "Depth alarm",
                    description: "Depth below 2 m.",
                    tone: "danger",
                  })
                }
              >
                Raise a failure toast
              </Button>
            </Cluster>
          </Dialog>
          <Menu label="Panel actions">
            <MenuItem id="refresh">Refresh data</MenuItem>
          </Menu>
          <Popover trigger={<Button>About the watch</Button>}>
            The watch compares the position with the anchor drop point.
          </Popover>
          <Button onClick={() => setBannerShown(true)}>Show the notice</Button>
        </Cluster>
        {bannerShown ? (
          <Banner tone="warning" title="Wind rising" live="polite">
            Gusts above 25 kn are forecast within the hour.
          </Banner>
        ) : null}
      </Section>
      <SaveActionBar
        dirty={dirty}
        saving={saving}
        saveRequestedAt={saveRequestedAt}
        onDiscard={() => setDirty(false)}
        onSave={() => {
          setSaving(true);
          setSaveRequestedAt(Date.now());
          window.setTimeout(() => {
            setSaving(false);
            setDirty(false);
          }, SAVE_DURATION_MS);
        }}
      />
      <ToastRegion queue={toastQueue} />
    </>
  );
}

mountFixture(
  <PanelShell themeToggle="end">
    <LiveRegionsFixture />
  </PanelShell>,
);

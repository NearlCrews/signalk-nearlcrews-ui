import { createValueContext } from "./context.js";
import { warnOnce } from "./warn-once.js";

export interface PanelAnnounceOptions {
  /**
   * Interrupts whatever the reader is saying, for a failure the operator has
   * to hear now. Default false, which waits for the next pause.
   */
  readonly assertive?: boolean | undefined;
}

/**
 * Speaks a message through the panel's own live regions.
 *
 * Each message is added to its region as a node of its own, so the same words
 * twice in a row are read twice and two messages from one handler are both
 * read. Each leaves the region on its own after seven seconds, so an old
 * status never waits in the region for a reader in browse mode, and there is
 * nothing to clear by hand. Blank text is ignored.
 */
export type PanelAnnounce = (
  message: string,
  options?: PanelAnnounceOptions,
) => void;

/**
 * Outside a `PanelShell` there are no panel regions to speak through, so a
 * message is dropped rather than mounting a region beside it, which is the
 * arrangement screen readers do not reliably announce. The developer is told
 * once, because a silent announcer looks exactly like a working one, and the
 * warning names the package's own callers too, since a panel built on
 * `PanelRoot` meets it through `FreshnessNote` or the error fallback without
 * ever calling the hook.
 */
const NO_PANEL_ANNOUNCER: PanelAnnounce = () => {
  warnOnce(
    "panel-announcer:no-shell",
    "A panel announcement from usePanelAnnouncer, FreshnessNote, or the PanelErrorBoundary fallback found no PanelShell, so it was dropped. PanelShell mounts the panel's live regions, and a panel composed from PanelRoot directly has none. Render the panel inside PanelShell; a message of your own can also go through a LiveRegion mounted before its first message.",
  );
};

/**
 * The panel's announcer. `PanelShell` mounts one polite and one assertive
 * region before any message exists, which is the whole point: a region
 * created together with its first message is not announced reliably, so a
 * panel that announces state changes should not mount its own region beside
 * the message it wants read. Both regions stay exposed to assistive
 * technology while a modal overlay hides the rest of the page.
 */
export const { Provider: PanelAnnouncerProvider, useValue: usePanelAnnouncer } =
  createValueContext<PanelAnnounce>(NO_PANEL_ANNOUNCER);

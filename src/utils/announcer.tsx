import { createValueContext } from "./context.js";

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
 * Passing the same words twice in a row announces them twice: the regions
 * carry an announcement key, so a repeated message is not swallowed as an
 * unchanged region.
 */
export type PanelAnnounce = (
  message: string,
  options?: PanelAnnounceOptions,
) => void;

/**
 * Outside a `PanelShell` there are no panel regions to speak through, so a
 * message is dropped rather than mounting a region beside it, which is the
 * arrangement screen readers do not reliably announce.
 */
const NO_PANEL_ANNOUNCER: PanelAnnounce = () => undefined;

/**
 * The panel's announcer. `PanelShell` mounts one polite and one assertive
 * region before any message exists, which is the whole point: a region
 * created together with its first message is not announced reliably, so a
 * panel that announces state changes should not mount its own region beside
 * the message it wants read.
 */
export const { Provider: PanelAnnouncerProvider, useValue: usePanelAnnouncer } =
  createValueContext<PanelAnnounce>(NO_PANEL_ANNOUNCER);

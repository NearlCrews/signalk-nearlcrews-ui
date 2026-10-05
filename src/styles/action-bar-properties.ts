/**
 * The custom properties `ActionBar` writes onto its anchor from the docked
 * geometry it measures, keyed by the length each holds, and the root sheet's
 * docked rules read. Kept in a module of their own that imports nothing, so
 * the bar reads the names without bundling the root sheet into an entry that
 * never renders a panel.
 *
 * @internal
 */
export const ACTION_BAR_FIXED_PROPERTIES = {
  bottom: "--snui-action-bar-fixed-bottom",
  height: "--snui-action-bar-fixed-height",
  left: "--snui-action-bar-fixed-left",
  width: "--snui-action-bar-fixed-width",
} as const;

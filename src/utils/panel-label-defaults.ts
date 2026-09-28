/**
 * The package's English defaults for every string the panel label bundle can
 * replace, written once here and read both by the components that render
 * them and by consumer tests through `PANEL_LABEL_DEFAULTS`, so a test asserts
 * the words the package ships instead of retyping them.
 *
 * Each group is its own constant, so a component imports the one group it
 * renders and a bundler drops the rest: every initializer here is pure.
 */

import { DEFAULT_RELATIVE_AGE_FALLBACK } from "./format-relative-age.js";
import {
  DEFAULT_DISMISS_LABEL,
  DEFAULT_HIDE_LABEL,
  DEFAULT_LOADING_LABEL,
  DEFAULT_SHOW_LABEL,
} from "./labels.js";
import type { PanelLabels } from "./panel-labels.js";
import { TONE_LABELS } from "./tone.js";

/** A label group with every entry filled in, one level of nesting deep. */
type FilledLabelGroup<Group> = {
  readonly [Key in keyof Group]-?: Exclude<Group[Key], undefined> extends string
    ? string
    : { readonly [Entry in keyof Exclude<Group[Key], undefined>]-?: string };
};

/**
 * The shape of {@link PANEL_LABEL_DEFAULTS}: every group and key of
 * `PanelLabels`, filled, except `numberField`, whose messages are sentences
 * built from each field's own bounds rather than fixed strings.
 */
export type PanelLabelDefaults = {
  readonly [Group in Exclude<
    keyof PanelLabels,
    "numberField"
  >]-?: FilledLabelGroup<Exclude<PanelLabels[Group], undefined>>;
};

/**
 * The panel error fallback's defaults, read by `PanelErrorBoundary`. Consumers
 * read it through `PANEL_LABEL_DEFAULTS`.
 *
 * @internal
 */
export const PANEL_ERROR_LABEL_DEFAULTS: PanelLabelDefaults["panelError"] =
  /* @__PURE__ */ Object.freeze({
    /*
     * Each sentence describes the action beside it. Trying again is the light
     * action and is offered alone; reloading the page is the one that throws
     * away every unsaved entry on the Admin page, so its description carries
     * the warning and the other does not. The reload description repeats the
     * first sentence as plain text rather than a template: a substitution is
     * something a bundler cannot prove pure, and it would keep this group in
     * every bundle that reads any other.
     */
    description: "Try again reopens this panel without reloading the page.",
    reload: "Reload page",
    reloadDescription:
      "Try again reopens this panel without reloading the page. Reloading the page discards unsaved changes in every panel.",
    retry: "Try again",
    title: "This panel stopped working",
  });

/**
 * The save bar's defaults, read by `SaveActionBar`. Consumers read it through
 * `PANEL_LABEL_DEFAULTS`.
 *
 * @internal
 */
export const SAVE_ACTION_BAR_LABEL_DEFAULTS: PanelLabelDefaults["saveActionBar"] =
  /* @__PURE__ */ Object.freeze({
    // True whatever the server did with the last request, and it explains the
    // disabled Save beside it. "No unsaved changes" would differ from the
    // dirty status by one leading word, which misreads at a glance.
    clean: "Nothing to save",
    discard: "Discard",
    save: "Save",
    saved: "Save sent to the server",
    saving: "Saving changes",
    unconfigured: "Save to enable the plugin",
    unsaved: "Unsaved changes",
  });

/**
 * The theme selector's defaults, read by `ThemeToggle`. Consumers read it
 * through `PANEL_LABEL_DEFAULTS`.
 *
 * @internal
 */
export const THEME_TOGGLE_LABEL_DEFAULTS: PanelLabelDefaults["themeToggle"] =
  /* @__PURE__ */ Object.freeze({
    /*
     * Both automatic choices are named for what they follow. "Auto" and
     * "System" on their own read as the same offer, and an operator picking
     * the wrong one after dark gets the Light palette: Match Admin follows
     * the Signal K Admin theme where Admin shares one and Light where it does
     * not, while Match device follows the device's own light or dark setting.
     */
    choiceLabels: /* @__PURE__ */ Object.freeze({
      auto: "Match Admin",
      system: "Match device",
      light: "Light",
      dark: "Dark",
      night: "Night",
    }),
    /*
     * What Match Admin resolves to, in the operator's words. Signal K Admin
     * shares no theme today, so an operator picking it after dark gets the
     * Light palette and has no way to tell from the segment alone.
     */
    description:
      "Match Admin uses the Signal K Admin theme when Admin shares one, and Light until then.",
    label: "Panel theme",
  });

/**
 * The compatibility notice's defaults, read by `UnsupportedBrowserNotice`.
 * Consumers read it through `PANEL_LABEL_DEFAULTS`.
 *
 * @internal
 */
export const UNSUPPORTED_BROWSER_LABEL_DEFAULTS: PanelLabelDefaults["unsupportedBrowser"] =
  /* @__PURE__ */ Object.freeze({
    // Leads with the plain need, then names both ways out: a kiosk or embedded
    // WebView user often cannot update the engine, but can update or replace
    // the app that opens Admin.
    description:
      "This panel needs a newer browser. Update the browser, or the app that opens Signal K Admin, then open this panel again.",
    title: "Browser update required",
  });

/**
 * The inline confirmation's defaults, read by `InlineConfirm`. Consumers read
 * it through `PANEL_LABEL_DEFAULTS`.
 *
 * @internal
 */
export const INLINE_CONFIRM_LABEL_DEFAULTS: PanelLabelDefaults["inlineConfirm"] =
  /* @__PURE__ */ Object.freeze({
    cancel: "Cancel",
    confirm: "Confirm",
    fallbackTitle: "Confirm action",
  });

/**
 * The code block's default name, read by `Code`. Consumers read it through
 * `PANEL_LABEL_DEFAULTS`.
 *
 * @internal
 */
export const CODE_BLOCK_LABEL_DEFAULTS: PanelLabelDefaults["codeBlock"] =
  /* @__PURE__ */ Object.freeze({ label: "Code" });

/**
 * The freshness note's defaults, read by `FreshnessNote`. Consumers read it
 * through `PANEL_LABEL_DEFAULTS`.
 *
 * @internal
 */
export const FRESHNESS_NOTE_LABEL_DEFAULTS: PanelLabelDefaults["freshnessNote"] =
  /* @__PURE__ */ Object.freeze({
    fresh: "Checked {age}",
    freshAnnouncement: "Status is current again.",
    // A sample stamped more than a minute ahead of this clock, or ahead of it at
    // all under `options.negative: "fallback"`, has no age to state, so both
    // states say so in words instead.
    freshUnknown: "Checked at an unknown time",
    pending: "Not checked yet",
    // Words of its own, because "Checked" on a stale readout reads as
    // reassurance.
    stale: "Out of date: updated {age}",
    staleAnnouncement: "Status is out of date.",
    staleUnknown: "Out of date: last update time unknown",
  });

/**
 * The empty grid's default title, read by `DataGrid`. Consumers read it through
 * `PANEL_LABEL_DEFAULTS`.
 *
 * @internal
 */
export const DATA_GRID_LABEL_DEFAULTS: PanelLabelDefaults["dataGrid"] =
  /* @__PURE__ */ Object.freeze({ emptyTitle: "Nothing to show yet" });

/**
 * The destructive menu item's default tone name, read by `MenuItem`. Consumers
 * read it through `PANEL_LABEL_DEFAULTS`.
 *
 * @internal
 */
export const MENU_ITEM_LABEL_DEFAULTS: PanelLabelDefaults["menuItem"] =
  /* @__PURE__ */ Object.freeze({ tone: "Destructive action" });

/**
 * The unknown age's default wording, read by `RelativeAge`. Consumers read it
 * through `PANEL_LABEL_DEFAULTS`.
 *
 * @internal
 */
export const RELATIVE_AGE_LABEL_DEFAULTS: PanelLabelDefaults["relativeAge"] =
  /* @__PURE__ */ Object.freeze({ fallback: DEFAULT_RELATIVE_AGE_FALLBACK });

/**
 * The toast region's defaults, read by `ToastRegion`. Consumers read it through
 * `PANEL_LABEL_DEFAULTS`.
 *
 * @internal
 */
export const TOAST_REGION_LABEL_DEFAULTS: PanelLabelDefaults["toastRegion"] =
  /* @__PURE__ */ Object.freeze({
    dismiss: DEFAULT_DISMISS_LABEL,
    label: "Notifications",
  });

/**
 * Every default the panel label bundle can replace, grouped and keyed the way
 * `PanelLabels` is, and frozen. A consumer test imports the words it asserts
 * from here instead of retyping the package's copy, so a wording change in
 * the package does not break the consumer's suite. `numberField` is absent:
 * its messages are built from each field's bounds.
 */
export const PANEL_LABEL_DEFAULTS: PanelLabelDefaults =
  /* @__PURE__ */ Object.freeze({
    banner: /* @__PURE__ */ Object.freeze({ dismiss: DEFAULT_DISMISS_LABEL }),
    button: /* @__PURE__ */ Object.freeze({ loading: DEFAULT_LOADING_LABEL }),
    codeBlock: CODE_BLOCK_LABEL_DEFAULTS,
    dataGrid: DATA_GRID_LABEL_DEFAULTS,
    freshnessNote: FRESHNESS_NOTE_LABEL_DEFAULTS,
    inlineConfirm: INLINE_CONFIRM_LABEL_DEFAULTS,
    menuItem: MENU_ITEM_LABEL_DEFAULTS,
    panelError: PANEL_ERROR_LABEL_DEFAULTS,
    relativeAge: RELATIVE_AGE_LABEL_DEFAULTS,
    saveActionBar: SAVE_ACTION_BAR_LABEL_DEFAULTS,
    secretInput: /* @__PURE__ */ Object.freeze({
      hide: DEFAULT_HIDE_LABEL,
      show: DEFAULT_SHOW_LABEL,
    }),
    themeToggle: THEME_TOGGLE_LABEL_DEFAULTS,
    tone: TONE_LABELS,
    toastRegion: TOAST_REGION_LABEL_DEFAULTS,
    unsupportedBrowser: UNSUPPORTED_BROWSER_LABEL_DEFAULTS,
  });

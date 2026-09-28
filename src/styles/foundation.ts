import {
  FOCUS_RING_WIDTH,
  focusRingDeclarations,
  INSET_FOCUS_RING_OFFSET,
  NARROW_PANEL_QUERY,
  visuallyHiddenDeclarations,
} from "./fragments.js";
import { scopeStyles } from "./scope.js";
import { PANEL_CONTAINER_NAME } from "./tokens.js";

/** The Night theme root. Night is only ever chosen explicitly. */
const NIGHT_ROOT = ':scope[data-snui-theme="night"]';

/*
 * Glyphs for the native parts Night repaints, as masks so the color comes from
 * a token rather than from the browser's scheme. The number spinner is two
 * chevrons stacked in the button's full height, the clear button is a cross,
 * and the date pickers draw a calendar page and the time picker a clock.
 */
const SPIN_GLYPH =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 16'%3E%3Cpath d='M4 2 7 6H1zM4 14 1 10h6z'/%3E%3C/svg%3E\")";
const CLEAR_GLYPH =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 2 8 6.5 12.5 2 14 3.5 9.5 8l4.5 4.5-1.5 1.5L8 9.5 3.5 14 2 12.5 6.5 8 2 3.5z'/%3E%3C/svg%3E\")";
const CALENDAR_GLYPH =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M4 1h2v2h4V1h2v2h2v12H2V3h2zM3.5 6.5v7h9v-7z'/%3E%3C/svg%3E\")";
const CLOCK_GLYPH =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1zm0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM7.25 4h1.5v3.25H11v1.5H7.25z'/%3E%3C/svg%3E\")";

/**
 * The resize grip, a scrollbar part, takes no mask, so its two short diagonal
 * strokes are drawn as gradient bands in `color` on a clear corner. Like the
 * native grip, they sit in a small square inset from the corner, clear of the
 * field's border and its rounded corner. The browser puts the grip in the
 * bottom right corner, or the bottom left of a right-to-left field, and draws
 * it mirrored there, so `side` names the corner and turns the strokes to face
 * it. The two bands are equally wide and start a quarter of the tile apart,
 * four pixel diagonals of the 8 pixel tile, so both strokes land on the pixel
 * grid alike and keep one weight at every device pixel ratio that is a whole
 * number of quarters.
 */
function gripBackground(color: string, side: "left" | "right"): string {
  const angle = side === "right" ? "135deg" : "225deg";
  return `linear-gradient(${angle}, transparent 0 47%, ${color} 47% 56%, transparent 56% 72%, ${color} 72% 81%, transparent 81%) ${side} 3px bottom 3px / 8px 8px no-repeat`;
}

/**
 * A focused picker's ring is an outline inside the part, at the shared ring
 * width, which the glyph mask would clip away. These layers open that band
 * around the glyph, so the ring shows in full.
 */
const RING_BAND_MASK = [
  `linear-gradient(black 0 0) top / 100% ${FOCUS_RING_WIDTH} no-repeat`,
  `linear-gradient(black 0 0) bottom / 100% ${FOCUS_RING_WIDTH} no-repeat`,
  `linear-gradient(black 0 0) left / ${FOCUS_RING_WIDTH} 100% no-repeat`,
  `linear-gradient(black 0 0) right / ${FOCUS_RING_WIDTH} 100% no-repeat`,
].join(", ");

/** Every segment a date or time field edits, as the browser names its part. */
const DATETIME_FIELDS = [
  "year",
  "month",
  "week",
  "day",
  "hour",
  "minute",
  "second",
  "millisecond",
  "ampm",
] as const;

/** A mask, written for Chromium's prefixed property and the standard one. */
function maskDeclarations(mask: string): string[] {
  return [`  -webkit-mask: ${mask};`, `  mask: ${mask};`];
}

/** A glyph painted from the muted text token through `mask`. */
function glyphPaintDeclarations(mask: string): string[] {
  return [
    "  background-color: var(--snui-color-text-muted);",
    ...maskDeclarations(mask),
  ];
}

/**
 * The glyph layer of a picker, drawn in the part's content box as the
 * browser draws its own icon there. A focused Night picker adds
 * RING_BAND_MASK beside it, so the ring drawn inside the part at the shared
 * width shows in full.
 */
function pickerGlyphMask(glyph: string): string {
  return `${glyph} content-box center / contain no-repeat`;
}

/**
 * A picker's glyph, painted from the muted text token in its content box in
 * place of the browser's own icon image.
 */
function pickerPaintDeclarations(glyph: string): string {
  return [
    "  background-image: none;",
    "  background-clip: content-box;",
    ...glyphPaintDeclarations(pickerGlyphMask(glyph)),
  ].join("\n");
}

/**
 * A native button part repainted as a masked glyph. The part keeps its box,
 * its place, and its behavior: only the paint changes, so a theme never
 * removes a control the others offer.
 */
function maskedGlyphDeclarations(glyph: string, size: string): string {
  return [
    "  -webkit-appearance: none;",
    "  appearance: none;",
    `  width: ${size};`,
    "  margin-inline-start: var(--snui-space-1);",
    ...glyphPaintDeclarations(`${glyph} center / contain no-repeat`),
  ].join("\n");
}

/**
 * The width Chromium gives its own spin button on Linux and Windows, where the
 * native theme sizes it to the scrollbar. The repainted part keeps it, so the
 * pointer target stays as large as the one the other themes offer.
 */
const NATIVE_SPIN_BUTTON_WIDTH = "0.9375rem";

/** The picker part of every date input, which draws a calendar. */
const DATE_PICKER_INDICATOR =
  'input:is([type="date"], [type="datetime-local"], [type="month"], [type="week"])::-webkit-calendar-picker-indicator';

/** The picker part of a time input, which draws a clock. */
const TIME_PICKER_INDICATOR =
  'input[type="time"]::-webkit-calendar-picker-indicator';

/**
 * A focused Night picker: the ring in the focus token, and the glyph mask
 * with the ring's band opened beside it. The width and inset come from the
 * rule every theme shares.
 */
function focusedPickerDeclarations(glyph: string): string {
  return [
    "  outline-color: var(--snui-color-focus);",
    ...maskDeclarations(`${pickerGlyphMask(glyph)}, ${RING_BAND_MASK}`),
  ].join("\n");
}

/** Each date and time segment, as a Night selector list, with `state` added. */
function datetimeFields(state = ""): string {
  return DATETIME_FIELDS.map(
    (field) =>
      `${NIGHT_ROOT} input::-webkit-datetime-edit-${field}-field${state}`,
  ).join(",\n");
}

/** The inset fill that covers the browser's own autofill background. */
const AUTOFILL_COVER = "inset 0 0 0 100vmax var(--snui-color-surface)";

/**
 * The content padding at one step of the space scale, for the default panel
 * and the narrow one. The horizontal sides never shrink under a safe-area
 * inset, and they stay physical for the reason given where the rule lives.
 */
function contentPaddingDeclarations(step: number, indent: string): string {
  const space = `var(--snui-space-${String(step)})`;
  return [
    `${indent}padding-block: ${space};`,
    `${indent}padding-left: max(${space}, env(safe-area-inset-left, 0px));`,
    `${indent}padding-right: max(${space}, env(safe-area-inset-right, 0px));`,
  ].join("\n");
}

export const FOUNDATION_STYLES = scopeStyles(`
:scope,
*,
*::before,
*::after {
  box-sizing: border-box;
}

/*
 * The user-agent rule for [hidden] is a bare element selector, so any class
 * rule in this package that sets a display wins over it and an element toggled
 * through the hidden attribute keeps rendering. Restated here at class weight
 * with !important so the attribute means the same thing everywhere inside a
 * panel.
 */
[hidden] {
  display: none !important;
}

:scope {
  /*
   * Deliberately not a containing block. Toasts, dialogs, and the docked
   * action bar are position: fixed against the viewport, so none of them ever
   * needed one, while react-aria positions an anchored menu or popover
   * absolutely and measures the room it may grow into against the viewport. A
   * positioned panel root mixes those two frames: in a panel taller than the
   * viewport, every overlay opened after the page scrolls reports no room
   * below its trigger and renders clipped to an empty sliver.
   */
  position: static;
  width: 100%;
  max-width: none;
  margin-inline: auto;
  background: var(--snui-color-background);
  color: var(--snui-color-text);
  font-family: var(--snui-font-family);
  font-size: var(--snui-font-size);
  line-height: var(--snui-line-height);
  /*
   * The scoped subtree carries its own antialiasing rather than inheriting
   * whatever the host set, so the semibold weights the package leans on render
   * at the intended thickness on macOS.
   */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  container-name: ${PANEL_CONTAINER_NAME};
  /*
   * Size containment only. The scrim, the toast host, and the docked action
   * bar are position: fixed against the viewport from inside this box, so this
   * declaration must never grow into layout containment, which would make the
   * panel their containing block and offset every viewport coordinate the
   * measuring code writes into their custom properties.
   */
  container-type: inline-size;
}

/*
 * Horizontal safe-area insets belong to the content padding, so a panel in a
 * notched or rounded viewport keeps its text clear of the hardware edge. The
 * overlays read the same insets for their own geometry. The insets name
 * physical edges, so the padding stays physical too: routed through
 * padding-inline the left inset would land on the right edge of an RTL panel.
 */
.snui-root__content {
  min-width: 0;
${contentPaddingDeclarations(4, "  ")}
}

:scope.snui-root--standard {
  max-width: var(--snui-content-width-standard);
}

:scope.snui-root--wide {
  max-width: var(--snui-content-width-wide);
}

button,
input,
select,
textarea {
  font: inherit;
}

/*
 * Host applications ship global element styles that reach unclassed markup a
 * consumer renders inside a panel. Signal K Admin bundles Bootstrap Reboot,
 * whose legend, heading, block margins, code and keyboard styling, mark
 * highlight, label display, and button radius visibly change panel content.
 * These rules neutralize the known element-level host styles. They do not
 * override arbitrary higher-specificity selectors. Package components carry
 * their own classes, so they are unaffected.
 */
h1,
h2,
h3,
h4,
h5,
h6 {
  margin: 0;
  font-weight: var(--snui-font-weight-semibold);
  line-height: 1.3;
}

h1 { font-size: var(--snui-font-size-2xl); }
h2 { font-size: var(--snui-font-size-xl); }
h3 { font-size: var(--snui-font-size-lg); }
h4,
h5,
h6 { font-size: var(--snui-font-size); }

/* The display steps set their own leading: 1.3 reads loose at 24 and 20 px. */
h1,
h2 { line-height: 1.2; }

p,
ul,
ol,
dl,
dd,
figure,
blockquote,
address,
pre {
  margin: 0;
}

/*
 * The user agent indents a list with a magic number that differs between the
 * Admin host and a bare fixture, so the indent lands on the package space
 * scale instead. Package list primitives clear it with their own padding.
 */
ul,
ol {
  padding-inline-start: var(--snui-space-5);
}

b,
strong {
  font-weight: var(--snui-font-weight-bold);
}

small {
  font-size: var(--snui-font-size-sm);
}

code,
kbd,
pre,
samp {
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-family: var(--snui-font-family-mono);
  font-size: var(--snui-font-size-sm);
}

pre {
  overflow: auto;
}

/*
 * The host highlight is replaced rather than erased: a consumer marking a
 * matched Signal K path needs the emphasis the element exists for, and the
 * package tokens keep it readable in every theme.
 */
mark {
  padding: 0;
  background: var(--snui-color-accent-subtle);
  color: var(--snui-color-text);
}

label {
  display: inline;
}

legend {
  width: auto;
  padding: 0;
  float: none;
  margin-block-end: 0;
  font-size: inherit;
  line-height: inherit;
}

fieldset {
  min-width: 0;
  padding: 0;
  border: 0;
  margin: 0;
}

hr {
  height: 0;
  border: 0;
  border-block-start: 1px solid var(--snui-color-border-subtle);
  margin: 0;
  color: inherit;
  opacity: 1;
}

table {
  border-collapse: collapse;
}

th {
  font-weight: var(--snui-font-weight-semibold);
  text-align: start;
}

button {
  border-radius: var(--snui-radius-sm);
}

/*
 * Underline metrics come from the active system face, so the line sits where
 * the font's designer put it; hover keeps an explicit thickening as the
 * visible change. A button rendered as an anchor is not a link to read: it
 * keeps its variant's own color and no underline. The exclusion sits in
 * :where() so each rule keeps the weight a consumer's link override is
 * written against.
 */
a:any-link:where(:not(.snui-button)) {
  color: var(--snui-color-link);
  text-decoration-line: underline;
  text-decoration-thickness: from-font;
  text-underline-position: from-font;
  overflow-wrap: anywhere;
}

a:visited:where(:not(.snui-button)) {
  color: var(--snui-color-link-visited);
}

@media (hover: hover) {
  a:any-link:hover:where(:not(.snui-button)) {
    color: var(--snui-color-link-hover);
    text-decoration-thickness: 0.14em;
  }
}

button,
summary,
input[type="checkbox"],
input[type="range"] {
  touch-action: manipulation;
}

:focus-visible {
${focusRingDeclarations("outset", true)}
}

/*
 * A date or time picker is a part Chromium draws, with a ring of its own 2
 * pixels wide and inset by as much. Author :focus and :focus-visible never
 * reach the part, only :focus-within, so this rule sets just that ring's
 * width and inset from the shared token and leaves the browser to decide
 * whether it shows and in what color. At rest it matches the browser's ring;
 * a contrast request widens it with every other.
 */
${DATE_PICKER_INDICATOR}:focus-within,
${TIME_PICKER_INDICATOR}:focus-within {
  outline-width: ${FOCUS_RING_WIDTH};
  outline-offset: ${INSET_FOCUS_RING_OFFSET};
}

[disabled],
[aria-disabled="true"] {
  cursor: not-allowed;
}

/*
 * Night paints the browser's own chrome too. Left alone, the browser paints
 * it from its dark scheme: a blue selection, grey scrollbars, a white option
 * list, a blue autofill, system spin and clear buttons, white date and time
 * picker icons with a white focus ring, a pale blue focused date segment, and
 * a grey resize grip, all carrying the green and blue light the theme exists
 * to keep out. The token sheet cannot carry these rules, because tokens.css
 * styles no element. Scrollbar colors inherit, so one declaration on the root
 * reaches every scrolling box inside the panel, overlays included; Chromium
 * before 121 keeps its own scrollbar.
 */
${NIGHT_ROOT} {
  scrollbar-color: var(--snui-color-border) var(--snui-color-surface);
}

${NIGHT_ROOT}::selection,
${NIGHT_ROOT} ::selection {
  background-color: var(--snui-color-accent-fill);
  color: var(--snui-color-on-accent);
}

/*
 * Honored by the option lists Chromium and Firefox draw themselves on Windows
 * and Linux. The macOS, iOS, and Android pickers ignore author colors.
 */
${NIGHT_ROOT} option,
${NIGHT_ROOT} optgroup {
  background-color: var(--snui-color-surface-raised);
  color: var(--snui-color-text);
}

/*
 * The browser's autofill background is !important in its own sheet, so an
 * inset shadow of the field's surface covers it, and the text fill replaces
 * the system field text color. A focused field keeps its ring in front.
 */
${NIGHT_ROOT} input:autofill,
${NIGHT_ROOT} textarea:autofill {
  box-shadow: ${AUTOFILL_COVER};
  -webkit-text-fill-color: var(--snui-color-text);
  caret-color: var(--snui-color-text);
}

${NIGHT_ROOT} input:autofill:focus-visible,
${NIGHT_ROOT} textarea:autofill:focus-visible {
  box-shadow: var(--snui-focus-ring), ${AUTOFILL_COVER};
}

/*
 * The spinner is a mouse user's only pointer route to step a number, since a
 * wheel over a focused number field blurs it, and the clear button is the
 * only pointer route to empty a search field. Both are repainted, never
 * hidden.
 */
${NIGHT_ROOT} input[type="number"]::-webkit-inner-spin-button {
${maskedGlyphDeclarations(SPIN_GLYPH, NATIVE_SPIN_BUTTON_WIDTH)}
}

${NIGHT_ROOT} input[type="search"]::-webkit-search-cancel-button {
${maskedGlyphDeclarations(CLEAR_GLYPH, "0.875rem")}
  height: 0.875rem;
}

/*
 * The date and time pickers paint their icon as a background image drawn for
 * the browser's scheme. The image goes and a token-colored glyph takes its
 * place; the part keeps the box, padding, and behavior the browser gives it,
 * so the picker opens from the same target in every theme.
 */
${NIGHT_ROOT} ${DATE_PICKER_INDICATOR} {
${pickerPaintDeclarations(CALENDAR_GLYPH)}
}

${NIGHT_ROOT} ${TIME_PICKER_INDICATOR} {
${pickerPaintDeclarations(CLOCK_GLYPH)}
}

/*
 * A picker reached by keyboard keeps its ring, in the focus token rather than
 * the browser's white. The ring is drawn inside the part at the shared ring
 * width, which the glyph mask would clip, so the focused part's mask opens a
 * band that wide; with no background painted there, only the ring shows in
 * it. The rules key on :focus-within for the reason given with the width
 * rule, and the browser still decides whether a ring is drawn at all.
 */
${NIGHT_ROOT} ${DATE_PICKER_INDICATOR}:focus-within {
${focusedPickerDeclarations(CALENDAR_GLYPH)}
}

${NIGHT_ROOT} ${TIME_PICKER_INDICATOR}:focus-within {
${focusedPickerDeclarations(CLOCK_GLYPH)}
}

/*
 * Every segment of a date or time field reads in the field's own color. The
 * browser gives a segment it fixes as disabled, one that min and max or the
 * step pin to a single value, its own grey, and no author selector can pick
 * out just that segment.
 */
${datetimeFields()} {
  color: inherit;
}

/*
 * The segment being edited in a date or time field takes the selection pair
 * instead of the browser's pale blue highlight, keyed on :focus-within for the
 * same reason as the picker ring.
 */
${datetimeFields(":focus-within")} {
  background-color: var(--snui-color-accent-fill);
  color: var(--snui-color-on-accent);
}

/*
 * A textarea keeps its resize grip. The browser paints the grip from its own
 * scheme, so Night draws it from the token instead, in the same corner and at
 * the size the browser sets, mirrored in a right-to-left field as the
 * browser's own grip is. Chromium before 120 reads no :dir(), so there the
 * strokes keep the left-to-right shape.
 */
${NIGHT_ROOT} textarea::-webkit-resizer {
  background: ${gripBackground("var(--snui-color-text-muted)", "right")};
}

${NIGHT_ROOT} textarea:dir(rtl)::-webkit-resizer {
  background: ${gripBackground("var(--snui-color-text-muted)", "left")};
}

/*
 * Forced colors replace every background with the system canvas, which would
 * leave a masked glyph painted in the color behind it. The glyphs take the
 * system button text instead, and a focused picker's ring the system
 * highlight. The grip takes no mask, so it draws its strokes in the button
 * text on a clear corner rather than filling the corner.
 */
@media (forced-colors: active) {
  ${NIGHT_ROOT} input[type="number"]::-webkit-inner-spin-button,
  ${NIGHT_ROOT} input[type="search"]::-webkit-search-cancel-button,
  ${NIGHT_ROOT} ${DATE_PICKER_INDICATOR},
  ${NIGHT_ROOT} ${TIME_PICKER_INDICATOR} {
    forced-color-adjust: none;
    background-color: ButtonText;
  }

  ${NIGHT_ROOT} ${DATE_PICKER_INDICATOR}:focus-within,
  ${NIGHT_ROOT} ${TIME_PICKER_INDICATOR}:focus-within {
    outline-color: Highlight;
  }

  ${NIGHT_ROOT} textarea::-webkit-resizer {
    forced-color-adjust: none;
    background: ${gripBackground("ButtonText", "right")};
  }

  ${NIGHT_ROOT} textarea:dir(rtl)::-webkit-resizer {
    forced-color-adjust: none;
    background: ${gripBackground("ButtonText", "left")};
  }
}

.snui-visually-hidden {
${visuallyHiddenDeclarations(true)}
}

${NARROW_PANEL_QUERY} {
  .snui-root__content {
${contentPaddingDeclarations(3, "    ")}
  }
}

@media (prefers-reduced-motion: reduce) {
  /*
   * Scoped to elements this package styles. A blanket universal reset would
   * also suppress motion a consumer deliberately kept inside the panel, which
   * it could then only restore with an !important declaration.
   */
  :scope,
  [class^="snui-"],
  [class*=" snui-"],
  [class^="snui-"]::before,
  [class*=" snui-"]::before,
  [class^="snui-"]::after,
  [class*=" snui-"]::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`);

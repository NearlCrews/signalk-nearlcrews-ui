# Design contract

This contract defines the stable behavior shared by NearlCrews Signal K administration panels. It does not define plugin business behavior.

## Scope

The React package may own:

- Theme tokens and scoped component styling
- Accessible names, focus states, and keyboard interaction
- General-purpose form controls and layout
- Presentational feedback and confirmation surfaces, including how long a confirmation stays up
- Anchored and modal overlays: menus, popovers, dialogs, and notifications
- Generic tabular data display
- Coarse-pointer sizing, responsive behavior, reduced motion, and forced-colors behavior

The React package must not own:

- Signal K requests, paths, sources, unit-preference lookup, or provider detection
- Configuration schemas, reducers, or persistence
- Unit selection, display conversion, or SI conversion
- Save state, save timing, retry policy, or plugin restart detection
- Plugin-specific validation, status interpretation, or workflows
- Application-specific chartplotter framing, chart interaction, or navigation

Use the standard Signal K schema-generated configuration form for simple declarative fields only after verifying that every target Admin version preserves the schema features the plugin needs. Give schema properties useful titles, descriptions, and defaults where appropriate, and restrict `uiSchema` to fields and widgets verified against that host's installed React JSON Schema Form stack. The plugin API accepts full JSON Schema, but the current Admin form reconstructs a narrower root and does not preserve all root validation keywords. A plugin may use a custom administration panel when its interaction, validation, or schema needs richer behavior than that target host provides. The consumer exposes that panel as the default component from `./PluginConfigurationPanel`, declares the `signalk-plugin-configurator` discovery keyword, and accepts the host's `configuration` value and `save(configuration)` callback. That custom panel still owns its configuration, Signal K integration, units, validation, and save workflow. This package implements none of those host entry-point responsibilities.

The current host's `save` callback returns `void`, starts persistence without awaiting it, and updates its local configuration immediately. Calling it is a submission request, not durable-success evidence. A consumer panel may own local draft, dirty, and submission state. Confirmation, failure reporting, and retry policy require a plugin-owned API and remain outside this package.

Signal K executes embedded remotes as trusted same-origin code in the Admin document. `PanelRoot`, native CSS scope, versioned styles, and in-root portals provide presentation isolation only. They are not a JavaScript, storage, network, or DOM security boundary.

## Themes

The public theme names are `auto`, `system`, `light`, `dark`, and `night`.

- Auto is the implicit default when no valid shared preference exists. It is not written to storage, and it leaves `data-snui-theme` off the root so an optional Bootstrap, CoreUI, or legacy `.dark-mode` ancestor marker can apply. Signal K Admin does not guarantee or currently set one of these markers, so Auto uses the library's Light palette in an unmarked host.
- System is an explicit choice that follows `prefers-color-scheme` independently of the host theme.
- Light uses dark text on light surfaces. Its surface and raised surface are both white on purpose: a raised element such as a menu, a popover, or a metric on a card is distinguished by its border and shadow, and zebra rows take `--snui-color-surface-stripe` rather than the raised surface.
- Dark uses light text on dark surfaces and dark text on the brighter accent fill. The accent fill is light enough for that label to clear APCA Lc 60 as well as WCAG AA.
- Night uses red-preserving surfaces, text, focus, and status colors.

Night is red-preserving in a measurable sense. Every Night foreground token keeps its green and blue channels at or below `0x40`, so almost all of the light a panel emits is red, which dark-adapted eyes at a helm tolerate; the contrast tests enforce that cap. Text-class tokens (text, muted text, links, focus, the four tones, and the accent fills) also keep red at or above `0xe0` so they stay readable. Two tokens deliberately carry less red: `--snui-color-border` and `--snui-color-text-disabled`, because brightness is the only hierarchy the cap leaves and both must sit below text. The four tones and the five subtle fills therefore differ little or not at all in Night; hue alone is never the status signal, and visible text, glyphs, shapes, borders, and accessible tone labels carry the distinction. The cap also bounds contrast: the brightest allowed Night text reaches 5.9:1 against the surface, about APCA Lc 41, so Night is gated on WCAG AA and the APCA column in the contrast tests is advisory there. Like Light, Night keeps surface and raised surface within 1.05:1 and relies on border and shadow for elevation. Night styling ends at the panel root. It does not modify host chrome, the document body, or surrounding gutters. A full-surface night experience requires the host to coordinate those surfaces.

Theme preference is shared across NearlCrews administration panels through `signalk-nearlcrews-ui.theme.v1`, the only storage key the package reads or writes. Explicit selections, including Auto and System, are persisted. Panels mounted in the same document stay in sync through a same-document event, and open panels in other tabs follow the browser storage event. A panel hidden inside a retained `CollapsibleSection` observes neither, because a retained subtree runs its effect cleanups on collapse, so it re-reads the stored choice when the section reveals it again. A selection whose storage write fails remains current in the mounted panels for the page session but is not durable. Existing valid stored choices otherwise remain authoritative. A package version that does not recognize a choice written by another version ignores it instead of clearing the mounted theme. Binnacle and other chartplotter interfaces maintain separate product preferences.

## Public CSS tokens

These color token names are public API:

- `--snui-color-background`
- `--snui-color-surface`
- `--snui-color-surface-raised`
- `--snui-color-surface-stripe` (zebra rows; at least 1.05:1 against the surface in every theme)
- `--snui-color-interactive-hover` and its alias `--snui-color-surface-hover`
- `--snui-color-hover-raised` and its alias `--snui-color-surface-raised-hover` (hover and focused fills painted over the raised surface; the package points `--snui-color-interactive-hover` at it inside `.snui-toast`, `.snui-popover`, and `.snui-dialog`, so hover feedback stays visible on raised overlays)
- `--snui-color-text`
- `--snui-color-text-muted`
- `--snui-color-text-disabled` (disabled text; at least 3:1 against the surface, replacing opacity)
- `--snui-color-border`
- `--snui-color-track` (range and progress track fill)
- `--snui-color-accent-fill`
- `--snui-color-accent-fill-hover`
- `--snui-color-accent-subtle`
- `--snui-color-on-accent`
- `--snui-color-link`
- `--snui-color-link-hover`
- `--snui-color-link-visited`
- `--snui-color-focus`
- `--snui-color-success` and `--snui-color-success-subtle`
- `--snui-color-warning` and `--snui-color-warning-subtle`
- `--snui-color-danger` and `--snui-color-danger-subtle`
- `--snui-color-info` and `--snui-color-info-subtle`

The subtle tokens are tinted backgrounds for a tone: selected rows, pressed fills, and tone-colored surfaces. Primary text, muted text, and the tone's own color all meet WCAG AA on them in every theme, so a consumer can paint a tinted panel without deriving its own `color-mix`. The two hover aliases name the same fills as the tokens they alias with one word order (surface first, then state); both spellings are public and the aliases are derived from the pair, so they cannot drift.

These foundation token names are also public API:

- `--snui-font-family` and `--snui-font-family-mono`
- `--snui-font-size`
- `--snui-font-size-sm` and `--snui-font-size-xs`
- `--snui-font-size-lg`, `--snui-font-size-xl`, and `--snui-font-size-2xl`
- `--snui-font-weight-medium`, `--snui-font-weight-semibold`, `--snui-font-weight-bold`, and `--snui-font-weight-heavy`
- `--snui-line-height`
- `--snui-space-1` through `--snui-space-8`
- `--snui-radius-sm`, `--snui-radius-md`, `--snui-radius-lg`, and `--snui-radius-pill`
- `--snui-control-min-height`
- `--snui-range-thumb-size`, `--snui-range-progress-color`, and `--snui-range-track-color`
- `--snui-input-group-control-min` and `--snui-input-group-control-basis`
- `--snui-content-width-standard`
- `--snui-content-width-wide`
- `--snui-focus-ring`
- `--snui-shadow-flat`, `--snui-shadow-raised`, and `--snui-shadow-overlay`
- `--snui-color-scrim`
- `--snui-ease-standard`
- `--snui-transition-fast`, `--snui-transition-normal`, and `--snui-transition-slow`
- `--snui-motion-spin`
- `--snui-z-sticky`, `--snui-z-overlay`, `--snui-z-modal`, and `--snui-z-toast`

The type scale is base (0.9375rem), sm, xs, lg (1.125rem), xl (1.25rem), and 2xl (1.5rem). The heading reset routes `h1` through `h4` down that scale (2xl, xl, lg, base), and package headings of equal level share a step, so a `Section` title and a `CollapsibleSection` title at the same level render at the same size. The type stack is system fonts, so the weight tokens use values static faces carry: medium 500, semibold 600, bold 700, and heavy 800. Segoe UI, Roboto, and Liberation Sans ship 400 and 700, and most ship 500 and 600 as well; a face without a weight degrades to its nearest available weight rather than to a synthesized one.

Some public tokens exist for consumer use and are not consumed by every package component: `--snui-shadow-flat`, `--snui-transition-slow`, `--snui-space-7`, and `--snui-space-8`. They are part of the contract and are tested for presence in every theme block like every other token. `--snui-color-hover-raised`, `--snui-transition-normal`, and `--snui-font-family-mono` are consumed by package components (raised hover fills, dialog and popover motion, and the `Code` primitive).

All three motion durations share `--snui-ease-standard`. `--snui-focus-ring` is a two-tone shadow: a surface-colored band the width of the focus outline offset, then a soft focus-colored halo outside the outline, so the ring keeps its own boundary beside a danger or accent edge.

Token values may change in a compatible release to fix contrast, browser behavior, or theme consistency. Removing or renaming a public token is breaking.

Consumers may override public tokens through the native `style` prop on `PanelRoot`. Token overrides must remain on that versioned root and must not target private classes or DOM structure. Inline overrides apply across theme choices, so consumers must verify Light, Dark, and Night contrast before using them.

The same tokens ship as a framework-neutral stylesheet at `signalk-nearlcrews-ui/tokens.css`, for panels that do not use React. The `snui-tokens` class it styles is public API. Both stylesheets are rendered from one source, so the palettes cannot diverge. The neutral sheet declares only custom properties and `color-scheme`, styles no element of its own, and requires no native CSS `@scope` support. It reads `data-snui-theme` exactly as the component root does, and follows an explicit Bootstrap, CoreUI, or legacy `.dark-mode` host theme when that attribute is absent.

That class is the one documented exception to version-scoped styling. It carries no version, so the last copy loaded into a document defines the tokens for every element carrying the class, control sizing tokens included. The exception is deliberate: requiring a version in consumer markup would defeat the point of a sheet meant for panels with no build-time knowledge of this package. Version isolation remains available only through `PanelRoot`.

## Presentation utilities

`formatRelativeAge` formats an elapsed age in milliseconds through `Intl.RelativeTimeFormat`, clamping skew down to minus 60 seconds to now and returning the caller's fallback beyond that. `formatRelativeAgeSince` derives that age from an epoch-millisecond, ISO string, or `Date` timestamp against a caller-supplied `nowMs`. `RelativeAge` is the one place the package reads the clock: given `since` it ticks on a shared interval and stamps a `<time dateTime>`. None of them decides whether data is stale or assigns domain meaning to an age. Consumers choose any unavailable-data fallback and retain ownership of freshness policy.

`SecretInput` owns only password-visibility presentation. It does not store, fetch, authorize, encrypt, or redact its value. Consumers retain those responsibilities and must not treat a concealed native input as a security boundary.

## Accessibility

- Normal text and control labels must meet WCAG AA contrast.
- Accent fills use a separate on-accent token. The foreground must not be assumed to be white.
- Focus must be visible in every theme.
- Status must include visible text or another non-color cue. `Badge` and `Metric` render a tone glyph, and `StatusIndicator` renders a per-tone dot shape beside the glyph, so tone never depends on color alone. The info dot is a rounded square with a proportional radius, so it stays distinct from the neutral circle at every dot size. Consumers may localize the announcement with `toneLabel`.
- Banners include a visible severity symbol as well as screen-reader severity text. Consumers may localize the text with `toneLabel`.
- A `Banner` given a landmark `role` and no name of its own is named by its visible title, so the landmark and the words on screen cannot drift apart. A consumer `aria-label` or `aria-labelledby` decides where one is given, and a live role is left unnamed, because it announces its own contents.
- Single-choice segmented controls use radio-group semantics, roving focus, arrow keys, Home, and End.
- Horizontal segmented-control arrows follow document direction, and collapsible carets mirror in right-to-left layouts.
- A titled `PanelShell` heads everything it renders, so the `Section` and `CollapsibleSection` inside it take the level below its title and the panel has one outline rather than a row of same-level headings. Outside a shell, and under a shell with no title, both stay at level 2; an explicit `headingLevel` always decides, and a derived level stops at 6. Nesting past that one step is the consumer's to name, because two sections in the same panel are not necessarily one inside the other.
- Collapsible sections expose a named region and real heading, keep header summaries and actions outside the toggle, restore focus when focused content closes, and preserve the `aria-controls` target while collapsed.
- A disclosure panel that holds focus when it closes hands that focus to its trigger, whatever closed it: the trigger, `setOpen`, or the consumer setting `open` from a control inside the panel. Opening still moves focus into the panel only when the trigger was pressed, and a close while focus sits outside the panel moves nothing. The panel container stays mounted while closed so `aria-controls` resolves.
- A `Banner` that holds focus when it goes hands that focus to `dismissFocusRef`, whatever took it away: the Dismiss press, an action that unmounts the banner, or an announcing banner whose actions go with its message. A banner that did not hold focus moves nothing, and the handoff runs early enough that a panel focusing what it renders in the banner's place keeps that focus.
- Persistent banners are not live regions unless the consumer explicitly requests polite or assertive announcements.
- An announcing `Banner`, `StatusIndicator`, or `Metric` value mounts its region before its content, the same rule the field errors follow. With `live` set, or a live `role` given to `Banner` or `StatusIndicator`, and nothing to show, the component renders the element that carries the role empty, without its tone glyph, dot, or unit, and the stylesheet takes that empty element out of the flow rather than out of the accessibility tree: it paints no box, border, padding, or margin while it waits. So render the component wherever the panel can produce a message and let its content go empty, rather than mounting it beside the first message. A `Banner` carrying actions is never empty, because hiding a focusable control would strand it.
- A field owns the whole of its control's `aria-describedby`: the description and the error it renders, then any ids the consumer names in `controlDescribedBy`, merged into one attribute in that reading order. A caller spreads the control props and never rebuilds the list.
- Persistent field and checkbox errors default to `aria-live="off"`. Consumers opt in to polite or assertive announcements when validation changes after an interaction. When announcements are requested, the region is mounted before its content arrives, because a live region created together with its message is not announced reliably.
- Checkboxes expose the native mixed state through `indeterminate`, and platform interaction clears the mixed state as usual. Range inputs show a filled progress track alongside their thumb position.
- The save bar owns how long it reports a save request: `savedMessageDurationMs` from `saveRequestedAt`, after which the status returns to the state underneath and announces it, the same sequence in every panel. A consumer that ends the window on something other than the clock passes zero and clears the timestamp itself.
- Loading buttons remain focusable, expose busy and disabled accessibility states, and suppress repeat pointer and keyboard activation. The accessible name stays stable while busy, and the loading label is exposed as a description, so the control is not announced as a different element mid-interaction.
- Disabled text takes `--snui-color-text-disabled`, a measured token at least 3:1 against the surface, rather than an opacity that dims an unmeasurable amount. Opacity remains only on icon-only children of a disabled control.
- Confirmation regions receive initial focus so their message is announced on open, support Escape whether or not they are busy, and restore focus when dismissed. `busy` blocks Confirm alone: declining is the user's route out of the region, so Cancel stays enabled and Escape stays live, the same rule `AlertDialog` follows. Confirm blocks activation through `aria-disabled` rather than leaving the tab order, so focus is never destroyed and chased across a busy transition.
- `AlertDialog` always renders an enabled, explicitly labeled cancel action before supplemental actions. A destructive or busy supplemental action may not remove the user's route out of the alert dialog.
- A `Popover` trigger must be a semantic interactive element that accepts the injected event and ARIA props and forwards its ref to that element. The library `Button` satisfies this contract. A custom trigger that drops any injected behavior is unsupported.
- `SecretInput` uses an explicit Show or Hide button whose accessible name reports the available action. Pointer activation preserves the input's focus, caret, and selected range, while keyboard activation retains normal button focus behavior.
- `DataGrid` exposes one row-header column, a complete accessible collection, controlled sorting, and React Aria keyboard navigation whether its rows are virtualized or rendered directly.
- `UnsupportedBrowserNotice` is a standalone notice with an overridable heading and body. Consumers render it instead of `PanelRoot` only after their own CSS-scope preflight fails.
- `ariaDisabled` buttons remain focusable, suppress pointer and keyboard activation, and use disabled presentation.
- Every control that can be held unchangeable offers a way to do it without leaving the tab order, because setting native `disabled` on the control the user is standing on destroys their focus and drops them on the body. `Button` and `Checkbox` take `ariaDisabled`, and `Switch` and `RadioGroup` take `readOnly`, which React Aria implements for them. A blocked `Checkbox` keeps its checked state, keeps its mixed state, goes on submitting with its form, and refuses the change from the box, the label, and the Space key alike; `Enter` still reaches the form. `CheckboxGroup` takes `ariaDisabled` per option, and select-all leaves blocked options as it finds them. Native `disabled` keeps its meaning throughout: the control is unavailable, and giving up its tab stop is part of saying so.
- Raw links inside a panel use theme-safe link tokens for default, visited, and hover states. Underline thickness and position come from the active font's own metrics, and hover thickens the line explicitly.
- Coarse-pointer controls have a minimum target height of 44 pixels, and text controls render at 16 CSS pixels or larger there so iOS Safari does not zoom the page on focus. Selectable `DataGrid` rows at `density="compact"` are the single documented exception, recorded under density below.
- Motion is effectively disabled for package-owned elements when `prefers-reduced-motion` requests it. The reset does not reach consumer-owned subtrees, so a consumer may keep an animation that is essential to meaning.
- Forced colors preserves native adjustment by default. Where a state distinction would otherwise be flattened, it is reconstructed with a system color or an outline rather than with color: invalid controls and danger buttons carry a dashed outline, primary buttons and selected segmented options use `Highlight`, and banner and badge borders keep system colors so the state survives. Links and the unrestricted banner action slot return to automatic system-color mapping, including consumer-supplied native controls.
- High-contrast requests through `prefers-contrast: more` strengthen control borders to the text color and widen focus outlines to 3 pixels.
- Reduced-transparency requests through `prefers-reduced-transparency: reduce` replace the translucent sticky action bar with an opaque surface and remove its backdrop blur.
- A live region with a role does not also carry `aria-live`, because the pairing double speaks on some screen readers and an explicit `off` would silence a caller-supplied role.
- Announcing the words a live region already carries is the region's own job. `LiveRegion` empties itself for a tenth of a second whenever `announceKey` changes and then restores `message`, so a screen reader reads a real change instead of comparing identical text and staying silent. Messages stay plain text: no invisible character pads them, and nothing appears on screen.
- Toasts stay reachable under a modal: the notifications host is a React Aria top layer, so it is neither hidden nor inert while a dialog is open, and F6 moves focus into the notifications region and back to where it was. Dismissing a toast moves focus to the next toast, else back to the control that had it, never to the document body.
- Focus indicators use `--snui-color-focus`, a visible 2-pixel outline with at least 3:1 contrast against adjacent surfaces. Controls take a 2-pixel outset ring with the two-tone shadow from `--snui-focus-ring`, whose surface-colored inner band keeps the ring distinct from a danger or accent edge it sits beside; dense rows and menu items take an inset ring so the outline is not clipped by neighboring rows. Night preserves this through tokens rather than a theme-name check, and its indicators are never thinner or dimmer than another theme's.

## Styling isolation

Every descendant selector is inside a native CSS scope rooted at the exact package version and bounded by the next versioned root, such as:

```css
@scope (.snui-root[data-snui-version="0.10.1"])
  to ([data-snui-version]) {
  /* component rules */
}
```

The root token declarations and host-ancestor theme selectors intentionally remain outside `@scope`. They target the exact versioned root itself, including a root beneath a host theme marker, rather than styling its descendants. Wrapping those selectors would prevent the root and host-theme cases from resolving correctly. Every rule that styles panel descendants remains inside the version-bounded scope.

`@keyframes` rules are the other thing written outside the scope block: a keyframes rule is not a descendant rule and cannot live inside `@scope`, so every module declares its keyframes at the top level under a name that carries the package version (`snui-v0-10-0-spin`, for example). The versioned name is what keeps two package copies in one document from redefining each other's animations.

Style delivery is modular. `PanelRoot` installs the root sheet (tokens, the foundation reset, buttons, text inputs, selects, checkboxes, segmented controls, components, forms, layout, the semantic table, tabs, feedback, and collapsible sections) on every mount. Every other component's rules form a module of their own, one per component: `dialog`, `empty-state`, `menu`, `popover`, `progress`, `radio`, `range`, `switch`, `table`, `textarea`, and `toast`. Each is installed by the one component that renders it, in the same document, under the same package version and CSP nonce as the root sheet, and removed when the last consumer unmounts. A panel that renders no dialog therefore carries no dialog CSS, neither installed at runtime nor bundled: a module is reached only from its own component, so a bundler drops it with the component. The JavaScript entry-point boundaries described under Compatibility hold for CSS too. The root sheet is the `<style data-snui-styles="…">` element; module sheets carry `data-snui-module-styles` with the version and `data-snui-style-module` with the module id, and a module sheet always follows the root sheet of its version in the head so cascade order (root, then modules) holds even after a host removes and the package re-appends the root sheet.

A module is not a promise that its component needs `PanelRoot`. The overlays listed below throw outside one because they have nowhere to portal; an in-flow control installs its module when it has an owning root and renders unstyled without one, exactly as it did while its rules traveled in the root sheet.

Only the root sheet has a fixed place in that cascade. Modules install in mount order, so no two of them may write a rule for the same class; each owns one component's classes outright, and their relative order therefore cannot change a computed style. A rule that names a moved class but belongs to a component that stayed behind stays in the root sheet with its owner: `InputGroup` sizes a slider it lays out, and every field shares the rule that takes an empty error region out of flow.

`PanelRoot` reference-counts one style element per package version, CSP nonce, and module in the rendered root's owner document. Independently bundled remotes share the same document registry, and conflicting CSS that claims the same version and module is rejected even when nonces differ. The final root using a version and nonce unmount removes its style element. Descendant selectors stop at every nested versioned root, a matching inner root re-enters its own scope, CSS variables are defined on the matching root, and nothing is written to `:root`. Internal classes and DOM nesting are private API.

Consumer CSS that targets a package class must account for the scope. A rule inside `@scope` gains the scoping root's specificity, so a consumer rule of equal specificity written outside the scope loses to the package rule even when it loads later. The supported paths are the documented props (`className`, `density`, `tone`, and the token overrides above); where a consumer must override a shared class it has to raise specificity, for example by doubling its own class, and it should expect that internal class names may change between releases:

```css
/* Loses: same specificity as the scoped rule, so the package rule wins. */
.my-panel .snui-card {
  padding: 0;
}

/* Wins: the doubled class outranks the scoped rule. */
.my-panel.my-panel .snui-card {
  padding: 0;
}
```

Host applications ship global element styles that reach unclassed markup a consumer renders inside a panel. Signal K Admin bundles Bootstrap Reboot, whose legend, heading, and block margins, code and keyboard-key styling, mark highlight, label display, table header alignment, and button radius visibly change panel content. A panel neutralizes those known element rules (`h1` through `h6`, `p`, lists, `legend`, `fieldset`, `hr`, `table`, `th`, links, `b`, `strong`, `small`, `code`, `kbd`, `pre`, `samp`, `mark`, `label`, and `button`) so the same consumer markup keeps the package's documented baseline in the tested host fixture, which mirrors the complete Reboot element list. This reset applies to consumer-owned markup inside the panel, and stops at the panel root. It is not a guarantee against arbitrary higher-specificity host selectors.

## Overlays and viewport chrome

Dialogs, menus, popovers, and toast regions portal into the nearest owning `PanelRoot`. They do not fall back to `document.body`, because leaving the versioned root would also leave its native CSS scope, theme tokens, CSP style contract, and nested-version boundary. `Dialog`, `Menu`, `Popover`, and `ToastRegion` therefore throw when used outside `PanelRoot`. They also reject a nested low-level portal provider that resolves to any other element, including another panel root.

The public z-index tokens define the base overlay, modal, and toast layers, and their default values target the Signal K Admin host. The Admin body is a Bootstrap layout with a fixed header at `$zindex-sticky` (1020) and a fixed sidebar at 1019, and no stacking context separates that chrome from a panel's fixed overlays. The defaults therefore mirror Bootstrap's own layers above that chrome: `--snui-z-overlay` is 1040 (offcanvas backdrop), `--snui-z-modal` is 1050 (modal backdrop), and `--snui-z-toast` is 1090 (toast), so a dialog scrim dims the header and sidebar and a toast paints above them. `--snui-z-sticky` stays panel-local. The toast base layer stays above the modal base layer, and the toast host carries `data-react-aria-top-layer`, the marker React Aria's modal hide-outside honors, so notifications remain visible, announced, focusable, and dismissable while a dialog is open. Nested dialogs increment the modal layer, while menus and popovers opened from a dialog render above that dialog. Consumers may override the public tokens on `PanelRoot`, but must preserve `--snui-z-toast` above `--snui-z-modal` and must not target private overlay classes or inline layer calculations.

Dialogs size against the visual viewport and safe-area insets, including the narrow-panel bottom-sheet layout. The panel content itself keeps its horizontal padding at or above the left and right safe-area insets, so text in a notched or rounded viewport stays clear of the hardware edge. Every mounted toast region in one panel shares a single panel-owned host. That host tracks the intersection of the panel and visual viewport, respects safe-area insets, keeps independent queues from overlapping, and is removed after the final region unmounts. Toast exit removal follows the transition end, with a token-derived fallback timer for engines that omit the event and an immediate path for reduced motion.

`ActionBar` retains ordinary `"top"` and `"bottom"` sticky modes. Its `"viewport-bottom"` mode remains inside the versioned root rather than portaling, measures the `PanelRoot` column, reserves the bar's natural-flow height, and uses fixed positioning only while the viewport edge lies between the panel's leading edge and the bar's anchor. It accounts for `visualViewport`, safe-area insets, nested scroll events, and resizing. When a focused panel control would be covered after focus movement or docking, the bar scrolls nested containers only as far as the control and its focus ring remain visible, then propagates any remaining clearance to outer scrolling. That clearance never runs while a pointer is pressed, and a clearance skipped for that reason is not replayed once the press ends. The rationale is that moving a control out from under a pointer costs it the click, that a pointer user can already see the control they pressed, and that a scroll arriving after the click would move content under a pointer that may still be there for a second press. Keyboard and programmatic focus still clear immediately, and a viewport resize that docks the bar still clears the focused control. Docking measurement reaches its final geometry inside the animation frame the triggering event scheduled, bounded by a fixed number of passes, so a control immediately above the bar reports a stable box on the following frame and a geometry that alternates between docked and undocked states leaves the bar's box stable rather than moving on every frame. The docking decision carries a hysteresis band, so geometry that lands on the docking threshold keeps the state it has. The bar returns to natural flow at its anchor and does not linger after the panel leaves the viewport.

`CollapsibleSection` keeps hidden content mounted under its retaining strategies, which is a behavior consumers may rely on and must design for. State and refs survive a collapse, while every effect and layout effect in the retained subtree runs its cleanup on collapse and runs again on the next expand. An empty dependency list is therefore a per-expand effect rather than a per-lifetime one, and a cleanup that mutates validity, busy state, or any other state expected to outlive the hidden period will lose it. The unmounting strategy discards the subtree and its state instead. The API reference records the consumer-side rules that follow.

## Density and responsive behavior

Desktop controls have a compact 40-pixel minimum height. A device with any coarse pointer uses 44 pixels. Square and icon-only targets meet the same floor in both width and height, and a compact button carries that floor as a minimum width, so a button holding a single glyph is at least square rather than sized to the glyph. A segmented option carries it the same way, so a one-character option is at least square. A selectable `DataGrid` row is a target too, because pressing one changes the selection, so it holds the floor at default density in both the plain and the virtualized layouts. The range thumb opts out of native rendering, so it scales with this contract through `--snui-range-thumb-size` rather than relying on the user-agent target-size exception.

The element that carries the floor is the one the user presses, which is not always the one that carries the role. `Checkbox` and `Radio` put their role on a control inside the label that wraps it, so the box a `Checkbox` renders is 20 pixels and the label around it holds the floor; a pointer-target audit therefore measures `element.closest("label")` for a checkbox or a radio, and the element itself everywhere else. A `Checkbox` whose label is visually hidden holds the floor in both axes, so the same measurement still reads the target the user has. The shipped `snui-check-consumer` does not measure geometry, which needs a browser; a consumer auditing its own panel writes this rule into that audit.

Panels must reflow without horizontal page overflow at 320 CSS pixels, and action groups may wrap when space is limited. Responsive component rules use the `PanelRoot` inline size instead of the browser viewport, so a narrow embedded panel reflows correctly in a wide host window.

The container those rules query is public API. `PanelRoot` sets `container-name: snui-panel` and `container-type: inline-size` on itself, and a consumer may write `@container snui-panel (...)` so its own rules answer to the panel's width rather than the viewport's. The package turns its own narrow layout at 37.5rem, exported as `CONTAINER_BREAKPOINT_NARROW`, with the name exported as `PANEL_CONTAINER_NAME`. Both are published as strings rather than as CSS custom properties because a container or media query condition cannot read a custom property: a consumer that wants to turn at the same width interpolates the constant into generated CSS, or writes the documented number and tracks this contract. The name and the value are stable within a minor release and change only as a documented breaking change.

A selectable `DataGrid` row at `density="compact"` is the one target-size exception in this package. It carries a reduced floor of the control height less one spacing step, 32 pixels on a coarse pointer and 28 on a fine one, and still grows to fit its cells above that, because compact exists to fit more rows on one screen and a consumer opts into it deliberately. The exception covers that one density and nothing else: `density="default"` rows hold the full floor, no control rendered inside a compact row is exempt, and the reduced floor still clears the 24-pixel WCAG 2.5.8 minimum in both axes.

`Card density="flush"` clears the card's own padding and row gap together, because a flush card is a frame for content that draws its own chrome and a spacing it did not ask for offsets that content from the edge it was aligned to. A flush card that wants a gap sets one.

`PanelRoot` is full width by default. `width="standard"` caps content at `--snui-content-width-standard`, and `width="wide"` caps it at `--snui-content-width-wide`. `Stack` is the sole owner of external vertical rhythm between shared surfaces, `Cluster` owns wrapping inline rhythm, and `DataGrid` owns generic tabular presentation. Above its virtualization threshold, `DataGrid` uses React Aria's complete collection and measured row layout. Consumers must provide stable item identifiers, pass dynamic column data as a readonly array, replace that array when columns change, and continue to own row data and controlled sorting. Plugin-specific workflows remain local.

## Compatibility

- React and React DOM support is `^19.2.0`.
- `@signalk/server-admin-ui-dependencies` publishes compatibility inventory for embedded webapps and configuration panels. It does not guarantee that every peer exists in a federation share scope. The current Admin loader's Webpack-compatible fallback scope contains React and React DOM alone, and its ESM globals expose only React entry points. This package needs only those implementations, uses none of the Bootstrap-family or icon-font libraries, and never becomes a shared module itself. `npm run host-contract` enforces its React ranges against a committed baseline of the published inventory and a separate host-share allowlist. Reviewing Signal K `master` remains a separate forward-compatibility check because it may contain unpublished changes.
- Signal K 2.24 is the minimum supported host for React 19 Webpack configuration panels. The documented ESM host-global React path requires Signal K 2.27 or newer. The published dependency inventory alone cannot prove this floor because its version 2.23.0 declared a React 19 peer while Signal K 2.23's active Admin UI still used React 16.
- Native CSS `@scope` sets the browser floors: Chromium and Edge 118, Firefox 146, and Safari 17.4. `supportsNativeCssScope` lets consumers check support before rendering, and unsupported engines receive `UnsupportedBrowserError` before style installation. No unscoped fallback is provided. Consumer adoption is blocked until every supported kiosk and embedded WebView deployment meets that floor.
- Right-to-left caret mirroring and select indicator placement use `:dir()`, which Chromium added in 120. On Chromium and Edge 118 and 119 those cosmetic rules, including the range fill direction, are skipped while layout, keyboard direction handling, and all other styling remain correct.
- React, React DOM, and their implementation entry points remain external to the unbundled library build. A Webpack Module Federation consumer resolves React and React DOM through the host share scope as singletons; this repository's fixtures use `import: false` to prohibit fallback implementations. Following the current Signal K ESM guidance, a Vite or other ESM consumer aliases `react`, `react-dom`, `react-dom/client`, and `react/jsx-runtime` to shims for the corresponding `window.__SK_*` host globals instead of declaring federation shares. Neither path may embed a second React or React DOM implementation.
- A classic Webpack consumer derives its `var` container global from its package name by replacing `-`, `@`, and `/` with `_`. An ESM consumer sets its plugin package to `"type": "module"`, which selects the Admin loader's module-script and dynamic-import path. A CommonJS server entry in that package uses a `.cjs` extension.
- Consumers bundle this package into each Module Federation remote.
- Consumers must not share this package dynamically between remotes.
- The package's `/composites`, `/data-grid`, `/forms`, and `/overlays` entry points are supported public import paths. The package root is the supported entry point for lightweight panel, layout, field, feedback, theme, compatibility, and formatting primitives. APIs assigned to a focused entry point are not also exported from the root.
- Classic `var` and output-module ESM Module Federation remotes are tested. Signal K also supports ESM containers from Vite and other bundlers through dynamic import, but their host-global React shim configuration remains the consumer's integration responsibility.
- Browser behavior is tested in Playwright Chromium, Firefox, WebKit, and mobile Chromium. A Content Security Policy fixture proves that a matching nonce authorizes the injected stylesheet element and a missing or incorrect nonce does not. Package components also use runtime `style` attributes, so a custom nonce-restricted host must separately permit those through `style-src-attr`. Current Signal K Admin disables Content Security Policy and provides no nonce prop to configuration panels.
- The repository runtime harness supplies a minimal host-equivalent React and React DOM share scope. It does not reproduce the complete Admin bootstrap or its host-global ESM shim path. Each consumer remains responsible for testing the production remote in its supported Signal K Admin host and following the Signal K project's [embedded-component contract](https://github.com/SignalK/signalk-server/blob/master/docs/develop/webapps.md#embedded-components-and-admin-ui--server-interfaces).

See the [API reference](api-reference.md) for the current entry points, component props, ref targets, defaults, and localization hooks.

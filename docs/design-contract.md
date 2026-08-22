# Design contract

This contract defines the stable behavior shared by NearlCrews Signal K administration panels. It does not define plugin business behavior.

## Scope

The React package may own:

- Theme tokens and scoped component styling
- Accessible names, focus states, and keyboard interaction
- General-purpose form controls and layout
- Presentational feedback and confirmation surfaces
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
- Light uses dark text on light surfaces.
- Dark uses light text on dark surfaces and dark text on the brighter accent fill.
- Night uses red-preserving surfaces, text, focus, and status colors.

Night deliberately compresses semantic colors into a red-preserving range. Hue alone is never the status signal; visible text, glyphs, shapes, borders, and accessible tone labels carry the distinction. Night styling ends at the panel root. It does not modify host chrome, the document body, or surrounding gutters. A full-surface night experience requires the host to coordinate those surfaces.

Theme preference is shared across NearlCrews administration panels through `signalk-nearlcrews-ui.theme.v1`, the only storage key the package reads or writes. Explicit selections, including Auto and System, are persisted. Panels mounted in the same document stay in sync through a same-document event, and open panels in other tabs follow the browser storage event. A selection whose storage write fails remains current in the mounted panels for the page session but is not durable. Existing valid stored choices otherwise remain authoritative. A package version that does not recognize a choice written by another version ignores it instead of clearing the mounted theme. Binnacle and other chartplotter interfaces maintain separate product preferences.

## Public CSS tokens

These color token names are public API:

- `--snui-color-background`
- `--snui-color-surface`
- `--snui-color-surface-raised`
- `--snui-color-interactive-hover`
- `--snui-color-hover-raised`
- `--snui-color-text`
- `--snui-color-text-muted`
- `--snui-color-border`
- `--snui-color-accent-fill`
- `--snui-color-accent-fill-hover`
- `--snui-color-on-accent`
- `--snui-color-link`
- `--snui-color-link-hover`
- `--snui-color-link-visited`
- `--snui-color-focus`
- `--snui-color-success`
- `--snui-color-warning`
- `--snui-color-danger`
- `--snui-color-info`

These foundation token names are also public API:

- `--snui-font-family` and `--snui-font-family-mono`
- `--snui-font-size`
- `--snui-font-size-sm` and `--snui-font-size-xs`
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

Token values may change in a compatible release to fix contrast, browser behavior, or theme consistency. Removing or renaming a public token is breaking.

Consumers may override public tokens through the native `style` prop on `PanelRoot`. Token overrides must remain on that versioned root and must not target private classes or DOM structure. Inline overrides apply across theme choices, so consumers must verify Light, Dark, and Night contrast before using them.

The same tokens ship as a framework-neutral stylesheet at `signalk-nearlcrews-ui/tokens.css`, for panels that do not use React. The `snui-tokens` class it styles is public API. Both stylesheets are rendered from one source, so the palettes cannot diverge. The neutral sheet declares only custom properties and `color-scheme`, styles no element of its own, and requires no native CSS `@scope` support. It reads `data-snui-theme` exactly as the component root does, and follows an explicit Bootstrap, CoreUI, or legacy `.dark-mode` host theme when that attribute is absent.

That class is the one documented exception to version-scoped styling. It carries no version, so the last copy loaded into a document defines the tokens for every element carrying the class, control sizing tokens included. The exception is deliberate: requiring a version in consumer markup would defeat the point of a sheet meant for panels with no build-time knowledge of this package. Version isolation remains available only through `PanelRoot`.

## Presentation utilities

`formatRelativeAge` accepts a nonnegative elapsed age in milliseconds and formats it through `Intl.RelativeTimeFormat`. It does not read the clock, accept a timestamp, decide whether data is stale, or assign domain meaning to the age. Consumers compute and clamp the age at their data boundary, choose any unavailable-data fallback, and retain ownership of freshness policy.

`SecretInput` owns only password-visibility presentation. It does not store, fetch, authorize, encrypt, or redact its value. Consumers retain those responsibilities and must not treat a concealed native input as a security boundary.

## Accessibility

- Normal text and control labels must meet WCAG AA contrast.
- Accent fills use a separate on-accent token. The foreground must not be assumed to be white.
- Focus must be visible in every theme.
- Status must include visible text or another non-color cue. `Badge` and `Metric` render a tone glyph, and `StatusIndicator` renders a per-tone dot shape, so tone never depends on color alone. Consumers may localize the announcement with `toneLabel`.
- Banners include a visible severity symbol as well as screen-reader severity text. Consumers may localize the text with `toneLabel`.
- Single-choice segmented controls use radio-group semantics, roving focus, arrow keys, Home, and End.
- Horizontal segmented-control arrows follow document direction, and collapsible carets mirror in right-to-left layouts.
- Collapsible sections expose a named region and real heading, keep header summaries and actions outside the toggle, restore focus when focused content closes, and preserve the `aria-controls` target while collapsed.
- Persistent banners are not live regions unless the consumer explicitly requests polite or assertive announcements.
- Persistent field and checkbox errors default to `aria-live="off"`. Consumers opt in to polite or assertive announcements when validation changes after an interaction. When announcements are requested, the region is mounted before its content arrives, because a live region created together with its message is not announced reliably.
- Checkboxes expose the native mixed state through `indeterminate`, and platform interaction clears the mixed state as usual. Range inputs show a filled progress track alongside their thumb position.
- Loading buttons remain focusable, expose busy and disabled accessibility states, and suppress repeat pointer and keyboard activation. The accessible name stays stable while busy, and the loading label is exposed as a description, so the control is not announced as a different element mid-interaction.
- Confirmation regions receive initial focus so their message is announced on open, support Escape while idle, and restore focus when dismissed. Their actions block activation through `aria-disabled` rather than leaving the tab order, so focus is never destroyed and chased across a busy transition.
- `AlertDialog` always renders an enabled, explicitly labeled cancel action before supplemental actions. A destructive or busy supplemental action may not remove the user's route out of the alert dialog.
- A `Popover` trigger must be a semantic interactive element that accepts the injected event and ARIA props and forwards its ref to that element. The library `Button` satisfies this contract. A custom trigger that drops any injected behavior is unsupported.
- `SecretInput` uses an explicit Show or Hide button whose accessible name reports the available action. Pointer activation preserves the input's focus, caret, and selected range, while keyboard activation retains normal button focus behavior.
- `DataGrid` exposes one row-header column, a complete accessible collection, controlled sorting, and React Aria keyboard navigation whether its rows are virtualized or rendered directly.
- `UnsupportedBrowserNotice` is a standalone alert with an overridable heading and body. Consumers render it instead of `PanelRoot` only after their own CSS-scope preflight fails.
- `ariaDisabled` buttons remain focusable, suppress pointer and keyboard activation, and use disabled presentation.
- Raw links inside a panel use theme-safe link tokens for default, visited, and hover states.
- Coarse-pointer controls have a minimum target height of 44 pixels.
- Motion is effectively disabled for package-owned elements when `prefers-reduced-motion` requests it. The reset does not reach consumer-owned subtrees, so a consumer may keep an animation that is essential to meaning.
- Forced colors preserves native adjustment by default. Where a state distinction would otherwise be flattened, it is reconstructed with a system color or an outline rather than with color: invalid controls and danger buttons carry a dashed outline, primary buttons and selected segmented options use `Highlight`, and banner and badge borders keep system colors so the state survives. Links and the unrestricted banner action slot return to automatic system-color mapping, including consumer-supplied native controls.
- High-contrast requests through `prefers-contrast: more` strengthen control borders to the text color and widen focus outlines to 3 pixels.
- Reduced-transparency requests through `prefers-reduced-transparency: reduce` replace the translucent sticky action bar with an opaque surface and remove its backdrop blur.
- A live region with a role does not also carry `aria-live`, because the pairing double speaks on some screen readers and an explicit `off` would silence a caller-supplied role.
- Focus indicators use `--snui-color-focus`, a visible 2-pixel outline with at least 3:1 contrast against adjacent surfaces. Controls take a 2-pixel outset ring with a soft shadow; dense rows and menu items take an inset ring so the outline is not clipped by neighboring rows. Night preserves this through tokens rather than a theme-name check, and its indicators are never thinner or dimmer than another theme's.

## Styling isolation

Every descendant selector is inside a native CSS scope rooted at the exact package version and bounded by the next versioned root, such as:

```css
@scope (.snui-root[data-snui-version="0.8.1"])
  to ([data-snui-version]) {
  /* component rules */
}
```

The root token declarations and host-ancestor theme selectors intentionally remain outside `@scope`. They target the exact versioned root itself, including a root beneath a host theme marker, rather than styling its descendants. Wrapping those selectors would prevent the root and host-theme cases from resolving correctly. Every rule that styles panel descendants remains inside the version-bounded scope.

`PanelRoot` reference-counts one style element per package version and CSP nonce in the rendered root's owner document. Independently bundled remotes share the same document registry, and conflicting CSS that claims the same version is rejected even when nonces differ. The final root using a version and nonce unmount removes its style element. Descendant selectors stop at every nested versioned root, a matching inner root re-enters its own scope, CSS variables are defined on the matching root, and nothing is written to `:root`. Internal classes and DOM nesting are private API.

Host applications ship global element styles that reach unclassed markup a consumer renders inside a panel. Signal K Admin bundles Bootstrap Reboot, whose legend, heading, and block margins visibly change panel content. A panel neutralizes those known element rules so the same consumer markup keeps the package's documented baseline in the tested host fixture. This reset applies to consumer-owned markup inside the panel, and stops at the panel root. It is not a guarantee against arbitrary higher-specificity host selectors.

## Overlays and viewport chrome

Dialogs, menus, popovers, and toast regions portal into the nearest owning `PanelRoot`. They do not fall back to `document.body`, because leaving the versioned root would also leave its native CSS scope, theme tokens, CSP style contract, and nested-version boundary. `Dialog`, `Menu`, `Popover`, and `ToastRegion` therefore throw when used outside `PanelRoot`. They also reject a nested low-level portal provider that resolves to any other element, including another panel root.

The public z-index tokens define the base overlay, modal, and toast layers. The toast base layer stays above the modal base layer, so notifications remain visible when a dialog is open. Nested dialogs increment the modal layer, while menus and popovers opened from a dialog render above that dialog. Consumers may override the public tokens on `PanelRoot`, but must preserve `--snui-z-toast` above `--snui-z-modal` and must not target private overlay classes or inline layer calculations.

Dialogs size against the visual viewport and safe-area insets, including the narrow-panel bottom-sheet layout. Every mounted toast region in one panel shares a single panel-owned host. That host tracks the intersection of the panel and visual viewport, respects safe-area insets, keeps independent queues from overlapping, and is removed after the final region unmounts. Toast exit removal follows the transition end, with a token-derived fallback timer for engines that omit the event and an immediate path for reduced motion.

`ActionBar` retains ordinary `"top"` and `"bottom"` sticky modes. Its `"viewport-bottom"` mode remains inside the versioned root rather than portaling, measures the `PanelRoot` column, reserves the bar's natural-flow height, and uses fixed positioning only while the viewport edge lies between the panel's leading edge and the bar's anchor. It accounts for `visualViewport`, safe-area insets, nested scroll events, and resizing. When a focused panel control would be covered after focus movement or docking, the bar scrolls nested containers only as far as the control and its focus ring remain visible, then propagates any remaining clearance to outer scrolling. That clearance never runs while a pointer is pressed, because moving a control out from under a pointer would cost it the click; a clearance a press defers runs once the press ends, and keyboard and programmatic focus still clear immediately. Docking measurement settles within a bounded number of frames, so a geometry that alternates between docked and undocked states leaves the bar's box stable rather than moving on every frame. The bar returns to natural flow at its anchor and does not linger after the panel leaves the viewport.

`CollapsibleSection` keeps hidden content mounted under its retaining strategies, which is a behavior consumers may rely on and must design for. State and refs survive a collapse, while every effect and layout effect in the retained subtree runs its cleanup on collapse and runs again on the next expand. An empty dependency list is therefore a per-expand effect rather than a per-lifetime one, and a cleanup that mutates validity, busy state, or any other state expected to outlive the hidden period will lose it. The unmounting strategy discards the subtree and its state instead. The API reference records the consumer-side rules that follow.

## Density and responsive behavior

Desktop controls have a compact 40-pixel minimum height. A device with any coarse pointer uses 44 pixels. Square and icon-only targets meet the same floor in both width and height. The range thumb opts out of native rendering, so it scales with this contract through `--snui-range-thumb-size` rather than relying on the user-agent target-size exception. Panels must reflow without horizontal page overflow at 320 CSS pixels, and action groups may wrap when space is limited. Responsive component rules use the `PanelRoot` inline size instead of the browser viewport, so a narrow embedded panel reflows correctly in a wide host window.

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
- Webpack classic `var` and output-module ESM containers are tested. Signal K also supports ESM containers from Vite and other bundlers through dynamic import, but their host-global React shim configuration remains the consumer's integration responsibility.
- Browser behavior is tested in Playwright Chromium, Firefox, WebKit, and mobile Chromium. A Content Security Policy fixture proves that a matching nonce authorizes the injected stylesheet element and a missing or incorrect nonce does not. Package components also use runtime `style` attributes, so a custom nonce-restricted host must separately permit those through `style-src-attr`. Current Signal K Admin disables Content Security Policy and provides no nonce prop to configuration panels.
- The repository runtime harness supplies a minimal host-equivalent React and React DOM share scope. It does not reproduce the complete Admin bootstrap or its host-global ESM shim path. Each consumer remains responsible for testing the production remote in its supported Signal K Admin host and following the Signal K project's [embedded-component contract](https://github.com/SignalK/signalk-server/blob/master/docs/develop/webapps.md#embedded-components-and-admin-ui--server-interfaces).

See the [API reference](api-reference.md) for the current entry points, component props, ref targets, defaults, and localization hooks.

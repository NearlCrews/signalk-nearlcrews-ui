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

## Themes

The public theme names are `auto`, `light`, `dark`, and `night`.

- Auto is the implicit default when no valid shared preference exists. It is not written to storage, and it leaves `data-snui-theme` off the root so host-following and `prefers-color-scheme` rules apply.
- Auto follows an explicit host theme before the operating-system preference.
- Light uses dark text on light surfaces.
- Dark uses light text on dark surfaces and dark text on the brighter accent fill.
- Night uses red-preserving surfaces, text, focus, and status colors.

Night styling ends at the panel root. It does not modify host chrome, the document body, or surrounding gutters. A full-surface night experience requires the host to coordinate those surfaces.

Theme preference is shared across NearlCrews administration panels through `signalk-nearlcrews-ui.theme.v1`, the only storage key the package reads or writes. Explicit selections are persisted. Panels mounted in the same document stay in sync through a same-document event, and open panels in other tabs follow the browser storage event. A selection whose storage write fails remains current in the mounted panels for the page session but is not durable. Existing valid stored choices, including Auto, otherwise remain authoritative. Binnacle and other chartplotter interfaces maintain separate product preferences.

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

- `--snui-font-family`
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
- `--snui-ease-standard`
- `--snui-transition-fast`, `--snui-transition-normal`, and `--snui-transition-slow`
- `--snui-motion-spin`

Token values may change in a compatible release to fix contrast, browser behavior, or theme consistency. Removing or renaming a public token is breaking.

Consumers may override public tokens through the native `style` prop on `PanelRoot`. Token overrides must remain on that versioned root and must not target private classes or DOM structure. Inline overrides apply across theme choices, so consumers must verify Light, Dark, and Night contrast before using them.

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
- `ariaDisabled` buttons remain focusable, suppress pointer and keyboard activation, and use disabled presentation.
- Raw links inside a panel use theme-safe link tokens for default, visited, and hover states.
- Coarse-pointer controls have a minimum target height of 44 pixels.
- Motion is effectively disabled for package-owned elements when `prefers-reduced-motion` requests it. The reset does not reach consumer-owned subtrees, so a consumer may keep an animation that is essential to meaning.
- Forced colors preserves native adjustment by default. Where a state distinction would otherwise be flattened, it is reconstructed with a system color or an outline rather than with color: invalid controls and danger buttons carry a dashed outline, primary buttons and selected segmented options use `Highlight`, and banner and badge borders keep system colors so the state survives.
- High-contrast requests through `prefers-contrast: more` strengthen control borders to the text color and widen focus outlines to 3 pixels.
- Reduced-transparency requests through `prefers-reduced-transparency: reduce` replace the translucent sticky action bar with an opaque surface and remove its backdrop blur.
- A roled live region does not also carry `aria-live`, because the pairing double speaks on some screen readers and an explicit `off` would silence a caller-supplied role.
- Focus indicators use `--snui-color-focus`, a visible 2-pixel outline with a 2-pixel offset, and at least 3:1 contrast against adjacent surfaces. Night preserves this through tokens rather than a theme-name check, and its indicators are never thinner or dimmer than another theme's.

## Styling isolation

Every descendant selector is inside a native CSS scope rooted at the exact package version and bounded by the next versioned root, such as:

```css
@scope (.snui-root[data-snui-version="0.5.0"])
  to ([data-snui-version]) {
  /* component rules */
}
```

`PanelRoot` reference-counts one style element per package version and CSP nonce in the rendered root's owner document. Independently bundled remotes share the same document registry, and conflicting CSS that claims the same version is rejected even when nonces differ. The final root using a version and nonce unmount removes its style element. Descendant selectors stop at every nested versioned root, a matching inner root re-enters its own scope, CSS variables are defined on the matching root, and nothing is written to `:root`. Internal classes and DOM nesting are private API.

Host applications ship global element styles that reach unclassed markup a consumer renders inside a panel. Signal K Admin bundles Bootstrap Reboot, whose legend, heading, and block margins visibly change panel content. A panel neutralizes those element styles so it renders the same in every host. This reset applies to consumer-owned markup inside the panel, and stops at the panel root.

## Density and responsive behavior

Desktop controls have a compact 40-pixel minimum height. A device with any coarse pointer uses 44 pixels. Square and icon-only targets meet the same floor in both width and height. The range thumb opts out of native rendering, so it scales with this contract through `--snui-range-thumb-size` rather than relying on the user-agent target-size exception. Panels must reflow without horizontal page overflow at 320 CSS pixels, and action groups may wrap when space is limited. Responsive component rules use the `PanelRoot` inline size instead of the browser viewport, so a narrow embedded panel reflows correctly in a wide host window.

`PanelRoot` is full width by default. `width="standard"` caps content at `--snui-content-width-standard`, and `width="wide"` caps it at `--snui-content-width-wide`. `Stack` is the sole owner of external vertical rhythm between shared surfaces, `Cluster` owns wrapping inline rhythm, and `DataGrid` owns generic tabular presentation. Plugin-specific workflow layouts, and the row data and sorting a grid displays, remain local.

## Compatibility

- React support is `>=19.2 <20` for `0.x`.
- Native CSS `@scope` sets the browser floors: Chromium and Edge 118, Firefox 146, and Safari 17.4. `supportsNativeCssScope` lets consumers check support before rendering, and unsupported engines receive `UnsupportedBrowserError` before style installation. No unscoped fallback is provided. Consumer adoption is blocked until every supported kiosk and embedded WebView deployment meets that floor.
- Right-to-left caret mirroring and select indicator placement use `:dir()`, which Chromium added in 120. On Chromium and Edge 118 and 119 those cosmetic rules, including the range fill direction, are skipped while layout, keyboard direction handling, and all other styling remain correct.
- React and `react/jsx-runtime` remain external to the unbundled library build. Consumer remotes may embed React's small JSX element-construction helper. React itself must resolve through the host singleton, and React or React DOM implementations must never be embedded.
- Consumers bundle this package into each Module Federation remote.
- Consumers must not share this package dynamically between remotes.
- Both classic global and ESM Module Federation output are tested.
- Browser behavior is tested in Playwright Chromium, Firefox, WebKit, and mobile Chromium. A nonce-restricted CSP fixture proves matching nonces apply styles and missing or incorrect nonces do not.
- The repository runtime harness supplies a minimal host-equivalent React share scope. Each consumer remains responsible for testing the production remote in its supported Signal K Admin host.

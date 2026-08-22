# Adopting signalk-nearlcrews-ui

`signalk-nearlcrews-ui` provides accessible, theme-aware React primitives for NearlCrews Signal K administration panels. It standardizes panel behavior without taking ownership of plugin data, Signal K APIs, units, validation, or save workflows.

Adopt one plugin at a time. Wrap the panel in `PanelRoot`, replace local theme tokens and the theme toggle, then replace buttons, fields, disclosures, and confirmation surfaces in small steps. Do not combine adoption with a domain refactor or a visual redesign.

## Current conventions

- Theme preference persists under one shared storage key, `signalk-nearlcrews-ui.theme.v1`. An explicit Auto, System, Light, Dark, or Night selection is written to that key. An unresolved preference stays Auto and writes nothing. Auto leaves `data-snui-theme` off the root, follows an optional Bootstrap, CoreUI, or legacy `.dark-mode` ancestor marker, and otherwise uses Light. Signal K Admin does not currently set or guarantee one of those markers. System follows `prefers-color-scheme`. Panels on different library versions share the key, so a value this version does not recognize is ignored rather than treated as a clear; only an absent key returns a mounted panel to Auto.
- React and React DOM are host-provided peer dependencies. A Webpack consumer resolves both through the Module Federation host share scope as singletons. A Vite or other ESM consumer aliases the React entry points to the Signal K Admin `window.__SK_*` globals as documented upstream. Every consumer bundles this package and its React Aria dependencies, never configures `signalk-nearlcrews-ui` as a runtime share, and never embeds a second React implementation.
- `@signalk/server-admin-ui-dependencies` is the Signal K Admin compatibility inventory for embedded webapps and configuration panels. Install it as a development dependency in each consumer plugin and import it from the build configuration, so the plugin fails loudly when its React version drifts from the inventory. Treat the inventory as the host's floor rather than as this package's requirement: its React peer range is `^19.0.0`, which is wider than the `^19.2.0` this package requires, so it accepts a React 19.0 or 19.1 resolution that `signalk-nearlcrews-ui` does not support. Keep the consumer's own React and React DOM development dependencies at `^19.2.0`, and write `^19.2.0` into the Module Federation `shared` block directly instead of deriving it from the inventory. Do not treat every listed peer as a federation share: the current Admin loader guarantees only React and React DOM in its Webpack-compatible share scope and only React entry points through its ESM globals.
- Public components with a stable, documented owning element accept an ordinary React 19 `ref` prop. `SegmentedControl` and `InlineConfirm` are included, and neither takes `rootRef` any more. Object refs and callback refs resolve to the native target listed in the API reference, and callback refs support React 19 cleanup. The API reference is authoritative about which components expose a ref.
- The package renders in the browser only and requires native CSS `@scope` support. Call `supportsNativeCssScope(window)` before mounting when a consumer must present a local compatibility message, render `UnsupportedBrowserNotice` instead of `PanelRoot` after a failed preflight, and verify support in every supported kiosk and embedded WebView deployment.
- Prefer the standard Signal K schema-generated configuration form for simple fields whose schema behavior has been verified in every target Admin version. Give properties useful titles, descriptions, and defaults where appropriate, and use only `uiSchema` fields and widgets supported by the target host's React JSON Schema Form stack. The current host form does not preserve every root JSON Schema validation keyword. Adopt a custom panel when the interaction or validation requires behavior the target form does not provide. Expose its default component as `./PluginConfigurationPanel`, declare `signalk-plugin-configurator`, accept the host's `configuration` and `save` props, and keep configuration, Signal K access, units, validation, and save orchestration in the plugin. The host's `save` callback returns `void` and does not confirm persistence, so verified success, failure reporting, and retry behavior require a plugin-owned API.
- Require Signal K 2.24 or newer for a React 19 Webpack configuration panel. Require Signal K 2.27 or newer for the documented ESM host-global React path. The dependency inventory's package version does not establish either minimum.

## Further reading

- The [README](../README.md) documents installation, the component inventory, theming, and the package boundary.
- The [API reference](api-reference.md) lists entry points, package-specific props, ref targets, defaults, and localization hooks.
- The [design contract](design-contract.md) records the stable theme, token, accessibility, and isolation behavior consumers may rely on.

## Adoption recipes

For a Webpack consumer, start from the repository's production Module Federation fixtures instead of inventing a share configuration. The [classic `var` fixture](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/fixtures/federation/classic/webpack.config.cjs) and [output-module ESM fixture](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/fixtures/federation/esm/webpack.config.cjs) both resolve React and React DOM from the host and bundle this package into the remote. Derive a classic container's global from the consumer package name with `packageName.replace(/[-@/]/g, "_")`. For Vite or another ESM bundler, follow Signal K's [host-global React shim guidance](https://github.com/SignalK/signalk-server/blob/master/docs/develop/webapps.md#react-version-compatibility), set the consumer plugin package to `"type": "module"`, and use a `.cjs` `main` entry if its server-side implementation remains CommonJS.

Replace a hand-built modal, focus trap, and Escape handler with `Dialog`. Keep the open state and action behavior in the consumer:

```tsx
import { useState } from "react";
import { Button } from "signalk-nearlcrews-ui";
import { Dialog } from "signalk-nearlcrews-ui/overlays";

export function ConnectionDetails() {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setDetailsOpen(true)}>Show details</Button>
      <Dialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title="Connection details"
        actions={<Button onClick={() => setDetailsOpen(false)}>Done</Button>}
      >
        Consumer-owned content
      </Dialog>
    </>
  );
}
```

Use a library `Button` for a popover trigger:

```tsx
import { Button } from "signalk-nearlcrews-ui";
import { Popover } from "signalk-nearlcrews-ui/overlays";

export function DetailsPopover() {
  return (
    <Popover trigger={<Button variant="secondary">Details</Button>}>
      Consumer-owned content
    </Popover>
  );
}
```

A custom trigger must render a semantic interactive element, forward its ref to that element, and spread every injected event and ARIA prop. Dropping any part of that contract can break opening, focus return, keyboard use, or accessible naming.

Use `Accordion` only when at most one section may remain open and child order is static. Keep independent controlled `CollapsibleSection` instances when users must compare multiple open sections or when the list can be inserted, removed, or reordered.

Before moving panel content into a `CollapsibleSection`, read the `mountStrategy` rules in the API reference. Under the default retaining strategy the hidden subtree keeps its state while every effect in it runs its cleanup on collapse and runs again on expand, so an effect written to run once on mount runs once per expand. Two consumer panels have already lost work to that rule: a field that reported validity from an effect dropped its invalid state when the section collapsed and then discarded an in-progress edit on the next expand, and an abortable request left its control permanently `aria-busy` because the cleanup aborted the request while the completion path that clears the flag never ran. Audit any subtree that reports validity, starts abortable work, or registers a listener it expects to keep observing while hidden.

## Changes in 0.8.2

These changes are backward compatible. No consuming code requires modification.

- A viewport-bottom `ActionBar` no longer scrolls a control clear when a pointer press moves focus to it. 0.8.1 deferred that scroll until after the click; 0.8.2 skips it, because a pointer user can see the control they pressed and the deferred scroll still moved content under a pointer that was often still there. A consumer test that asserted a scroll after a click on a control the docked bar overlaps should now assert the scroll position is unchanged.
- Docking measurement reaches its final geometry inside the animation frame the focus, scroll, or resize event scheduled. A consumer test that added a settle wait, a retry, or a longer actionability timeout around a control immediately above the docked bar can drop that workaround.
- The docking decision carries a hysteresis band, so a panel whose geometry sits on the docking threshold no longer alternates between the docked and natural-flow presentations.
- Compact and icon-only buttons carry the control size token as a minimum width. A consumer that added `min-width: var(--snui-control-min-height)` to reach the target-size floor on a single-glyph button can drop that override.
- Keyboard and programmatic focus keep the clearance behavior 0.8.0 introduced, and a viewport resize that docks the bar still clears the focused control.
- A `PanelRoot` nested in a retained `CollapsibleSection` re-reads the shared theme when the section reveals it. A consumer that remounted the panel to pick up a theme change made while the section was collapsed can drop that workaround.

## Changes in 0.8.1

These changes are backward compatible. No consuming code requires modification.

- A viewport-bottom `ActionBar` no longer scrolls the panel while a pointer is pressed, so the first click on a control the docked bar overlaps reaches that control. A consumer test that worked around this by focusing a control before clicking it, by clicking twice, or by dispatching a synthetic click can drop that workaround and click the control directly.
- Docking measurement settles within a bounded number of frames when a docked and an undocked geometry alternate. A consumer test that waits for a stable bounding box before clicking, which is what Playwright does by default, no longer times out on that wait.
- Keyboard and programmatic focus keep the clearance behavior 0.8.0 introduced. A clearance a press defers runs on the frame after the release, so the scroll follows that press's click instead of interrupting it.
- `CollapsibleSection.mountStrategy` now documents what its retaining strategies do to effects, including the run-once-on-mount trap and the two failure shapes above. The behavior is unchanged and the default is still `"retain"`, so no code needs to move; audit retained subtrees against the API reference rules.
- A named `SegmentedControl` now always submits the selection it displays after a native form reset, including a reset that lands while the control sits in a collapsed section. A consumer that compensated by rerendering the control or by rereading its value after a reset can drop that workaround.

## Changes in 0.8.0

### Required migration work

1. Pass a readonly array to `DataGrid.columns`. Generic and one-shot iterables are no longer accepted because React may restart a StrictMode or concurrent render before commit. Replace a generator or `Set` with `Array.from(columns)` at the consumer boundary, and replace the array when its contents change.
2. Render `Dialog`, `Menu`, and `Popover` inside the owning `PanelRoot`. They now throw instead of falling back to `document.body`, enforcing the versioned style, theme, CSP, and portal boundary. `ToastRegion` has enforced the same requirement since 0.7.0.
3. Exercise each `Popover` and `LabeledField` in development or tests. A popover trigger must forward its ref and injected props to a semantic interactive element. A labeled field must render a supported labelable intrinsic control or use the documented render-prop contract. Invalid elements now throw actionable errors in both development and production builds.

### Behavioral and type corrections

- Virtualized `DataGrid` zebra rows use the same alternating presentation as direct rows, including when a row supplies a functional style.
- Optional public props explicitly admit `undefined` under `exactOptionalPropertyTypes`; no prop names or runtime defaults changed.
- Existing `Checkbox` and `SecretInput` refs keep stable attachment behavior across rerenders. `SegmentedControl` rejects empty option lists, blank labels, and duplicate values before they can produce ambiguous selection and form state.
- Toast regions share one panel-contained viewport host, keep multiple queues isolated, and adapt to viewport and panel movement. Queue overflow remains bounded while preferring to preserve focused and sticky warning or danger notifications.
- Oversized popovers remain scrollable within the available viewport.
- Viewport-bottom action bars preserve the focused control's border and focus ring when focus moves or a viewport resize docks the bar, including through nested scroll containers.
- Forced-colors mode preserves focus rings and maps links, library buttons, and consumer-supplied banner actions to readable system colors.

## Changes in 0.7.1

The React and React DOM peer ranges narrowed from `>=19.2.0 <20.0.0` to `^19.2.0`. Every stable React 19 release keeps the meaning it had; the old range also accepted React 20 prereleases, which the Signal K Admin host declaration excludes. A consumer that copied the old range into its Module Federation `shared` block should copy the new one:

```js
shared: {
  react: { singleton: true, requiredVersion: "^19.2.0", import: false },
  "react-dom": { singleton: true, requiredVersion: "^19.2.0", import: false },
}
```

`signalk-nearlcrews-ui/tokens.css` is new and requires no migration. Importing it runs no JavaScript and does not import React. Installing this package still resolves its normal dependencies and React peer dependencies. A panel that already uses `PanelRoot` gets the same tokens from the component styles and should not also load the sheet.

## Changes in 0.7.0

### Required migration work

1. Add `react-dom` beside React as a development dependency in the consumer, and share both React and React DOM from the Signal K Admin host as Module Federation singletons with `import: false`. Continue to bundle `signalk-nearlcrews-ui` into the remote.
2. Add `"system"` to every exhaustive `ThemeChoice` mapping, label map, test matrix, and saved-value validator. Auto no longer follows the operating-system preference when the host has no explicit theme. Choose System for that behavior.
3. Give every `AlertDialog` a non-empty `cancelLabel`. Remove any duplicate cancel button from `actions`, move its callback to `onCancel`, and keep only supplemental actions in the slot.
4. Move every `ToastRegion` inside its owning `PanelRoot`. Version 0.7.0 throws instead of using an unscoped body portal.
5. Move imports for `Accordion`, `EmptyState`, and `Progress` to `/composites`; `Radio`, `RadioGroup`, and `Switch` to `/forms`; the complete grid API to `/data-grid`; and dialogs, menus, popovers, and toasts to `/overlays`. These APIs are no longer exported from the package root. `SecretInput` is a new `/forms` export.
6. Update `DataGrid` refs to `HTMLDivElement`. The ref now always resolves to the stable outer container, regardless of whether the row count crosses the virtualization threshold. Query its descendant grid element when native table or ARIA-grid operations are needed.

The host-sharing portion of a Webpack configuration follows this shape:

```js
shared: {
  react: {
    singleton: true,
    requiredVersion: ">=19.2.0 <20.0.0",
    import: false,
  },
  "react-dom": {
    singleton: true,
    requiredVersion: ">=19.2.0 <20.0.0",
    import: false,
  },
}
```

An alert-dialog migration changes the action ownership rather than adding a second escape action:

```tsx
<AlertDialog
  open={resetOpen}
  title="Reset configuration?"
  cancelLabel="Keep configuration"
  onCancel={() => setResetOpen(false)}
  actions={
    <Button variant="danger" onClick={resetConfiguration}>
      Reset
    </Button>
  }
>
  This cannot be undone.
</AlertDialog>
```

### Optional adoption

- Replace repeated password-reveal groups with `SecretInput`. It owns reveal presentation and selection preservation, while the consumer retains value state, persistence, authorization, and redaction.
- Replace repeated browser compatibility markup with `UnsupportedBrowserNotice`, but keep the `supportsNativeCssScope(window)` decision in the consumer.
- Replace repeated elapsed-age formatting with `formatRelativeAge`. Pass a nonnegative age in milliseconds, not a timestamp; use `fallback` for unavailable or invalid data.
- Use `sticky="viewport-bottom"` on `ActionBar` when an unconstrained Signal K Admin `.app-body` prevents ordinary sticky positioning from reaching the viewport. The bar stays in the `PanelRoot` column, reserves its flow position, and returns to that position near the panel end.
- `Switch` can now participate directly in native forms through `form`, `name`, `readOnly`, `required`, and `value`.
- `DataGrid` keeps its public collection API, but large collections now use React Aria `Virtualizer` and `TableLayout`. Provide a stable `id` or `key` on every item, retain controlled sorting, and test wrapped or expandable rows at the consumer's chosen `virtualizeThreshold`.
- Nested menus, popovers, and dialogs now layer above their owning dialog. Remove consumer z-index workarounds and rely on the public overlay tokens.

## Changes in 0.6.2

These changes are backward compatible for consumers that use ordinary web,
mail, telephone, fragment, query, or relative links.

- Anchor-form `Button` controls make dangerous and unknown URL schemes inert.
  Existing HTTP, HTTPS, mail, telephone, fragment, query, and relative
  destinations continue to work.
- `Accordion` documentation now makes its existing static-child-order contract
  explicit. Keep child order stable after the first render because open state is
  tracked by position.

## Changes in 0.6.1

These changes are backward compatible. No consuming code requires modification.

- `PUBLIC_TOKEN_NAMES` and `FoundationTokenName` now include `--snui-color-scrim` and the z-index scale (`--snui-z-sticky`, `--snui-z-overlay`, `--snui-z-modal`, and `--snui-z-toast`). The emitted declarations grow by these five names, and no existing name changed.

## Changes in 0.6.0

These changes are backward compatible. No consuming code requires modification.

- `SemanticTone` and `OverlayOpenState` are now exported from the package root. `SemanticTone` is the type of `ToastContent.tone`; `OverlayOpenState` is the shared open-state interface that `MenuProps`, `PopoverProps`, and `DialogProps` extend.
- `SegmentedControlProps.onChange` is now optional, matching `RadioGroup`, `Switch`, and `Checkbox`.
- `DialogProps.open`, `defaultOpen`, and `onOpenChange` now explicitly admit `undefined`, consistent with every other optional public prop and with `exactOptionalPropertyTypes`.

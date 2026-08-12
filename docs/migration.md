# Adopting signalk-nearlcrews-ui

`signalk-nearlcrews-ui` provides accessible, theme-aware React primitives for NearlCrews Signal K administration panels. It standardizes panel behavior without taking ownership of plugin data, Signal K APIs, units, validation, or save workflows.

Adopt one plugin at a time. Wrap the panel in `PanelRoot`, replace local theme tokens and the theme toggle, then replace buttons, fields, disclosures, and confirmation surfaces in small steps. Do not combine adoption with a domain refactor or a visual redesign.

## Current conventions

- Theme preference persists under one shared storage key, `signalk-nearlcrews-ui.theme.v1`. An explicit Auto, System, Light, Dark, or Night selection is written to that key. An unresolved preference stays Auto and writes nothing. Auto leaves `data-snui-theme` off the root, follows an explicit Bootstrap, CoreUI, or legacy `.dark-mode` host theme, and otherwise uses Light. System follows `prefers-color-scheme`. Panels on different library versions share the key, so a value this version does not recognize is ignored rather than treated as a clear; only an absent key returns a mounted panel to Auto.
- React and React DOM are host-provided peer dependencies. A consumer remote shares both as Module Federation singletons, bundles this package and its React Aria dependencies, and never configures `signalk-nearlcrews-ui` as a runtime share.
- `@signalk/server-admin-ui-dependencies` is the Signal K Admin host's own declaration of what it supplies to embedded webapps and configuration panels. Install it as a development dependency in each consumer plugin and import it from the build configuration, so the plugin fails loudly when its React version drifts from the host. Share only the modules that declaration names, and bundle everything else.
- Components that accept a ref declare it as an ordinary `ref` prop, `SegmentedControl` and `InlineConfirm` included; neither takes `rootRef` any more. Object refs, callback refs, and callback-ref cleanup all resolve to the same native element. No component wraps in `forwardRef`. Components that render more than one host element, or that only coordinate their children, do not accept a ref.
- The package renders in the browser only and requires native CSS `@scope` support. Call `supportsNativeCssScope(window)` before mounting when a consumer must present a local compatibility message, render `UnsupportedBrowserNotice` instead of `PanelRoot` after a failed preflight, and verify support in every supported kiosk and embedded WebView deployment.

## Further reading

- The [README](../README.md) documents installation, the component inventory, theming, and the package boundary.
- The [design contract](design-contract.md) records the stable theme, token, accessibility, and isolation behavior consumers may rely on.

## Changes in 0.7.1

The React and React DOM peer ranges narrowed from `>=19.2.0 <20.0.0` to `^19.2.0`. Every stable React 19 release keeps the meaning it had; the old range also accepted React 20 prereleases, which the Signal K Admin host declaration excludes. A consumer that copied the old range into its Module Federation `shared` block should copy the new one:

```js
shared: {
  react: { singleton: true, requiredVersion: "^19.2.0", import: false },
  "react-dom": { singleton: true, requiredVersion: "^19.2.0", import: false },
}
```

`signalk-nearlcrews-ui/tokens.css` is new and requires no migration. A panel that already uses `PanelRoot` gets the same tokens from the component styles and should not also load the sheet.

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

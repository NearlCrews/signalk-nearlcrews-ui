# Adopting signalk-nearlcrews-ui

`signalk-nearlcrews-ui` provides accessible, theme-aware React primitives for NearlCrews Signal K administration panels. It standardizes panel behavior without taking ownership of plugin data, Signal K APIs, units, validation, or save workflows.

Adopt one plugin at a time. Wrap the panel in `PanelRoot`, replace local theme tokens and the theme toggle, then replace buttons, fields, disclosures, and confirmation surfaces in small steps. Do not combine adoption with a domain refactor or a visual redesign.

## Current conventions

- Theme preference persists under one shared storage key, `signalk-nearlcrews-ui.theme.v1`. An explicit Auto, Light, Dark, or Night selection is written to that key. An unresolved preference stays Auto and writes nothing, leaving `data-snui-theme` off the root so host-following and `prefers-color-scheme` rules apply. Panels on different library versions share the key, so a value this version does not recognize is ignored rather than treated as a clear; only an absent key returns a mounted panel to Auto.
- Components that accept a ref declare it as an ordinary `ref` prop, `SegmentedControl` and `InlineConfirm` included; neither takes `rootRef` any more. Object refs, callback refs, and callback-ref cleanup all resolve to the same native element. No component wraps in `forwardRef`. Components that render more than one host element, or that only coordinate their children, do not accept a ref.
- The package renders in the browser only and requires native CSS `@scope` support. Call `supportsNativeCssScope(window)` before mounting when a consumer must present a local compatibility message, and verify support in every supported kiosk and embedded WebView deployment.

## Further reading

- The [README](../README.md) documents installation, the component inventory, theming, and the package boundary.
- The [design contract](design-contract.md) records the stable theme, token, accessibility, and isolation behavior consumers may rely on.

## Changes in 0.6.1

These changes are backward compatible. No consuming code requires modification.

- `PUBLIC_TOKEN_NAMES` and `FoundationTokenName` now include `--snui-color-scrim` and the z-index scale (`--snui-z-sticky`, `--snui-z-overlay`, `--snui-z-modal`, and `--snui-z-toast`). The emitted declarations grow by these five names, and no existing name changed.

## Changes in 0.6.0

These changes are backward compatible. No consuming code requires modification.

- `SemanticTone` and `OverlayOpenState` are now exported from the package root. `SemanticTone` is the type of `ToastContent.tone`; `OverlayOpenState` is the shared open-state interface that `MenuProps`, `PopoverProps`, and `DialogProps` extend.
- `SegmentedControlProps.onChange` is now optional, matching `RadioGroup`, `Switch`, and `Checkbox`.
- `DialogProps.open`, `defaultOpen`, and `onOpenChange` now explicitly admit `undefined`, consistent with every other optional public prop and with `exactOptionalPropertyTypes`.

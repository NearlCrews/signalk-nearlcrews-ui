# Adopting signalk-nearlcrews-ui

`signalk-nearlcrews-ui` provides accessible, theme-aware React primitives for NearlCrews Signal K administration panels. It standardizes panel behavior without taking ownership of plugin data, Signal K APIs, units, validation, or save workflows.

Adopt one plugin at a time. Wrap the panel in `PanelRoot`, replace local theme tokens and the theme toggle, then replace buttons, fields, disclosures, and confirmation surfaces in small steps. Do not combine adoption with a domain refactor or a visual redesign.

## Current conventions

- Theme preference persists under one shared storage key, `signalk-nearlcrews-ui.theme.v1`. An explicit Auto, System, Light, Dark, or Night selection is written to that key. An unresolved preference stays Auto and writes nothing. Auto leaves `data-snui-theme` off the root, follows an optional Bootstrap, CoreUI, or legacy `.dark-mode` ancestor marker, and otherwise uses Light. Signal K Admin does not currently set or guarantee one of those markers. System follows `prefers-color-scheme`. Panels on different library versions share the key, so a value this version does not recognize is ignored rather than treated as a clear; only an absent key returns a mounted panel to Auto.
- React and React DOM are host-provided peer dependencies. A Webpack consumer resolves both through the Module Federation host share scope as singletons. A Vite or other ESM consumer aliases the React entry points to the Signal K Admin `window.__SK_*` globals as documented upstream. Every consumer bundles this package and its React Aria dependencies, never configures `signalk-nearlcrews-ui` as a runtime share, and never embeds a second React implementation.
- `@signalk/server-admin-ui-dependencies` is the Signal K Admin compatibility inventory for embedded webapps and configuration panels. Install it as a development dependency in each consumer plugin and import it from the build configuration, so the plugin fails loudly when its React version drifts from the inventory. Treat the inventory as the host's floor rather than as this package's requirement: its React peer range is `^19.0.0`, which is wider than the `^19.2.0` this package requires, so it accepts a React 19.0 or 19.1 resolution that `signalk-nearlcrews-ui` does not support. Keep the consumer's own React and React DOM development dependencies at `^19.2.0`, and write `^19.2.0` into the Module Federation `shared` block directly instead of deriving it from the inventory. Do not treat every listed peer as a federation share: the current Admin loader guarantees only React and React DOM in its Webpack-compatible share scope and only React entry points through its ESM globals.
- Public components with a stable, documented owning element accept an ordinary React 19 `ref` prop. `SegmentedControl` and `InlineConfirm` are included, and neither takes `rootRef` any more. Object refs and callback refs resolve to the native target listed in the API reference, and callback refs support React 19 cleanup. The API reference is authoritative about which components expose a ref.
- The package renders in the browser only and requires native CSS `@scope` support. `PanelShell` runs that preflight once and renders `UnsupportedBrowserNotice`, or a consumer `unsupported` element, when it fails. A consumer that composes `PanelRoot` directly calls `supportsNativeCssScope(window)` before mounting and renders `UnsupportedBrowserNotice` instead of `PanelRoot` after a failed preflight. Verify support in every supported kiosk and embedded WebView deployment.
- `PanelRoot` installs the root stylesheet; `Dialog`, `AlertDialog`, `Popover`, `Menu`, `ToastRegion`, and `DataGrid` install their own module sheets from the owning root and therefore require a `PanelRoot` ancestor. Consumer CSS that targets a package class at equal specificity loses to the scoped package rule even when it loads later. Prefer the documented props; where an override is unavoidable, raise specificity (for example `.my-panel.my-panel .snui-card`) and expect internal class names to change between releases. The design contract carries the example.
- Every component with a density prop uses the shared `Density` vocabulary, `"default"` or `"compact"`; `Card` adds `"flush"`. `"comfortable"` is a deprecated alias of `"default"` on `LabeledField` and `InputGroup`.
- `label` is the accessible-name prop on every composed control (`LabeledField`, `Checkbox`, `Switch`, `Radio`, `RadioGroup`, `SegmentedControl`, and `ThemeToggle`); `legend` names the real `<legend>` of a fieldset (`FieldGroup` and `CheckboxGroup`). `SegmentedControl.legend` and `ThemeToggle.legend` remain as deprecated aliases.
- Native wrappers (`Checkbox`, `TextInput`, `NumberInput`, `RangeInput`, `Select`, and `Textarea`) take the React `onChange` event handler. Composed controls report values through callbacks named for their payload: `onCheckedChange` on `Switch`, and `onValueChange` on `RadioGroup`, `SegmentedControl`, `ThemeToggle`, `CheckboxGroup`, `NumberField`, and `Tabs`. The deprecated `onChange` callbacks on `Switch`, `RadioGroup`, `SegmentedControl`, and `ThemeToggle` still fire with the same payload.
- Prefer the standard Signal K schema-generated configuration form for simple fields whose schema behavior has been verified in every target Admin version. Give properties useful titles, descriptions, and defaults where appropriate, and use only `uiSchema` fields and widgets supported by the target host's React JSON Schema Form stack. The current host form does not preserve every root JSON Schema validation keyword. Adopt a custom panel when the interaction or validation requires behavior the target form does not provide. Expose its default component as `./PluginConfigurationPanel`, declare `signalk-plugin-configurator`, accept the host's `configuration` and `save` props, and keep configuration, Signal K access, units, validation, and save orchestration in the plugin. The host's `save` callback returns `void` and does not confirm persistence, so verified success, failure reporting, and retry behavior require a plugin-owned API.
- Require Signal K 2.24 or newer for a React 19 Webpack configuration panel. Require Signal K 2.27 or newer for the documented ESM host-global React path. The dependency inventory's package version does not establish either minimum.
- Pin an exact version (`npm install --save-dev --save-exact signalk-nearlcrews-ui@<version>`). During `0.x`, minor releases carry breaking changes, and the [release policy](release-policy.md#versioning) records that rule and what each release type may contain. The shipped `snui-check-consumer` command asserts the pin against the installed package and the built remote; the README documents it.

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

## Changes in 0.9.0

This release changes toast defaults, dialog dismissal, several prop types, relative-age formatting, the Night palette, and token values, and it adds the primitives that let a consumer delete most of its local panel scaffolding. Work through the required steps first, then adopt the new primitives one panel at a time.

### Required migration work

1. Warning and danger toasts are sticky by default, and warning toasts announce politely. If a panel relied on a warning or failure vanishing after five seconds, pass `duration: 5000` (or another value) in the `ToastContent`; pass `live: "assertive"` on a warning that must interrupt. Info and success toasts are unchanged.
2. `queue.enqueue` throws synchronously for a blank title. Check server-provided text before enqueuing, or fall back to a fixed title such as the operation name.
3. `ToastRegion` renders its landmark only while toasts exist. Code or tests that queried `getByRole("region", { name: ... })` before enqueuing must enqueue first, and a `ref` on `ToastRegion` is null until the first toast shows. After a dismissal, focus lands on the next toast's dismiss button, the element focused before entering the region, or the panel root; remove any consumer code that moved focus after a toast closed. F6 moves focus into and out of the notifications.
4. `AlertDialog` closes on Escape and calls `onCancel`, and `onCancel` also fires for a scrim press when `dismissable` is set. A handler written for the cancel button alone now runs for every decline. Pass `keyboardDismissable={false}` only when Escape must be blocked.
5. Import `Column` for `DataGrid` from `signalk-nearlcrews-ui/data-grid`, not from `react-aria-components`, and render the grid inside `PanelRoot`. Type `density` with `Density` from the package root; `DataGridDensity` still compiles but is deprecated. Before: `import { Column } from "react-aria-components";`. After: `import { Column } from "signalk-nearlcrews-ui/data-grid";`.
6. `MenuSeparator` no longer accepts `id`. Use `data-*` attributes to mark separators.
7. Replace `density="comfortable"` with `density="default"` on `LabeledField` and `InputGroup`. The old value still renders as default at runtime, and `LabeledFieldDensity` and `InputGroupDensity` still admit it, but new code should use the shared `Density` type exported from the package root. Before: `<LabeledField density="comfortable">`. After: `<LabeledField density="default">`, or omit the prop.
8. Rename `legend` to `label` and `legendVisibility` to `labelVisibility` on `SegmentedControl` and `ThemeToggle`. The old props keep working and are deprecated; the "requires a non-empty" error now says `label`, so update any test that matched the message. Before: `<SegmentedControl legend="Units" legendVisibility="visible" />`. After: `<SegmentedControl label="Units" labelVisibility="visible" />`.
9. Rename the value callbacks on composed controls: `Switch.onChange` becomes `onCheckedChange`, and `RadioGroup.onChange`, `SegmentedControl.onChange`, and `ThemeToggle.onChange` become `onValueChange`. The payload is unchanged, and the old names still fire and are deprecated. Native wrappers (`Checkbox`, `TextInput`, `NumberInput`, `RangeInput`, `Select`, and `Textarea`) keep the React `onChange` event handler. Before: `<Switch checked={enabled} onChange={setEnabled} />`. After: `<Switch checked={enabled} onCheckedChange={setEnabled} />`.
10. Replace the deprecated type aliases: `CheckboxErrorLive`, `FieldErrorLive`, `RadioGroupErrorLive`, and `BannerLive` with `AnnouncementMode`; `RadioGroupOrientation` and `SegmentedControlOrientation` with `Orientation`; `SegmentedControlLegendVisibility` with `SegmentedControlLabelVisibility`; and `LabeledFieldDensity`, `InputGroupDensity`, and `DataGridDensity` with `Density`. `AnnouncementMode`, `Orientation`, and `Density` are exported from the package root. The aliases stay for one minor release.
11. `StackProps`, `ClusterProps`, `CardProps`, and `MetricGridProps` are unions discriminated on `as`. Replace `interface Props extends StackProps` with `type Props = StackProps & { ... }` or `ComponentProps<typeof Stack>`. `<Stack as="form">` now accepts form attributes directly, so remove the wrapping `<form>` or the cast.
12. Relative ages read as words by default. `formatRelativeAge(ageMs)` now returns `"now"`, `"2 minutes ago"`, `"yesterday"`, `"last week"`, and so on (`numeric: "auto"`, `style: "long"`), and renders weeks, months, and years beyond a week. Delete the `{ numeric: "auto", style: "long" }` override constant every panel carried. To keep the old compact form, pass `RELATIVE_AGE_NARROW`. Delete local clamping of small negative ages: skew down to minus 60 seconds renders as now; pass `negative: "fallback"` to restore the old behavior.
13. `Button.ariaDisabled`, when set, decides alone; a native `aria-disabled` attribute counts only while the prop is omitted. A consumer that passed both to combine them should pass one. A natively `disabled` `Button` no longer also carries `aria-disabled`.
14. `StatusIndicator` with `tone="neutral"` no longer announces a `toneLabel`; move any neutral wording into the visible children. A blank `toneLabel` now announces the default tone name; pass a non-blank `toneLabel` to change it.
15. `Accordion` sections are no longer region landmarks by default; pass `landmark` on a child that should stay one.
16. Update semantics assertions in tests. Query `UnsupportedBrowserNotice` as `getByRole("region", { name: "Browser update required" })` rather than `getByRole("alert")`. If a test asserted `aria-invalid` or `aria-errormessage` on a `FieldGroup` fieldset, assert the accessible description instead. If a test asserted `aria-keyshortcuts` on `InlineConfirm`, or `aria-disabled` beside `disabled` on a `Button`, drop those assertions. If a test matched a `LabeledField` accessible name exactly while passing `optionalLabel`, include the marker text in the expected name. Match `usePanelTheme` errors against "usePanelTheme must be called inside PanelRoot".
17. Disabled controls color their text with `--snui-color-text-disabled` instead of `opacity: 0.58`. If a browser test asserted that opacity on a disabled control or on the content of an `aria-disabled` button, assert `opacity: 1` and a `color` equal to the computed token instead. A `disabled` primary `Button` on a custom background now paints the disabled token with surface-colored text rather than a dimmed accent fill; override the two tokens on `PanelRoot` if a different pairing is needed.
18. Night colors changed for every foreground. Replace hard-coded Night `rgb()` values in consumer styles or tests: text `rgb(255, 64, 64)` (was 255, 120, 120), muted text `rgb(242, 56, 56)` (was 215, 91, 91), danger `rgb(255, 48, 48)` (was 255, 107, 107), accent fill `rgb(236, 56, 56)` (was 229, 72, 72) with hover `rgb(255, 64, 64)` (was 255, 90, 90), on-accent `rgb(16, 0, 0)` (was 25, 0, 0), link `rgb(255, 56, 56)` (was 255, 146, 146), and border `rgb(192, 48, 48)` (was 173, 64, 64). The Dark accent fill is `#83b3ff` (was `#4c93ff`) with hover `#9cc3ff` (was `#70a8ff`). Better, read the token through `getComputedStyle(root).getPropertyValue("--snui-color-text")` and its siblings instead of a literal.
19. Weight tokens are 500, 600, 700, and 800. If a consumer used `--snui-font-weight-medium` (was 600) or `--snui-font-weight-semibold` (was 650) to get a bold look, switch to `--snui-font-weight-bold`.
20. Overlay z-index defaults are 1040, 1050, and 1090. A consumer that overrides `--snui-z-overlay`, `--snui-z-modal`, or `--snui-z-toast` on `PanelRoot` must keep toast above modal and should stay above 1020 so overlays clear the Signal K Admin header.
21. `--snui-focus-ring` is now two shadows (a surface band plus a halo). A consumer that composed it as `box-shadow: var(--snui-focus-ring), <own shadow>` gets the band as well; drop any hand-rolled surface band.
22. Consumer CSS that overrode `--snui-color-interactive-hover` on a toast, popover, or dialog descendant now competes with the library's remap on those boxes. Override `--snui-color-hover-raised` instead where the intent is the raised-surface hover fill.
23. Overlay and data-grid CSS are no longer part of the root sheet. Nothing changes for consumers using the components; a consumer that imported the private `PANEL_STYLES` directly (never supported) must stop. `signalk-nearlcrews-ui/tokens.css` carries the new tokens automatically.
24. Refresh consumer visual baselines. The status dot is 0.75rem, `Section` spaces its children with a gap, the `Metric` value, `Section` title, and `CollapsibleSection` heading sizes moved to the type scale, and the tone glyph renders beside every non-neutral status dot.

### Optional adoption

- Replace the copied panel frame (the `supportsNativeCssScope` preflight, `UnsupportedBrowserNotice`, `PanelRoot`, the outer `Stack`, the title heading, and `ThemeToggle`) with `<PanelShell title="..." headingLevel={2}>`. Panels that rendered an `h1` should drop to level 2 or lower: Signal K Admin already owns the page heading. Local error boundaries can go; `PanelShell` wraps the children in `PanelErrorBoundary`, `onReload` adds a page-reload action, and `errorFallback` keeps a custom fallback.
- Replace the copied `beforeunload` effect with `useUnsavedChangesGuard(dirty)`.
- Replace local footer bars, save-status indicators, and their state helpers with `<SaveActionBar dirty unconfigured saving saveRequestedAt invalidMessage onSave onDiscard />` from `signalk-nearlcrews-ui/composites`. The status is a polite `StatusIndicator` whose tone follows the state, Save is disabled per the shared rule, and focus moves to the status after either action. Use `resolveSaveActionBarState` where a test asserted the pure rules.
- Delete local number-draft hooks and integer or number field wrappers and render `NumberField` from the package root. Map the old options: `min`, `max`, `integer`, and `step` carry over; a wrapper that clamped and truncated on every keystroke passes `fallback` (the value it committed for an empty field, usually `min`); a wrapper that validated and reported an error message omits `fallback` and passes `onValidityChange`; a wrapper that emitted `undefined` for an empty field passes `allowEmpty`. Move a units suffix from the label text into `unit`, and pass `description`, `error`, `errorLive`, `layout`, or `density` straight through, since every `LabeledField` prop is accepted. A field inside a `CollapsibleSection` needs no ref guards: the draft survives collapse by construction. `useNumberDraft` gives a bare `NumberInput` the same buffer.
- Where a `LabeledField` render prop strips `descriptionId` and `errorId` before spreading, call `splitLabeledFieldControlProps(props)` and spread `controlProps` instead.
- Replace local checkbox grids with select-all boxes and empty-selection warnings with `CheckboxGroup` from `signalk-nearlcrews-ui/composites`: `legend`, `options` (`{ value, label, description?, disabled? }`), `value` or `defaultValue`, `onValueChange`, `selectAllLabel`, and `emptyWarning`. Pass `name` to keep native form data. Group-level controls that sat above the grid become children.
- Replace native `<input type="checkbox">` elements that carried only an `aria-label` with `<Checkbox label="..." labelVisibility="hidden" />`.
- Remove `autoComplete`, `spellCheck`, `autoCapitalize`, and `autoCorrect` overrides on `SecretInput` unless they differ from the new defaults (`new-password`, `false`, `off`, and `off`). Render `SecretInput` through the `LabeledField` render-prop form, not as an element child. Replace local monospace and textarea height CSS on text controls with `monospace` and `Textarea.minRows`.
- Delete local visually hidden, hint, monospace, and live-region CSS and markup: `VisuallyHidden`, `Text` (`tone="muted"`, `size="sm"`), `Code`, and `LiveRegion` from the package root replace them. A `LiveRegion` must render before its first `message`; do not pair `role="status"` with `aria-live`.
- Replace local timestamp helpers with `formatRelativeAgeSince(timestamp, Date.now(), options)`, which accepts epoch milliseconds, ISO strings, and dates, and replace render-time clock reads with `<RelativeAge since={timestamp} />`, which owns its tick and stamps `dateTime`.
- Replace hand-rolled disclosures (a button, a hidden body, and a focus effect) with `Disclosure`, `DisclosureTrigger`, and `DisclosurePanel`, or spread the `triggerProps` and `panelProps` from `useDisclosure()` onto your own elements. Focus handoff only happens for a change made through the trigger.
- Replace hand-rolled tab lists with `Tabs`, `TabList` (needs `aria-label`), `Tab`, and `TabPanel`. Give a count badge a word ("2 errors", visible or in `VisuallyHidden`), because the badge joins the tab's accessible name.
- Replace styled native tables and the `tabIndex` wrapper with `Table` (a `caption` or ARIA name is required), `TableHeaderCell` and `TableCell` (`numeric` for figures), and `TableScrollRegion` (an `aria-label` or `aria-labelledby` is required).
- `CollapsibleSection` gains `leading` (content before the heading, outside the toggle), `variant="embedded"` (no chrome, for nesting in a `Card`), and `landmark`. `Card` gains `density="flush"`, `tone`, and `accent`, so local CSS that doubled selectors to remove padding or paint an accent border can go. Use `tone` when the card itself carries the meaning, which adds the glyph and the hidden announcement, and `accent` when a badge or status inside the card already announces it, which paints the bar alone. Local status-dot CSS for chips can go too: `<StatusIndicator size="compact" tone={...}>Label</StatusIndicator>` shows the dot and glyph and keeps the label for assistive technology.
- Set `numeric` on `DataGrid` figure columns and `wrap` on text columns that must show whole values in a virtualized grid.
- An uncontrolled `Dialog` can close from its own actions with `actions={(close) => <Button onClick={close}>Done</Button>}`; controlled dialogs keep working unchanged. Pass `Popover.width` as a CSS length string (`"18rem"`) instead of a number, which still works as pixels but is deprecated. `ref` and forwarded attributes land on the menu list (while open), the item, the section, and the separator.
- Replace private tints and dims with the new tokens: `color-mix(...)` tone backgrounds become `--snui-color-info-subtle`, `--snui-color-success-subtle`, `--snui-color-warning-subtle`, `--snui-color-danger-subtle`, or `--snui-color-accent-subtle`; opacity-based disabled text becomes `color: var(--snui-color-text-disabled)`; zebra rows use `--snui-color-surface-stripe`; range and progress tracks use `--snui-color-track`; and hover fills over a raised surface use `--snui-color-hover-raised` or its alias `--snui-color-surface-raised-hover`. Consumer headings above base size can use `--snui-font-size-lg`, `--snui-font-size-xl`, and `--snui-font-size-2xl` instead of raw rem values; unclassed `h1` through `h4` inside the panel already follow that scale.
- Replace the copied Module Federation `shared` block and its host comment with the published map:

  ```js
  const { shared } = require("signalk-nearlcrews-ui/federation");
  new ModuleFederationPlugin({ /* ... */ shared });
  ```

  `shared` carries `react` and `react-dom` as non-strict singletons with `import: false` and `requiredVersion` at this package's peer range. Read `hostNotes` from the same entry for the reason the shares are non-strict.

- Replace consumer-local pin and bundle checks with the shipped command, run after the panel build:

  ```sh
  npx snui-check-consumer --root . --remote public/remoteEntry.js --baseline scripts/panel-size-baseline.json
  ```

  The baseline JSON keeps the shape the consumers already use: `gzipBytes`, `maximumIncreasePercent`, and an optional `approvedCeilingGzipBytes`. Pass `--webpack-config` when the configuration is not `webpack.config.cjs` beside `--root`.

- Build scripts that read `node_modules/signalk-nearlcrews-ui/package.json` from the filesystem can resolve it instead through `require("signalk-nearlcrews-ui/package.json")` or `import.meta.resolve("signalk-nearlcrews-ui/package.json")`. A CommonJS test suite or Node-side script on Node 22.12 or newer can also `require("signalk-nearlcrews-ui")` and the focused entries directly, because the `default` conditions make the ESM entries reachable through `require(esm)`. Components still render in the browser only; the pure utilities and constants are what this serves.
- Consumers that declared `engines.node` below 22.22.2 no longer see an `EBADENGINE` warning for this package; the published floor is `>=22`. Keep the exact pin (`--save-exact`): the [release policy](release-policy.md#versioning) states that additive API ships in a minor and a patch changes behavior only, so a patch bump needs no API review and a minor bump needs this guide open.

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

The React and React DOM peer ranges narrowed from `>=19.2.0 <20.0.0` to `^19.2.0`. Every stable React 19 release keeps the meaning it had; the old range also accepted React 20 prereleases, which the Signal K Admin host declaration excludes. That difference appears only under prerelease-inclusive matching: with semver's default rules the two ranges accept the same versions, and `20.0.0-rc.1` satisfies `>=19.2.0 <20.0.0` but not `^19.2.0` only when a matcher includes prereleases, as a `semver` call with `includePrerelease: true` does. A consumer that copied the old range into its Module Federation `shared` block should copy the new one:

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

- `SemanticTone` and `OverlayOpenState` are now exported from the package root (`OverlayOpenState` moved to `/overlays` in 0.7.0). `SemanticTone` is the type of `ToastContent.tone`; `OverlayOpenState` is the shared open-state interface that `MenuProps`, `PopoverProps`, and `DialogProps` extend.
- `SegmentedControlProps.onChange` is now optional, matching `RadioGroup`, `Switch`, and `Checkbox`.
- `DialogProps.open`, `defaultOpen`, and `onOpenChange` now explicitly admit `undefined`, consistent with every other optional public prop and with `exactOptionalPropertyTypes`.

## Changes in 0.5.0

### Required migration work

1. Replace `Disclosure` with `CollapsibleSection`. The summary it carried moves to `summary`, and `summaryVisibility` chooses whether the summary stays visible while the section is open.
2. Remove `legacyThemeStorageKeys`. Theme preference resolves from the single shared key, and no cross-version channel remains.
3. Rename `rootRef` to `ref` on `InlineConfirm` and `SegmentedControl`. `InlineConfirm.onCancel` now receives a reason, `"escape"` or `"cancel"`, so a handler that ignored its argument keeps working and one that needs the source reads it.
4. Give `SegmentedControl` either `value` or `defaultValue`; `value` is optional, and arrow keys move only along the control's `orientation`.
5. Change `ActionBar.sticky` from a boolean to `"top"` or `"bottom"` (`true` becomes `"bottom"`).
6. Replace `BannerTone` with `StatusTone`, which adds `"neutral"`.
7. Pass `href` whenever `Button` renders with `as="a"`; the props are a discriminated union and the anchor form requires it.
8. Audit effects inside a retained `CollapsibleSection`. Retaining strategies now pause the hidden subtree with `<Activity mode="hidden">`, so effects run their cleanup on collapse and run again on expand.
9. Drop any code that reads a `forwardRef` wrapper. Every component declares `ref` as an ordinary prop, and the emitted declarations describe plain functions rather than `ForwardRefExoticComponent`.
10. Expect a fresh panel to resolve to Auto rather than Light, following the host marker when one exists.
11. Do not rely on `Button` rewriting its accessible name while loading; use `loadingLabel` for the busy description.
12. Treat the `InlineConfirm` cancel action as `aria-disabled` while busy: it keeps focus and refuses activation rather than leaving the tab order.
13. Remove any `aria-live` a consumer added beside a `Banner` role; the component no longer emits both.

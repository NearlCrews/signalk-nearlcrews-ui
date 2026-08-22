# Signal K NearlCrews UI

[![npm version](https://img.shields.io/npm/v/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)
[![npm downloads](https://img.shields.io/npm/dm/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)
[![CI](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/LICENSE)
[![node](https://img.shields.io/badge/node-22.22.2%20%7C%2024.15.0%20%7C%2026.0.0-brightgreen.svg)](https://nodejs.org)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://www.buymeacoffee.com/nearlcrews)

`signalk-nearlcrews-ui` provides accessible, theme-aware React primitives for NearlCrews Signal K administration panels. It standardizes common panel behavior without taking ownership of plugin data, Signal K APIs, units, validation, or save workflows.

The package is intentionally distinct from the official Signal K user interface and its internal component systems.

## Status

The package is a public npm dependency for NearlCrews Signal K projects. It is not a Signal K plugin, webapp, or marketplace package. The initial API may change during the `0.x` series, so consumers should pin an exact version.

## What's new in 0.8.1

Version 0.8.1 corrects pointer behavior in the viewport-bottom `ActionBar`. It is a bug-fix release with no API change, so upgrading from 0.8.0 requires no consumer work. See the [0.8.1 changelog](CHANGELOG.md#081---2026-08-22) and [migration guide](docs/migration.md#changes-in-081) for the complete release notes.

- **First click lands**: a docked action bar no longer scrolls the panel during a press, so a control the bar overlaps receives its first click instead of losing it to an ancestor.
- **Settled docking**: docking measurement stops within a bounded number of frames when a docked and an undocked geometry alternate, so a focus change leaves the bar's geometry stable.
- **Unchanged clearance**: keyboard and programmatic focus still scroll a covered control clear immediately, and a clearance deferred by a press runs as soon as the press ends.

## Compatibility

| Package | React peers  | JavaScript | Remote output                            | Browser verification                                      | Signal K boundary                                                              |
| ------- | ------------ | ---------- | ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `0.8.x` | `^19.2.0`    | ES2022     | Webpack var and output-module ESM        | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.7.x` | `^19.2.0`    | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.6.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.5.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.4.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.3.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.2.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.1.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |

## Requirements

- React and React DOM 19.2 or newer within the React 19 release line
- Chromium or Edge 118 or newer, Firefox 146 or newer, or Safari 17.4 or newer
- Signal K Server 2.24 or newer for React 19 Webpack configuration panels, or 2.27 or newer for the documented ESM host-global React path
- A consumer build that bundles this package into its configuration-panel remote

The browser floors come from native CSS `@scope`, which became available in Chromium and Edge 118, Firefox 146, and Safari 17.4. `PanelRoot` throws a clear compatibility error when `CSSScopeRule` is unavailable instead of silently rendering unstyled controls. Signal K installations that embed an older browser engine must update that engine before adopting this package. Right-to-left caret mirroring, select indicator placement, and the range fill direction additionally use `:dir()`, which Chromium added in 120; Chromium and Edge 118 and 119 skip those cosmetic rules while everything else renders correctly.

The package renders in the browser only. Theme resolution reads `window` interfaces such as `localStorage` while mounting, so the components are not intended for server-side rendering.

Consumers that need to choose a fallback before rendering may call `supportsNativeCssScope(window)`. Render `UnsupportedBrowserNotice` instead of `PanelRoot` when that preflight fails. The notice is standalone, carries an alert role, and accepts custom title and body content. It does not run the feature check itself. A failed `PanelRoot` installation still throws the exported `UnsupportedBrowserError`, whose `feature` property is `CSS @scope`. The package does not ship an unscoped fallback because that would weaken style isolation between independently bundled panels.

React and React DOM are peer dependencies, and a consumer must always use the Signal K Admin host's React implementations. A Webpack Module Federation remote resolves React and React DOM from the host share scope as singletons; this repository's fixtures also set `import: false` so a missing host share fails instead of silently bundling a fallback. A Vite or other ESM consumer follows the current Signal K guidance by aliasing `react`, `react-dom`, `react-dom/client`, and `react/jsx-runtime` to shims for the host's `window.__SK_REACT__`, `window.__SK_REACT_DOM__`, `window.__SK_REACT_DOM_CLIENT__`, and `window.__SK_REACT_JSX_RUNTIME__` globals. Neither integration may embed a second React or React DOM implementation.

For a classic Webpack remote, derive the `var` library name from the consumer package name with `packageName.replace(/[-@/]/g, "_")`, because that is the global the Admin loader resolves. For an ESM remote, set the consumer plugin package's `"type"` to `"module"` so Signal K emits a module script and uses dynamic import. If that plugin's server entry remains CommonJS, give `main` a `.cjs` file extension.

The consumer bundles this package and its React Aria dependencies into the remote rather than configuring this package as a shared runtime singleton. See the Signal K project's [embedded-component and React-sharing guidance](https://github.com/SignalK/signalk-server/blob/master/docs/develop/webapps.md#embedded-components-and-admin-ui--server-interfaces) for the host contract that each consumer build must follow.

The repository builds real production Webpack remotes in classic `var` and output-module ESM formats. Its browser harness initializes those containers with a minimal host-equivalent React and React DOM share scope. It does not reproduce the complete Signal K Admin bootstrap or the ESM host-global shim path, so each consumer must retain a production remote-load check against its supported Signal K host.

## Signal K Admin host dependencies

The Signal K Admin UI publishes a compatibility inventory for embedded webapps and plugin configuration panels in [`@signalk/server-admin-ui-dependencies`](https://github.com/SignalK/signalk-server/tree/master/packages/server-admin-ui-dependencies). Its peer dependencies are recorded for this repository in `tests/host-contract.baseline.json`. The inventory does not guarantee that every listed module exists in a federation share scope. The current Admin loader guarantees only React and React DOM through its Webpack-compatible fallback share scope and exposes only the React entry points through its ESM host globals.

A consumer plugin installs that package and imports it from its build configuration, which is how the Admin UI validates the same contract for itself:

```sh
npm install --save-dev @signalk/server-admin-ui-dependencies
```

```js
import "@signalk/server-admin-ui-dependencies";
```

For Webpack, this package shares React and React DOM, and nothing else. For Vite and other ESM builds, the consumer uses the host-global React shims described above. This package uses none of the Bootstrap-family or icon-font libraries, so a consumer remote must not add or share them on its behalf.

The repository checks the declaration against that committed baseline rather than installing the contract package, for the reason recorded in `scripts/check-host-contract.mjs`. The baseline tracks the published npm inventory; it does not prove an installed Signal K version, React runtime, or share scope. Signal K 2.23 still used React 16 in its active Admin UI even though version 2.23.0 of the inventory declared a React 19 peer. This package therefore requires Signal K 2.24 or newer for a React 19 Webpack panel, while the documented ESM globals require Signal K 2.27 or newer. A review of Signal K `master` is a separate forward-compatibility check because unpublished host changes must not silently rewrite the package contract. `npm run host-contract` compares package metadata with the committed baseline. `npm run host-contract:drift` compares the baseline with the current registry declaration without changing files, and `npm run host-contract:update` refreshes and verifies the baseline when reviewed drift should be accepted.

`npm run dependency-contract` separately verifies that the locked React Aria packages remain deduplicated, mutually compatible, and compatible with their declared React peer ranges. It runs in `npm run validate` after the host contract check.

## Installation

Install an exact version as a development dependency because the consumer bundles the package into its panel remote:

```sh
npm install --save-dev --save-exact signalk-nearlcrews-ui@0.8.1
```

For unpublished local changes, build and pack this repository, then install the resulting tarball:

```sh
npm run build
npm pack --ignore-scripts
npm install --save-dev --save-exact ../signalk-nearlcrews-ui/signalk-nearlcrews-ui-0.8.1.tgz
```

Do not configure this package as a runtime Module Federation share. Each plugin should embed the selected package version in its own remote while resolving React and React DOM from the Signal K Admin host through the integration supported by its bundler.

### Entry points

The package root contains lightweight panel, layout, field, feedback, theme, compatibility, and formatting primitives. Version 0.7.0 moved composites, data grids, form composites, and overlays to focused entry points so their ownership and bundle boundaries stay explicit:

```tsx
import { Button, PanelRoot } from "signalk-nearlcrews-ui";
import { EmptyState, Progress } from "signalk-nearlcrews-ui/composites";
import { Cell, Column, DataGrid, Row } from "signalk-nearlcrews-ui/data-grid";
import {
  Radio,
  RadioGroup,
  SecretInput,
  Switch,
} from "signalk-nearlcrews-ui/forms";
import {
  AlertDialog,
  createToastQueue,
  Dialog,
  Menu,
  Popover,
  ToastRegion,
} from "signalk-nearlcrews-ui/overlays";
```

`Accordion`, `EmptyState`, and `Progress` are available only from `/composites`. `Radio`, `RadioGroup`, `SecretInput`, and `Switch` are available only from `/forms`. The complete data-grid collection API is available only from `/data-grid`, and dialogs, menus, popovers, and toasts are available only from `/overlays`. Imports of those APIs from the package root must be migrated when upgrading from 0.6.x.

`signalk-nearlcrews-ui/tokens.css` is the one non-JavaScript entry point. Importing the stylesheet does not import or execute React, so panels in other frameworks can use the tokens described under theme preference below. Installing the package still resolves its declared dependencies and React peer dependencies; the stylesheet is not a dependency-free package split.

The [API reference](docs/api-reference.md) lists the complete entry-point inventory, package-specific props, ref targets, public values, defaults, and localization hooks.

### Browser preflight

Run the CSS-scope check before mounting when the consumer must replace an unsupported panel with a useful message:

```tsx
import {
  PanelRoot,
  supportsNativeCssScope,
  UnsupportedBrowserNotice,
} from "signalk-nearlcrews-ui";

export function ConfigurationEntry() {
  if (!supportsNativeCssScope(window)) {
    return <UnsupportedBrowserNotice />;
  }

  return <PanelRoot>Configuration</PanelRoot>;
}
```

## Basic use

```tsx
import { useState } from "react";
import {
  ActionBar,
  Button,
  LabeledField,
  PanelRoot,
  Section,
  Stack,
  StatusIndicator,
  TextInput,
  ThemeToggle,
} from "signalk-nearlcrews-ui";

interface Configuration {
  serverUrl: string;
}

interface PluginConfigurationPanelProps {
  configuration: Configuration;
  save: (configuration: Configuration) => void;
}

export default function PluginConfigurationPanel({
  configuration,
  save,
}: PluginConfigurationPanelProps) {
  const [serverUrl, setServerUrl] = useState(configuration.serverUrl);

  return (
    <PanelRoot>
      <Stack gap={4}>
        <ThemeToggle />
        <Section title="Connection">
          <LabeledField label="Server URL" required>
            <TextInput
              type="url"
              value={serverUrl}
              onChange={(event) => setServerUrl(event.currentTarget.value)}
            />
          </LabeledField>
        </Section>
        <ActionBar
          sticky="viewport-bottom"
          status={<StatusIndicator>Unsaved changes</StatusIndicator>}
          actions={
            <Button
              variant="primary"
              onClick={() => save({ ...configuration, serverUrl })}
            >
              Save
            </Button>
          }
        />
      </Stack>
    </PanelRoot>
  );
}
```

`PanelRoot` installs one deduplicated style element per package version and CSP nonce in its rendered root's owner document for the lifetime of its mounted roots. Separately bundled remotes share the same document registry. Native CSS scopes limit styles to the nearest exact package-version root, including nested version re-entry. Styles are removed after the last root using that version and nonce unmounts and are never written to `:root`. Consumers do not need a CSS loader. Panels use full width by default so the themed surface covers data-dense administration content. Set `width="standard"` or `width="wide"` when a bounded reading width is appropriate.

For a custom host that restricts stylesheet elements with a nonce, pass that nonce to `PanelRoot`:

```tsx
<PanelRoot styleNonce={styleNonce}>Panel content</PanelRoot>
```

The host must supply the nonce through its own trusted bootstrap. Do not read it from untrusted panel data. The nonce authorizes the package's injected `<style>` element only. Positioning, sizing, progress, and other runtime behavior still uses element `style` attributes, so such a host must also permit those through `style-src-attr`, currently with `'unsafe-inline'`. Signal K Admin `master` disables Content Security Policy and passes only `configuration` and `save` to a plugin configuration panel, so it does not currently provide an official nonce channel.

## Components

- `PanelRoot` provides scoped styles, theme state, and the in-root portal container used by overlays and notifications. Overlays and notifications verify that the resolved target is their exact owning root, so a nested low-level React Aria portal provider cannot redirect them across the panel boundary. `UnsupportedBrowserNotice` is the standalone alert consumers may render instead when their browser preflight rejects native CSS `@scope` support.
- `ThemeToggle` selects Auto, System, Light, Dark, or Night and accepts per-instance labels for localization. Auto follows an explicit host theme and otherwise uses Light. System follows `prefers-color-scheme`. `choices` limits the offered themes, and `onChange` reports each selection.
- `Button` supplies primary, secondary, ghost, and danger presentation, plus compact and pill options. `as="a"` renders an anchor form with a required safe `href`: HTTP, HTTPS, mail, telephone, fragment, query, and relative destinations are supported, while dangerous or unknown schemes are made inert. `fullWidth` stretches the control to its container, and `iconOnly` squares it for icon content with a required accessible name. `ariaDisabled` keeps a control focusable while suppressing activation at a list boundary. A loading button uses the same focus-preserving behavior and accepts `loadingLabel` for its accessible busy-state description.
- `SegmentedControl` implements a single-choice radio group with roving focus, Home, End, and direction-aware arrow keys. It runs controlled through `value` or uncontrolled through `defaultValue`, lays out horizontally or vertically through `orientation`, shows its legend through `legendVisibility`, and carries the selection into native form submission and reset through `name`.
- `RadioGroup` and `Radio` provide a native radio group with label, description, validation messages with opt-in live announcement, and horizontal or vertical orientation. `name` applies to every radio input so native form submission and reset work.
- `Switch` toggles a single setting and mirrors the `Checkbox` naming: `checked` and `defaultChecked` map to the selected state. `name`, `value`, `form`, `disabled`, `readOnly`, and `required` participate in native form behavior.
- `LabeledField`, `InputGroup`, `InputGroupControl`, `InputGroupAddon`, `TextInput`, `NumberInput`, `RangeInput`, `Select`, `Textarea`, and `Checkbox` provide accessible form structure. Render-prop fields identify the primary labeled control while allowing paired inputs, unit suffixes, and adjacent actions, and the render-prop control props carry `descriptionId` and `errorId` so paired controls can reference field text directly. Fields forward `name` and `disabled` to their control, and `optionalLabel` marks optional fields beside the required marker. Fields and checkboxes accept validation messages and opt-in live announcement modes. `TextInput` covers text, email, password, search, tel, url, date, time, datetime-local, month, and week entry. `Checkbox` drives the native mixed state through `indeterminate`, and `RangeInput` shows a filled progress track in every supported engine.
- `SecretInput` composes `TextInput`, `InputGroup`, and an explicit Show or Hide button. It supports controlled and uncontrolled reveal state, customizable labels, trailing content, and an input ref. Pointer activation preserves the input focus, caret, and selection. The consumer still owns the secret value, storage, redaction, and authorization policy.
- `FieldGroup` provides a native fieldset and legend with description, action, validation error, and disabled support.
- `Section` and `CollapsibleSection` provide semantic content grouping. `CollapsibleSection` renders a heading button and a named content region with controlled or uncontrolled state, summaries below the header or trailing within it that stay visible while open through `summaryVisibility`, sibling actions, retained, lazily retained, or unmounted content through `mountStrategy`, and focus restoration.
- `Accordion` coordinates `CollapsibleSection` children so at most one section stays open at a time.
- `Banner` and `StatusIndicator` provide text-backed feedback that does not rely on color alone. Banners span the neutral tone plus the semantic tones, and accept actions, dismissal, a post-dismissal focus destination, localized severity text, and consumer-selected roles such as `note`. `StatusIndicator` varies its dot shape per tone and accepts `live` for opt-in announcements, and both accept `toneLabel` to localize the announced severity.
- `Progress` reports determinate or indeterminate progress with a required label, an optional tone, and `valueText` for assistive technology.
- `ToastRegion` renders queued toasts into the nearest `PanelRoot` portal container and throws when rendered outside one, because a body fallback would lose the scoped theme. `createToastQueue` builds a queue, the shared `toast` queue covers the common single-region setup, and each toast carries a tone, an auto-dismiss delay, and an announcement mode. A queue holds at most five toasts. When full, it prefers to evict the oldest toast that is neither focused nor a sticky warning or danger, with a bounded fallback that always leaves room for the newly enqueued toast. Auto-dismiss pauses during hover or focus, safe-area insets keep the region reachable, and exit removal follows the transition token with immediate reduced-motion behavior and a timer fallback.
- `Stack`, `Cluster`, `Card`, `MetricGrid`, `Metric`, and `Badge` standardize rhythm and presentational status shells while leaving status interpretation local. `Stack`, `Cluster`, `Card`, and `MetricGrid` accept `as` to render a semantic element, and `Card` adds compact density and header and footer slots. Each metric is a named semantic group. `Metric` and `Badge` render a tone glyph for non-neutral tones and accept `toneLabel`. `Metric` also accepts a `unit` suffix beside the value and `live` for opt-in announcements.
- `DataGrid` renders an accessible React Aria table with sortable headers, single or multiple selection, compact density, zebra striping, an `EmptyState`-backed empty view, and virtualized rows above a configurable threshold. React Aria `Virtualizer` and `TableLayout` preserve the complete collection for keyboard navigation and accessibility while observing variable row heights. Give each item a stable `id` or `key`; the index fallback remounts visible rows after sorting or filtering. Sorting is controlled: pair `onSortChange` with `sortDescriptor` and sort `items` in the consumer. `Column`, `Row`, and `Cell` are re-exported from React Aria Components for its collection API.
- `EmptyState` presents an empty view with a decorative icon, a title, a description, and an action. The title is a styled div, not a heading, so consumers own the surrounding outline.
- `ActionBar` lays out consumer-owned state and actions. `sticky="top"` and `sticky="bottom"` preserve scroll-container pinning. `sticky="viewport-bottom"` keeps actions at the usable viewport bottom inside the `PanelRoot` column, accounts for the visual viewport and safe-area inset, reserves flow space, returns to natural flow at its anchor, and leaves when the panel is offscreen. Pass `statusRef` to obtain the focusable status destination, then focus it when save or discard disables the initiating control.
- `InlineConfirm` replaces blocking browser confirmations with a named, focus-managed inline region that supports Escape and announces its message on open. It runs controlled through `open` or uncontrolled through `defaultOpen`. Set `headingLevel` to preserve the surrounding heading hierarchy, `landmark={false}` to drop the region landmark, and `initialFocusRef` and `returnFocusRef` to steer focus on open and close.
- `Dialog` renders a modal surface with a scrim, focus management, Escape and scrim dismissal, a title and description, and an actions footer. It supports controlled or uncontrolled open state and a standard or wide width. Dialog sizing follows the visual viewport and safe-area insets.
- `AlertDialog` shares the `Dialog` API and renders with the `alertdialog` role for confirmations that demand acknowledgement. Its required, non-empty `cancelLabel` creates an always-enabled cancel action before supplemental `actions`; `onCancel` runs before the dialog closes, and `cancelVariant` defaults to `secondary`.
- `Menu` pairs a `Button` trigger with a popover list of `MenuItem` actions, grouped by `MenuSection` and divided by `MenuSeparator`, with destructive styling for irreversible actions.
- `Popover` anchors free-form overlay content to a trigger with logical placement, collision flipping, and an optional fixed width. Use a library `Button` as the trigger. A custom trigger must render a semantic interactive element, forward its ref, and spread every injected event and ARIA prop onto that element. Dialogs, menus, and popovers portal into their owning `PanelRoot`, use public z-index tokens, and raise nested overlays above their owning dialog.

`formatRelativeAge(ageMs, options)` formats a nonnegative elapsed age in milliseconds through `Intl.RelativeTimeFormat`. The defaults are narrow units, numeric output, and the fallback `"unknown"`; callers may provide `locale`, `numeric`, `style`, and `fallback`. Pass an age, not a timestamp, and compute or clamp timestamp differences at the consumer boundary.

`LabeledField` children must accept and forward `id`, `required`, `aria-describedby`, `aria-errormessage`, and `aria-invalid`. The exported `FieldControlProps` interface defines that contract for custom controls. Required field labels, checkbox labels, radio group labels, legends, section titles, collapsible titles, and metric labels must contain rendered, non-whitespace content.

### Refs

Refs are ordinary props and support object refs, callback refs, and React 19 callback-ref cleanup. `Button` resolves to an `HTMLButtonElement` or, with `as="a"`, an `HTMLAnchorElement`. A component exposes a ref only when it has a stable, documented owning element. The [API reference](docs/api-reference.md) lists every ref-capable component and its native target.

`Banner.dismissFocusRef`, `ActionBar.statusRef`, and the `InlineConfirm` focus refs name focus destinations. They do not expose the component itself.

Every package-owned user-visible string is overridable. The [localization table](docs/api-reference.md#localization-defaults) records the defaults for loading, dismissals, tone names, theme choices, empty data, toasts, compatibility notices, and relative-age fallbacks. `AlertDialog.cancelLabel` has no default and must be supplied by the consumer.

Persistent validation text defaults to `errorLive="off"`. Use `polite` or `assertive` only when a newly inserted message must be announced after an interaction:

```tsx
<LabeledField
  label="Server URL"
  error={serverError}
  errorLive={submitted ? "polite" : "off"}
>
  <TextInput type="url" />
</LabeledField>

<Checkbox
  label="Enable provider"
  error={providerError}
  errorLive={submitted ? "polite" : "off"}
/>
```

Loading buttons remain in the focus order and suppress repeat activation. Keep the action label stable and localize the state prefix when needed:

```tsx
<Button loading={saving} loadingLabel="Saving" onClick={save}>
  Configuration
</Button>
```

For a composite field, spread the render-prop contract onto the primary control and copy only its `aria-describedby` value to secondary controls. Use a growing slot for the flexible control and a fixed slot to keep an exact input and its addon together:

```tsx
<LabeledField label="Cache limit" description="Whole GiB" layout="inline">
  {(controlProps) => (
    <InputGroup density="compact">
      <InputGroupControl width="grow">
        <RangeInput {...controlProps} min={4} max={32} />
      </InputGroupControl>
      <InputGroupControl width="fixed">
        <NumberInput
          aria-label="Cache limit exact value"
          aria-describedby={controlProps["aria-describedby"]}
          min={4}
          max={32}
        />
        <InputGroupAddon>GiB</InputGroupAddon>
      </InputGroupControl>
    </InputGroup>
  )}
</LabeledField>
```

All color, spacing, radius, typography, control-size, content-width, and transition tokens listed in [the design contract](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/design-contract.md) are public CSS API. `PUBLIC_TOKEN_NAMES` exposes the same names to tooling. Override tokens through `PanelRoot.style` so the values stay attached to the versioned root instead of depending on private classes or DOM nesting:

```tsx
<PanelRoot
  style={
    {
      "--snui-color-accent-fill": "#0f766e",
      "--snui-color-interactive-hover": "#ecfdf5",
    } as React.CSSProperties
  }
>
  Panel content
</PanelRoot>
```

An inline token override applies in every selected theme. Use it only when that behavior is intentional and verify contrast in Light, Dark, and Night.

## Showcase

The repository ships a fixture page that renders every exported component. The top of that page in each theme:

![Component showcase in the Light theme](https://unpkg.com/signalk-nearlcrews-ui@0.8.1/docs/screenshots/showcase-light.png)

![Component showcase in the Dark theme](https://unpkg.com/signalk-nearlcrews-ui@0.8.1/docs/screenshots/showcase-dark.png)

![Component showcase in the Night theme](https://unpkg.com/signalk-nearlcrews-ui@0.8.1/docs/screenshots/showcase-night.png)

The Night palette preserves red for dark-adapted vision at the helm. The showcase page itself lives in the fixtures directory of the repository and builds with the browser fixture bundle.

## Theme preference

The shared preference key is `signalk-nearlcrews-ui.theme.v1`, the only storage key the package reads or writes. On first resolution, `PanelRoot` uses this order:

1. Read the shared key when it contains a valid value.
2. Otherwise, use Auto without writing an implicit preference. Auto leaves `data-snui-theme` off the root so an optional Bootstrap, CoreUI, or legacy `.dark-mode` ancestor marker can apply. Without a recognized marker, the library uses Light. Signal K Admin does not currently guarantee or set one of these markers.

Selecting a theme writes the shared key and broadcasts the choice to panels in the same document, while open panels in other tabs follow the browser storage event. If the write fails, the selection remains current in the mounted panels for the page session but is not durable. Existing valid values, including Auto and System, otherwise remain authoritative. Auto follows only an optional recognized ancestor marker and falls back to Light, including in the current unmarked Signal K Admin host. System follows the operating-system color preference independently of the host theme. The Night theme uses a red-preserving palette inside the panel, so status remains distinguishable through text, glyphs, shapes, borders, and accessible tone labels rather than hue alone. It does not recolor Signal K host chrome or surrounding page gutters, so a host that needs full-surface night adaptation must coordinate those surfaces separately.

### Tokens without React

`signalk-nearlcrews-ui/tokens.css` is a plain stylesheet carrying the same palette and foundation tokens as the components, so a panel written in another framework or in none at all can match the rest of the family without importing or executing React or loading the component styles. Installing this package still resolves its declared runtime dependencies and React peer dependencies:

```css
@import "signalk-nearlcrews-ui/tokens.css";
```

```html
<div class="snui-tokens" data-snui-theme="dark">
  <p style="color: var(--snui-color-text)">Panel content</p>
</div>
```

Set `data-snui-theme` to `light`, `dark`, `night`, or `system`, or omit it to follow an explicit Bootstrap, CoreUI, or legacy `.dark-mode` host theme with a Light fallback. The sheet needs no native CSS `@scope` support, so the browser floors above bound the React components rather than this file. The design contract records what the `snui-tokens` class guarantees.

Unlike the component root, the class is not version scoped. When two package versions load the sheet into one document, whichever loaded last defines the tokens for every element carrying the class, control sizing included, so a panel can inherit another version's values. A panel that must not should set the tokens it depends on directly on its own root, or use `PanelRoot`, which scopes its tokens to an exact package version.

## Package boundary

Use the standard Signal K schema-generated configuration form when a plugin needs simple declarative fields that every target Admin version renders and validates correctly. Give each property a useful title, description, and default where appropriate, and use only `uiSchema` fields and widgets verified against the target host's installed React JSON Schema Form stack. The plugin schema API accepts full JSON Schema, but the current Admin form reconstructs only part of the root schema and does not preserve contracts such as root `required`, definitions, conditionals, or `additionalProperties`. Verify the actual target host rather than assuming complete JSON Schema support. Use a custom panel, and this component package, when the interaction or validation requires behavior the host form does not preserve. A custom panel does not move Signal K data or business behavior into this package.

A consumer exposing a custom configuration panel uses the fixed `./PluginConfigurationPanel` module name and the `signalk-plugin-configurator` discovery keyword. Its default component receives only the host-owned `configuration` value and `save(configuration)` callback. Those are consumer entry-point responsibilities, not APIs exported or implemented by this component package.

The current host types `save` as a function returning `void` and does not await persistence before updating its local configuration state. Treat calling it as a submission request, not confirmed durable success. A panel that needs confirmation, failure details, or retry behavior must obtain that evidence through a plugin-owned API.

Signal K loads an embedded remote as trusted same-origin code in the Admin document. `PanelRoot`, native CSS scope, versioned styles, and in-root portals isolate presentation; they do not sandbox JavaScript, storage, network access, or the host DOM. Review and secure a custom panel as part of the plugin that ships it.

Keep these concerns in each plugin:

- Fetching and Signal K API calls
- Configuration state and normalization
- SI storage, display-boundary conversion, and server unit preferences
- Local draft, dirty, and submission state; confirmed save status and retry orchestration require a plugin-owned API
- Domain validation and provider behavior
- Plugin-specific tables, cards, and workflows

See [the API reference](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md), [the design contract](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/design-contract.md), [the migration guide](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/migration.md), and [the release policy](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/release-policy.md) for the complete rules.

## Development

```sh
npm ci
npm run validate
npm run test:browser
```

Development supports Node 22.22.2 or newer in the Node 22 release line, Node 24.15.0 or newer in the Node 24 release line, or Node 26. npm 12.0.2 is preferred, and npm 11.16 or newer remains accepted during the transition. These are source-tooling requirements and do not impose a Node runtime on consumers of the browser bundle.

`npm run validate` runs Biome and Prettier formatting, Markdown lint, spelling, repository-local link checks, Biome and type-aware ESLint rules, Knip dead-code analysis, TypeScript checks under both installed compilers, a Signal K Admin host dependency comparison against the committed contract baseline, and a locked React Aria compatibility check. It also runs unit and type-level coverage with aggregate and per-file floors, full and runtime dependency audits, compilation, packed-package validation, an emitted-declaration comparison against the committed baseline, a consumer type check against the packed artifact, export-map-wide bundle-size and React externalization checks, and classic and output-module ESM Webpack fixture builds.

Two TypeScript compilers are installed on purpose. See the TypeScript toolchain section of `CONTRIBUTING.md` in the repository for why, and for the condition that collapses them back to one.

Biome owns JavaScript, TypeScript, JSON, and HTML formatting and supplies the fast recommended lint layer. Prettier is intentionally limited to Markdown and YAML, which Biome does not yet support. Type-aware ESLint remains for project-aware TypeScript, React Hooks, and JSX accessibility rules that are not equivalent to Biome's syntax-aware checks. Knip independently verifies the repository dependency and export graph.

Browser tests require Playwright Chromium, Firefox, and WebKit:

```sh
npx --no-install playwright install chromium firefox webkit
```

Set `SNUI_BROWSER_PORT` to an unused port from 1024 through 65535 when parallel local browser suites would otherwise contend for the default port.

## License

Apache-2.0

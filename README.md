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

The package is a public npm dependency for NearlCrews Signal K projects. It is not a Signal K plugin, webapp, or App Store package. The initial API may change during the `0.x` series, so consumers should pin an exact version.

## What's new in 0.9.0

Version 0.9.0 ships the panel scaffolding every consumer had rebuilt by hand and fixes the accessibility, palette, and packaging defects found across the panels that use it. `PanelShell`, `SaveActionBar`, `NumberField`, `CheckboxGroup`, and the `Text`, `Code`, `VisuallyHidden`, `LiveRegion`, and `RelativeAge` primitives replace local copies; toasts stay reachable under a modal and warnings and failures no longer vanish; Night is red-preserving for every foreground; overlay and data-grid styles reach only the panels that use them; and the Module Federation share map and a consumer check command ship with the package. It is a minor release with breaking changes, so read the [0.9.0 changelog](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/CHANGELOG.md#090---2026-09-08) and [migration guide](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/migration.md#changes-in-090) before upgrading.

- **One panel frame**: `PanelShell` runs the browser preflight, renders `PanelRoot`, the title, the theme toggle, and a `PanelErrorBoundary`, and `SaveActionBar` with `useUnsavedChangesGuard` owns the Save and Discard footer.
- **Numbers that survive typing**: `NumberField` keeps a draft while the user types, validates or clamps against `min`, `max`, `integer`, and `step`, and reports validity, with `useNumberDraft` for a bare input.
- **Toasts you can reach**: notifications stay visible, announced, and focusable while a dialog is open, warning and danger toasts stay until dismissed, focus never drops to the body, and F6 jumps into the region.
- **Consistent vocabulary**: every density prop uses `Density`, every composed control takes `label`, or `legend` where it renders a real fieldset, and value callbacks are `onValueChange` or `onCheckedChange`, with the old names deprecated for one minor release.
- **Tokens for the gaps**: subtle tone fills, a zebra stripe, disabled text, a track color, and three type-scale steps replace the color mixes and raw rem values consumers carried, and the Night palette keeps green and blue at or below `0x40` on every foreground.
- **Styles per module**: `PanelRoot` installs the root sheet, and overlays and `DataGrid` install their own sheets on first mount, so a panel without overlays carries no overlay CSS.
- **Published integration contract**: `signalk-nearlcrews-ui/federation` exports the share map the package was verified with, `snui-check-consumer` asserts a consumer build against the installed release, and CommonJS tooling on Node 22.12 or newer can `require` every JavaScript entry.

## Compatibility

| Package | React peers  | JavaScript | Remote output                                                 | Browser verification                                      | Signal K boundary                                                              |
| ------- | ------------ | ---------- | ------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `0.9.x` | `^19.2.0`    | ES2022     | Classic `var` and output-module ESM Module Federation remotes | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.8.x` | `^19.2.0`    | ES2022     | Classic `var` and output-module ESM Module Federation remotes | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.7.x` | `^19.2.0`    | ES2022     | Classic `var` and output-module ESM Module Federation remotes | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.6.x` | `>=19.2 <20` | ES2022     | Classic `var` and output-module ESM Module Federation remotes | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.5.x` | `>=19.2 <20` | ES2022     | Classic `var` and output-module ESM Module Federation remotes | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.4.x` | `>=19.2 <20` | ES2022     | Classic `var` and output-module ESM Module Federation remotes | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.3.x` | `>=19.2 <20` | ES2022     | Classic `var` and output-module ESM Module Federation remotes | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.2.x` | `>=19.2 <20` | ES2022     | Classic `var` and output-module ESM Module Federation remotes | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.1.x` | `>=19.2 <20` | ES2022     | Classic `var` and output-module ESM Module Federation remotes | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |

## Requirements

- React and React DOM 19.2 or newer within the React 19 release line
- Chromium or Edge 118 or newer, Firefox 146 or newer, or Safari 17.4 or newer
- Signal K Server 2.24 or newer for React 19 Webpack configuration panels, or 2.27 or newer for the documented ESM host-global React path
- A consumer build that bundles this package into its configuration-panel remote

The browser floors come from native CSS `@scope`, which became available in Chromium and Edge 118, Firefox 146, and Safari 17.4. `PanelRoot` throws a clear compatibility error when `CSSScopeRule` is unavailable instead of silently rendering unstyled controls. Signal K installations that embed an older browser engine must update that engine before adopting this package. Right-to-left caret mirroring, select indicator placement, and the range fill direction additionally use `:dir()`, which Chromium added in 120; Chromium and Edge 118 and 119 skip those cosmetic rules while everything else renders correctly.

The package renders in the browser only. Theme resolution reads `window` interfaces such as `localStorage` while mounting, so the components are not intended for server-side rendering.

`PanelShell` runs that preflight once and renders `UnsupportedBrowserNotice`, or a consumer-supplied `unsupported` element, when it fails. Consumers that compose `PanelRoot` directly call `supportsNativeCssScope(window)` themselves and render `UnsupportedBrowserNotice` instead of `PanelRoot` when the check fails. The notice is standalone, renders as a section named by its heading, accepts custom title and body content and a `headingLevel`, and does not run the feature check itself. A failed `PanelRoot` installation still throws the exported `UnsupportedBrowserError`, whose `feature` property is `CSS @scope`. The package does not ship an unscoped fallback because that would weaken style isolation between independently bundled panels.

React and React DOM are peer dependencies, and a consumer must always use the Signal K Admin host's React implementations. A Webpack Module Federation remote resolves React and React DOM from the host share scope as singletons; this repository's fixtures also set `import: false` so a missing host share fails instead of silently bundling a fallback. A Vite or other ESM consumer follows the current Signal K guidance by aliasing `react`, `react-dom`, `react-dom/client`, and `react/jsx-runtime` to shims for the host's `window.__SK_REACT__`, `window.__SK_REACT_DOM__`, `window.__SK_REACT_DOM_CLIENT__`, and `window.__SK_REACT_JSX_RUNTIME__` globals. Neither integration may embed a second React or React DOM implementation.

For a classic Webpack remote, derive the `var` library name from the consumer package name with `packageName.replace(/[-@/]/g, "_")`, because that is the global the Admin loader resolves. For an ESM remote, set the consumer plugin package's `"type"` to `"module"` so Signal K emits a module script and uses dynamic import. If that plugin's server entry remains CommonJS, give `main` a `.cjs` file extension.

The consumer bundles this package and its React Aria dependencies into the remote rather than configuring this package as a shared runtime singleton. See the Signal K project's [embedded-component and React-sharing guidance](https://github.com/SignalK/signalk-server/blob/master/docs/develop/webapps.md#embedded-components-and-admin-ui--server-interfaces) for the host contract that each consumer build must follow.

The repository builds real production classic `var` and output-module ESM Module Federation remotes. Its browser harness initializes those containers with a minimal host-equivalent React and React DOM share scope. It does not reproduce the complete Signal K Admin bootstrap or the ESM host-global shim path, so each consumer must retain a production remote-load check against its supported Signal K host.

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

### Federation share map

The share definition is published, so a Webpack consumer reads it instead of copying the block and its host comment:

```js
const { shared, hostNotes } = require("signalk-nearlcrews-ui/federation");

new ModuleFederationPlugin({
  // ...
  shared,
});
```

`shared` declares `react` and `react-dom` as singletons with `requiredVersion` set to this package's peer range and `import: false`, and no `strictVersion`. `hostNotes` explains why: Signal K Admin releases up to at least 2.24.0 register their React share as 19.0.0 while shipping a newer React, and current master registers `React.version`, so a strict check would refuse a compatible host. The entry is CommonJS and carries its own declarations, and the repository's own fixtures build from it, so the map a consumer spreads is the map the package was verified with.

### Checking a consumer build

The package ships `snui-check-consumer`, which asserts that a consumer's build matches the release it installed:

```sh
npx snui-check-consumer --root . --remote public/remoteEntry.js --baseline scripts/panel-size-baseline.json
```

It checks, in order, that `package.json` pins an exact version equal to the installed `node_modules/signalk-nearlcrews-ui`, that every JavaScript file beside the remote entry carries that version's `data-snui-version` stamp and no other, that no React runtime was bundled, that the remote consumes exactly the published share map (and that a `webpack.config.cjs` or `webpack.config.js` beside `--root` declares it, when one exists; pass `--webpack-config` to name another file), and, with `--baseline`, that the gzip size of the remote's JavaScript and CSS assets stays within the recorded allowance. The baseline is a JSON object with `gzipBytes` (the recorded size), `maximumIncreasePercent` (the growth the check allows over it), and an optional `approvedCeilingGzipBytes` (an explicitly approved size above that allowance). Run it after the panel build in the consumer's own check script.

The repository checks the declaration against that committed baseline rather than installing the contract package, for the reason recorded in `scripts/check-host-contract.mjs`. The baseline tracks the published npm inventory; it does not prove an installed Signal K version, React runtime, or share scope. Signal K 2.23 still used React 16 in its active Admin UI even though version 2.23.0 of the inventory declared a React 19 peer. This package therefore requires Signal K 2.24 or newer for a React 19 Webpack panel, while the documented ESM globals require Signal K 2.27 or newer. A review of Signal K `master` is a separate forward-compatibility check because unpublished host changes must not silently rewrite the package contract. `npm run host-contract` compares package metadata with the committed baseline. `npm run host-contract:drift` compares the baseline with the current registry declaration without changing files, and `npm run host-contract:update` refreshes and verifies the baseline when reviewed drift should be accepted.

`npm run dependency-contract` separately verifies that the locked React Aria packages remain deduplicated, mutually compatible, and compatible with their declared React peer ranges. It runs in `npm run validate` after the host contract check.

## Installation

Install an exact version as a development dependency because the consumer bundles the package into its panel remote:

```sh
npm install --save-dev --save-exact signalk-nearlcrews-ui@0.9.0
```

For unpublished local changes, build and pack this repository, then install the resulting tarball. `--pack-destination ..` keeps the tarball out of the repository tree:

```sh
npm run build
npm pack --ignore-scripts --pack-destination ..
npm install --save-dev --save-exact ../signalk-nearlcrews-ui-0.9.0.tgz
```

Do not configure this package as a runtime Module Federation share. Each plugin should embed the selected package version in its own remote while resolving React and React DOM from the Signal K Admin host through the integration supported by its bundler.

### Entry points

The package root contains the panel shell and root, layout, text, field, feedback, theme, compatibility, and formatting primitives. Version 0.7.0 moved composites, data grids, form composites, and overlays to focused entry points so their ownership and bundle boundaries stay explicit:

```tsx
import { Button, NumberField, PanelShell } from "signalk-nearlcrews-ui";
import {
  CheckboxGroup,
  EmptyState,
  Progress,
  SaveActionBar,
  Table,
  Tabs,
} from "signalk-nearlcrews-ui/composites";
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

`Accordion`, `CheckboxGroup`, `EmptyState`, `Progress`, `SaveActionBar`, `Disclosure`, `Tabs`, and `Table` are available only from `/composites`. `Radio`, `RadioGroup`, `SecretInput`, and `Switch` are available only from `/forms`. The complete data-grid collection API is available only from `/data-grid`, and dialogs, menus, popovers, and toasts are available only from `/overlays`. `Accordion`, `EmptyState`, and `Progress` moved out of the package root in 0.7.0, so a panel upgrading from 0.6.x must update those imports.

`signalk-nearlcrews-ui/tokens.css` is the one stylesheet entry point. Importing the stylesheet does not import or execute React, so panels in other frameworks can use the tokens described under theme preference below. Installing the package still resolves its declared dependencies and React peer dependencies; the stylesheet is not a dependency-free package split.

Two entries serve build tooling rather than the browser: `signalk-nearlcrews-ui/federation` is the CommonJS Module Federation share map described under the host dependencies above, and `signalk-nearlcrews-ui/package.json` exposes the manifest so a build script can read the installed version through Node resolution. Every JavaScript entry also carries a `default` condition, so a CommonJS consumer such as a Node test runner can `require` it on Node 22.12 or newer.

The [API reference](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md) lists the complete entry-point inventory, the gzip size of each entry, package-specific props, ref targets, public values, defaults, and localization hooks.

### Browser preflight

`PanelShell` runs the CSS-scope check itself and renders `UnsupportedBrowserNotice` when it fails. A consumer that composes `PanelRoot` directly runs the check before mounting so an unsupported browser gets a useful message instead of a thrown error:

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
  LabeledField,
  PanelShell,
  Section,
  TextInput,
  useUnsavedChangesGuard,
} from "signalk-nearlcrews-ui";
import { SaveActionBar } from "signalk-nearlcrews-ui/composites";

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
  const dirty = serverUrl !== configuration.serverUrl;
  useUnsavedChangesGuard(dirty);

  return (
    <PanelShell title="Connection">
      <Section title="Server" headingLevel={3}>
        <LabeledField label="Server URL" required>
          <TextInput
            type="url"
            value={serverUrl}
            onChange={(event) => setServerUrl(event.currentTarget.value)}
          />
        </LabeledField>
      </Section>
      <SaveActionBar
        dirty={dirty}
        onDiscard={() => setServerUrl(configuration.serverUrl)}
        onSave={() => save({ ...configuration, serverUrl })}
      />
    </PanelShell>
  );
}
```

`PanelShell` is the recommended frame. It runs the browser preflight once, then renders `PanelRoot`, an outer `Stack`, the optional title at `headingLevel` (default 2, because Signal K Admin owns the page heading), a `ThemeToggle` placed by `themeToggle`, and a `PanelErrorBoundary` that offers "Try again" and, with `onReload`, a page reload when the panel content throws. Every other `PanelRoot` prop reaches the root; `title` and `children` belong to the shell, and `onError` goes to the error boundary rather than the root element.

`PanelRoot` installs the root stylesheet as one deduplicated style element per package version and CSP nonce in its rendered root's owner document for the lifetime of its mounted roots. `Dialog`, `AlertDialog`, `Popover`, `Menu`, and `ToastRegion` install the overlay sheet, and `DataGrid` installs the table sheet, the same way on first mount, so a panel without overlays or grids carries none of their CSS; both therefore require a `PanelRoot` ancestor. Separately bundled remotes share the same document registry. Native CSS scopes limit styles to the nearest exact package-version root, including nested version re-entry. Styles are removed after the last root using that version and nonce unmounts and are never written to `:root`. Consumers do not need a CSS loader. Panels use full width by default so the themed surface covers data-dense administration content. Set `width="standard"` or `width="wide"` when a bounded reading width is appropriate.

For a custom host that restricts stylesheet elements with a nonce, pass that nonce to `PanelRoot`:

```tsx
<PanelRoot styleNonce={styleNonce}>Panel content</PanelRoot>
```

The host must supply the nonce through its own trusted bootstrap. Do not read it from untrusted panel data. The nonce authorizes the package's injected `<style>` elements only; the overlay and table module sheets carry the same nonce as the root sheet, so a host that authorizes one authorizes them all. Positioning, sizing, progress, and other runtime behavior still uses element `style` attributes, so such a host must also permit those through `style-src-attr`, currently with `'unsafe-inline'`. Signal K Admin `master` disables Content Security Policy and passes only `configuration` and `save` to a plugin configuration panel, so it does not currently provide an official nonce channel.

## Components

- `PanelShell` composes the whole panel frame: the browser preflight, `PanelRoot`, an outer `Stack`, an optional `title` and `description` at `headingLevel`, a `ThemeToggle` placed at the `"end"`, `"between"` the title and content, or nowhere, and a `PanelErrorBoundary` around the children. `PanelErrorBoundary` catches a render error inside the panel, offers "Try again" and an optional reload action, and accepts a `fallback` render prop and `onError`. `useUnsavedChangesGuard(dirty)` registers the browser's unload confirmation while a panel has unsaved changes.
- `PanelRoot` provides scoped styles, theme state, and the in-root portal container used by overlays and notifications. Overlays and notifications verify that the resolved target is their exact owning root, so a nested low-level React Aria portal provider cannot redirect them across the panel boundary. `UnsupportedBrowserNotice` is the standalone section, named by its heading, that consumers may render instead when their browser preflight rejects native CSS `@scope` support.
- `ThemeToggle` selects Auto, System, Light, Dark, or Night and accepts a `label` and per-instance choice labels for localization. Auto follows an explicit host theme and otherwise uses Light. System follows `prefers-color-scheme`. `choices` limits the offered themes, and `onValueChange` reports each selection.
- `Button` supplies primary, secondary, ghost, and danger presentation, plus compact and pill options. `as="a"` renders an anchor form with a required safe `href`: HTTP, HTTPS, mail, telephone, fragment, query, and relative destinations are supported, while dangerous or unknown schemes are made inert. `fullWidth` stretches the control to its container, and `iconOnly` squares it for icon content with a required accessible name. `ariaDisabled` keeps a control focusable while suppressing activation at a list boundary. A loading button uses the same focus-preserving behavior and accepts `loadingLabel` for its accessible busy-state description.
- `SegmentedControl` implements a single-choice radio group with roving focus, Home, End, and direction-aware arrow keys. It runs controlled through `value` or uncontrolled through `defaultValue`, lays out horizontally or vertically through `orientation`, takes its accessible name from `label` and shows or hides it through `labelVisibility`, reports the selection through `onValueChange`, and carries it into native form submission and reset through `name`.
- `RadioGroup` and `Radio` provide a native radio group with label, description, validation messages with opt-in live announcement, and horizontal or vertical orientation. `onValueChange` reports the selected value, and `name` applies to every radio input so native form submission and reset work.
- `Switch` toggles a single setting and mirrors the `Checkbox` naming: `checked` and `defaultChecked` map to the selected state, `label` names it, and `onCheckedChange` reports the next state. `name`, `value`, `form`, `disabled`, `readOnly`, and `required` participate in native form behavior.
- `LabeledField`, `InputGroup`, `InputGroupControl`, `InputGroupAddon`, `TextInput`, `NumberInput`, `RangeInput`, `Select`, `Textarea`, and `Checkbox` provide accessible form structure. Render-prop fields identify the primary labeled control while allowing paired inputs, unit suffixes, and adjacent actions, and the render-prop control props carry `descriptionId` and `errorId` so paired controls can reference field text directly; `splitLabeledFieldControlProps` separates the two ids from the spreadable control props. Fields forward `name` and `disabled` to their control, `optionalLabel` marks optional fields beside the required marker, and `density` takes the shared `Density` vocabulary. Fields and checkboxes accept validation messages and opt-in live announcement modes. `TextInput` covers text, email, password, search, tel, url, date, time, datetime-local, month, and week entry, and text controls accept `monospace` for keys, paths, and identifiers. `Textarea.minRows` sets a visible row floor the control grows from where the browser supports it. `Checkbox` drives the native mixed state through `indeterminate` and hides a still-required label through `labelVisibility="hidden"`, and `RangeInput` shows a filled progress track in every supported engine.
- `NumberField` is a labeled numeric field that keeps a draft while the user types and commits what the text resolves to on every keystroke. Without `fallback` it validates against `min`, `max`, `exclusiveMin`, `exclusiveMax`, and `integer`, shows a per-reason message, and reports `onValidityChange`; with `fallback` it clamps, truncates, and snaps to `step`. `allowEmpty` commits `undefined` for a cleared field, `unit` renders an addon, and a wheel over the focused input blurs it so scrolling cannot spin the value. `useNumberDraft` gives a bare `NumberInput` the same buffer.
- `SecretInput` composes `TextInput`, `InputGroup`, and an explicit Show or Hide button. It supports controlled and uncontrolled reveal state, customizable labels, trailing content, and an input ref. Pointer activation preserves the input focus, caret, and selection, and the input defaults to `new-password` autocompletion with spelling, capitalization, and correction services off so a revealed secret is not captured. The consumer still owns the secret value, storage, redaction, and authorization policy.
- `FieldGroup` provides a native fieldset and legend with description, action, validation error, and disabled support. `CheckboxGroup` builds on it: a grid or stacked list of `Checkbox` options with controlled or uncontrolled selection, `name` for native form data, a tri-state select-all checkbox in the legend row, and an `emptyWarning` announced politely while nothing is selected.
- `Section` and `CollapsibleSection` provide semantic content grouping. `CollapsibleSection` renders a heading button and a named content region with controlled or uncontrolled state, summaries below the header or trailing within it that stay visible while open through `summaryVisibility`, a `leading` slot outside the toggle, sibling actions, retained, lazily retained, or unmounted content through `mountStrategy`, an `embedded` variant for nesting inside a `Card`, a `landmark` opt-out, and focus restoration. A retaining strategy keeps hidden state alive while pausing the subtree's effects, so an effect there runs its cleanup on collapse and runs again on expand. The [API reference](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md) records the rules that follow for validity reporting, abortable work, and one-time initialization.
- `Accordion` coordinates `CollapsibleSection` children so at most one section stays open at a time. Its sections are not region landmarks unless a child passes `landmark`.
- `Disclosure`, `DisclosureTrigger`, and `DisclosurePanel` provide a headless button-triggered disclosure that owns the ids, `aria-expanded`, `aria-controls`, and the focus handoff into the panel on open and back to the trigger on close; `useDisclosure` returns the same props for custom elements. `Tabs`, `TabList`, `Tab`, and `TabPanel` provide a tab list with roving tabindex, direction-aware arrow, Home, and End keys, automatic or manual activation, a `badge` slot per tab, and a `mountStrategy` per panel.
- `Banner` and `StatusIndicator` provide text-backed feedback that does not rely on color alone. Banners span the neutral tone plus the semantic tones, and accept actions, dismissal, a post-dismissal focus destination, localized severity text, and consumer-selected roles such as `note`. `StatusIndicator` varies its dot shape per tone, renders the tone glyph beside the dot, offers `size="compact"` for chips while keeping its text for assistive technology, and accepts `live` for opt-in announcements. Both accept `toneLabel` to localize the announced severity.
- `Progress` reports determinate or indeterminate progress with a required label, an optional tone, and `valueText` for assistive technology. A non-finite value renders as indeterminate.
- `Text`, `Code`, and `VisuallyHidden` are the hint, caption, identifier, and hidden-text primitives. `Text` takes a `tone`, a `size`, and an element `as`; `Code` wraps inline anywhere and takes `block` for preformatted text. `LiveRegion` is a visually hidden announcer that takes a `message` and an announcement mode and emits exactly one of `role` or `aria-live`.
- `RelativeAge` renders an elapsed age as words from `ageMs` or a `since` timestamp, owns its own tick when given a timestamp, and renders a `<time dateTime>` element for it.
- `ToastRegion` renders queued toasts into the nearest `PanelRoot` portal container and throws when rendered outside one, because a body fallback would lose the scoped theme. `createToastQueue` builds a queue, the shared `toast` queue covers the common single-region setup, and each toast carries a tone, an auto-dismiss delay, and an announcement mode. Info and success toasts time out after five seconds; warning and danger toasts stay until dismissed, and only danger is assertive. A queue holds at most five toasts. When full, it prefers to evict the oldest toast that is neither focused nor a sticky warning or danger, with a bounded fallback that always leaves room for the newly enqueued toast. The region renders only while it has toasts, sits one Tab stop from the panel start, and answers F6 from anywhere in the panel. Toasts stay visible, announced, and dismissable while a dialog is open, dismissing one moves focus to the next toast or back to where it came from, auto-dismiss pauses during hover or focus, safe-area insets keep the region reachable, and exit removal follows the transition token with immediate reduced-motion behavior and a timer fallback.
- `Stack`, `Cluster`, `Card`, `MetricGrid`, `Metric`, and `Badge` standardize rhythm and presentational status shells while leaving status interpretation local. `Stack`, `Cluster`, `Card`, and `MetricGrid` accept `as` to render a semantic element and type their attributes and ref by that element, so `<Stack as="form">` accepts form attributes. `Card` adds compact and flush density, a `tone` accent bar, and header and footer slots. Each metric is a named semantic group. `Metric` and `Badge` render a tone glyph for non-neutral tones and accept `toneLabel`. `Metric` also accepts a `unit` suffix beside the value and `live` for opt-in announcements.
- `DataGrid` renders an accessible React Aria table with sortable headers, single or multiple selection, compact density, zebra striping, an `EmptyState`-backed empty view, and virtualized rows above a configurable threshold. React Aria `Virtualizer` and `TableLayout` preserve the complete collection for keyboard navigation and accessibility while observing variable row heights. Give each item a stable `id` or `key`; the index fallback remounts visible rows after sorting or filtering. Sorting is controlled: pair `onSortChange` with `sortDescriptor` and sort `items` in the consumer. `Column` is the package's wrapper around React Aria's column and adds `numeric` (end-aligned figures in tabular digits) and `wrap` (multi-line virtualized cells); `Row` and `Cell` are re-exported from React Aria Components. The grid installs its styles from the owning `PanelRoot` and requires one.
- `Table`, `TableHeaderCell`, `TableCell`, and `TableScrollRegion` cover the small semantic table that does not need the grid: a table named by `caption` or ARIA, `numeric` cells, `zebra` rows, `density`, and a focusable named scroll region.
- `EmptyState` presents an empty view with a decorative icon, a title, a description, and an action. The title is a styled div, not a heading, so consumers own the surrounding outline.
- `ActionBar` lays out consumer-owned state and actions. `sticky="top"` and `sticky="bottom"` preserve scroll-container pinning. `sticky="viewport-bottom"` keeps actions at the usable viewport bottom inside the `PanelRoot` column, accounts for the visual viewport and safe-area inset, reserves flow space, returns to natural flow at its anchor, and leaves when the panel is offscreen. Pass `statusRef` to obtain the focusable status destination, then focus it when save or discard disables the initiating control.
- `SaveActionBar` is the Save and Discard footer built on `ActionBar`. It takes `dirty`, `saving`, `unconfigured`, `saveRequestedAt`, and `invalidMessage`, renders a polite status whose tone follows the state, disables Save per the shared rule, moves focus to the status after either action, and docks at the viewport bottom by default. `resolveSaveActionBarState` exposes the rules as data for tests.
- `InlineConfirm` replaces blocking browser confirmations with a named, focus-managed inline region that supports Escape and announces its message on open. It runs controlled through `open` or uncontrolled through `defaultOpen`. Set `headingLevel` to preserve the surrounding heading hierarchy, `landmark={false}` to drop the region landmark, and `initialFocusRef` and `returnFocusRef` to steer focus on open and close.
- `Dialog` renders a modal surface with a scrim, focus management, a title and description, and an actions footer that accepts nodes or a `(close) => nodes` function so an uncontrolled dialog can close from its own action. `dismissable` covers a scrim press and `keyboardDismissable` covers Escape, and every decline calls `onCancel` before the dialog closes. It supports controlled or uncontrolled open state and a standard or wide width. Dialog sizing follows the visual viewport and safe-area insets.
- `AlertDialog` shares the `Dialog` API and renders with the `alertdialog` role for confirmations that demand acknowledgement. Its required, non-empty `cancelLabel` creates an always-enabled cancel action before supplemental `actions`; `onCancel` runs before the dialog closes for the cancel button, Escape, and a scrim press when one is allowed, `cancelVariant` defaults to `secondary`, and scrim dismissal is off by default.
- `Menu` pairs a `Button` trigger with a popover list of `MenuItem` actions, grouped by `MenuSection` and divided by `MenuSeparator`, with destructive styling for irreversible actions. The menu family exposes refs and forwards the attributes React Aria passes to the DOM, and an item derives its typeahead text from its children.
- `Popover` anchors free-form overlay content to a trigger with logical placement, collision flipping, and an optional fixed `width` given as a CSS length. Use a library `Button` as the trigger. A custom trigger must render a semantic interactive element, forward its ref, and spread every injected event and ARIA prop onto that element. Dialogs, menus, and popovers portal into their owning `PanelRoot`, use public z-index tokens that sit above the Signal K Admin fixed header and sidebar, and raise nested overlays above their owning dialog.

`formatRelativeAge(ageMs, options)` formats an elapsed age in milliseconds through `Intl.RelativeTimeFormat`, from seconds through years. The defaults read as words (`numeric: "auto"`, `style: "long"`, so `"now"` and `"2 minutes ago"`) with the fallback `"unknown"`; `RELATIVE_AGE_NARROW` restores the compact form, and callers may provide `locale`, `numeric`, `style`, `negative`, and `fallback`. A small negative age from clock skew reads as now unless `negative: "fallback"` is passed. `formatRelativeAgeSince(timestamp, nowMs, options)` accepts epoch milliseconds, ISO strings, and dates, and the `RelativeAge` component owns the clock read and the tick.

`LabeledField` children must accept and forward `id`, `required`, `aria-describedby`, `aria-errormessage`, and `aria-invalid`. The exported `FieldControlProps` interface defines that contract for custom controls. Required field labels, checkbox labels, radio group labels, legends, section titles, collapsible titles, and metric labels must contain rendered, non-whitespace content.

### Refs

Refs are ordinary props and support object refs, callback refs, and React 19 callback-ref cleanup. `Button` resolves to an `HTMLButtonElement` or, with `as="a"`, an `HTMLAnchorElement`. A component exposes a ref only when it has a stable, documented owning element. The [API reference](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md) lists every ref-capable component and its native target.

`Banner.dismissFocusRef`, `ActionBar.statusRef`, and the `InlineConfirm` focus refs name focus destinations. They do not expose the component itself.

Every package-owned user-visible string is overridable. The [localization table](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md#localization-defaults) records the defaults for loading, dismissals, tone names, theme choices, empty data, toasts, compatibility notices, panel errors, the save bar, number-field validation, and relative-age fallbacks. `AlertDialog.cancelLabel` has no default and must be supplied by the consumer.

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

![Component showcase in the Light theme](https://unpkg.com/signalk-nearlcrews-ui@0.9.0/docs/screenshots/showcase-light.png)

![Component showcase in the Dark theme](https://unpkg.com/signalk-nearlcrews-ui@0.9.0/docs/screenshots/showcase-dark.png)

![Component showcase in the Night theme](https://unpkg.com/signalk-nearlcrews-ui@0.9.0/docs/screenshots/showcase-night.png)

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

Development supports Node 22.22.2 or newer in the Node 22 release line, Node 24.15.0 or newer in the Node 24 release line, or Node 26, with npm 11.16 or newer or npm 12; `devEngines` in `package.json` is the enforced statement of both ranges. These are source-tooling requirements and do not impose a Node runtime on consumers of the browser bundle; the published `engines.node` is the `>=22` floor Signal K server itself declares.

`npm run validate` runs Biome and Prettier formatting, Markdown lint, spelling, repository-local link checks, Biome and type-aware ESLint rules, Knip dead-code analysis, TypeScript checks under both installed compilers, a Signal K Admin host dependency comparison against the committed contract baseline, and a locked React Aria compatibility check. It also runs unit and type-level coverage with aggregate and per-file floors, the runtime dependency audit, compilation, packed-package validation, an emitted-declaration comparison against the committed baseline, a consumer type check against the packed artifact, export-map-wide bundle-size and React externalization checks, and classic `var` and output-module ESM Module Federation fixture builds. The full-tree dependency audit runs as a separate, non-blocking CI job.

Two TypeScript compilers are installed on purpose. See the TypeScript toolchain section of `CONTRIBUTING.md` in the repository for why, and for the condition that collapses them back to one.

Biome owns JavaScript, TypeScript, JSON, and HTML formatting and supplies the fast recommended lint layer. Prettier is intentionally limited to Markdown and YAML, which Biome does not yet support. Type-aware ESLint remains for project-aware TypeScript, React Hooks, and JSX accessibility rules that are not equivalent to Biome's syntax-aware checks. Knip independently verifies the repository dependency and export graph.

Browser tests require Playwright Chromium, Firefox, and WebKit:

```sh
npx --no-install playwright install chromium firefox webkit
```

Set `SNUI_BROWSER_PORT` to an unused port from 1024 through 65535 when parallel local browser suites would otherwise contend for the default port.

## License

Apache-2.0

# Signal K NearlCrews UI

[![npm version](https://img.shields.io/npm/v/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)
[![npm downloads](https://img.shields.io/npm/dm/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)
[![CI](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/LICENSE)
[![node (dev)](https://img.shields.io/badge/node%20%28dev%29-22.22.2%20%7C%2024.15.0%20%7C%2026.0.0-brightgreen.svg)](https://nodejs.org)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://www.buymeacoffee.com/nearlcrews)

`signalk-nearlcrews-ui` provides accessible, theme-aware React primitives for NearlCrews Signal K administration panels. It standardizes common panel behavior without taking ownership of plugin data, Signal K APIs, units, validation, or save workflows.

The package is intentionally distinct from the official Signal K user interface and its internal component systems.

## Status

The package is a public npm dependency for NearlCrews Signal K projects. It is not a Signal K plugin, webapp, or App Store package. The API may still change during the `0.x` series, so consumers should pin an exact version.

## What's new in 0.12.0

Version 0.12.0 is a small release. Two announcements read correctly, one API reference row matches the code again, and panels do less work per render. It ships as a minor because the emitted declarations changed, and the release policy treats those as part of the public contract. No entry point gained or lost an export, so a panel upgrades by moving its pin.

- **An announcement keeps the punctuation it was written with.** A panel error whose title ended in "!" or "?" was announced with an extra full stop after it, because only a trailing "." was taken off before the title and the description were joined.
- **A blank bundled string reads as absent.** `ThemeToggle` falls back to the package's host-theme guidance when a panel's label bundle supplies a blank `themeToggle.description`, which is the rule every other bundled string already followed.
- **The `formatRelativeAge` row is accurate again.** The API reference still described the defaults from before 0.11.0. `numeric` is unset by default and resolves per unit, counting in numbers from the day up and taking the reader's words below it, and the fallback string is `"Unknown"`.
- **Panels do less work per render.** A menu item derives its typeahead text when its children change, a button resolves its busy label only while it is loading, a portal consumer proves its owning panel root once per root, and a region tracking focus reads the focused element directly instead of building the composed path for every focus move in the document.

The full list, including the declaration change and the internal helpers it names, is in the [0.12.0 changelog](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/CHANGELOG.md#0120---2026-09-14).

## Compatibility

| Version  | React peers                                 |
| -------- | ------------------------------------------- |
| `0.12.x` | `^19.2.0`                                   |
| `0.11.x` | `^19.2.0`                                   |
| `0.10.x` | `^19.2.0`                                   |
| `0.9.x`  | `^19.2.0`                                   |
| `0.8.x`  | `^19.2.0`                                   |
| `0.7.x`  | `>=19.2 <20` in 0.7.0, `^19.2.0` from 0.7.1 |
| `0.6.x`  | `>=19.2 <20`                                |
| `0.5.x`  | `>=19.2 <20`                                |
| `0.4.x`  | `>=19.2 <20`                                |
| `0.3.x`  | `>=19.2 <20`                                |
| `0.2.x`  | `>=19.2 <20`                                |
| `0.1.x`  | `>=19.2 <20`                                |

The React peer range is the only column that has ever moved. Every released line targets ES2022, ships classic `var` and output-module ESM Module Federation remotes, is verified in Playwright Chromium, Firefox, WebKit, and mobile Chromium, and stays presentational: each consumer verifies its own Signal K Admin integration.

## Requirements

- React and React DOM 19.2 or newer within the React 19 release line
- Chromium or Edge 118 or newer, Firefox 146 or newer, or Safari 17.4 or newer
- Signal K Server 2.24 or newer, and a later release for some remote formats, as the floor table below sets out
- A consumer build that bundles this package into its configuration-panel remote

The browser floors come from native CSS `@scope`, which became available in Chromium and Edge 118, Firefox 146, and Safari 17.4. `PanelRoot` throws a clear compatibility error when `CSSScopeRule` is unavailable instead of silently rendering unstyled controls. Signal K installations that embed an older browser engine must update that engine before adopting this package. Right-to-left caret mirroring, select indicator placement, the range fill direction, the direction of an indeterminate progress bar, and the mirroring of the Night resize grip additionally use `:dir()`, which Chromium added in 120; Chromium and Edge 118 and 119 skip those presentational rules, drawing them left to right, while everything else renders correctly. Arrow-key movement does not depend on the selector, because `Tabs` and `SegmentedControl` read the direction from the computed style.

The package renders in the browser only. Theme resolution reads `window` interfaces such as `localStorage` while mounting, so the package does not support hydrating into a server-rendered document. Static rendering with `renderToStaticMarkup` is supported, because the shipped consumer check relies on it: the theme context supplies a server snapshot for exactly that path.

`PanelShell` runs the native CSS `@scope` preflight once and renders `UnsupportedBrowserNotice`, worded from `labels.unsupportedBrowser`, or a consumer-supplied `unsupported` element, when it fails. The shell renders the same notice, headed "Signal K update required" and naming both versions, when the host supplies a React older than 19.2. Consumers that compose `PanelRoot` directly call `supportsNativeCssScope(window)` themselves and render `UnsupportedBrowserNotice` instead of `PanelRoot` when the check fails. The notice is standalone, renders as a section named by its heading, accepts custom title and body content and a `headingLevel`, and does not run the feature check itself. A failed `PanelRoot` installation still throws the exported `UnsupportedBrowserError`, whose `feature` property is `CSS @scope`. The package does not ship an unscoped fallback because that would weaken style isolation between independently bundled panels.

React and React DOM are peer dependencies, and a consumer must always use the Signal K Admin host's React implementations. A Webpack Module Federation remote resolves React and React DOM from the host share scope as singletons; this repository's fixtures also set `import: false` so a missing host share fails instead of silently bundling a fallback. A Vite or other ESM consumer follows the current Signal K guidance by aliasing `react`, `react-dom`, `react-dom/client`, and `react/jsx-runtime` to shims for the host's `window.__SK_REACT__`, `window.__SK_REACT_DOM__`, `window.__SK_REACT_DOM_CLIENT__`, and `window.__SK_REACT_JSX_RUNTIME__` globals. Neither integration may embed a second React or React DOM implementation.

For a classic Webpack remote, derive the `var` library name from the consumer package name with `packageName.replace(/[-@/]/g, "_")`, because that is the global the Admin loader resolves. For an ESM remote, set the consumer plugin package's `"type"` to `"module"` so Signal K emits a module script and uses dynamic import. If that plugin's server entry remains CommonJS, give `main` a `.cjs` file extension.

The consumer bundles this package and its React Aria dependencies into the remote rather than configuring this package as a shared runtime singleton. See the Signal K project's [embedded-component and React-sharing guidance](https://github.com/SignalK/signalk-server/blob/master/docs/develop/webapps.md#embedded-components-and-admin-ui--server-interfaces) for the host contract that each consumer build must follow.

### Signal K floor by remote format

The floors were read from the server source at each release tag, with the loader facts current at 2.33.0.

| Remote format                                                                                        | Minimum Signal K       | Why                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classic Webpack `var` remote                                                                         | 2.24, 2.29 recommended | 2.24 is the first Admin on React 19. From 2.24 through 2.28 a classic remote could intermittently report "Module ... is not available" until a reload; 2.29 loads each script once and fixed it |
| Webpack module remote (`library.type: "module"`) with the published share map and `"type": "module"` | 2.25                   | 2.25 is the first server that writes a module script tag for a `"type": "module"` package, and the first loader that imports it                                                                 |
| Vite or other module remote on the `window.__SK_REACT*__` globals                                    | 2.27                   | The host-global React shims arrived in 2.27                                                                                                                                                     |

`npm run host-contract:loader`, described under the host contract below, reports when the loader code the table rests on changes.

The repository builds real production classic `var` and output-module ESM Module Federation remotes. Its browser harness loads those containers through the published host harness, which mirrors the Signal K Admin loader's share scope, script routing, and configuration view. It does not reproduce the complete Signal K Admin bootstrap or the ESM host-global shim path, so each consumer must retain a production remote-load check against its supported Signal K host.

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

`shared` declares `react` and `react-dom` as singletons with `requiredVersion` set to this package's peer range and `import: false`, and no `strictVersion`. `hostNotes` records why, and begins: "Signal K Admin 2.24.0 and 2.25.0 register their React share as 19.0.0 while shipping a newer React; every release from 2.26.0 registers React.version." A strict check would therefore refuse to mount on those two supported hosts. The entry is CommonJS and carries its own declarations, and the repository's own fixtures build from it, so the map a consumer spreads is the map the package was verified with.

### Checking a consumer build

The package ships `snui-check-consumer`, which asserts that a consumer's build matches the release it installed and loads the way the Signal K Admin will load it:

```sh
npx snui-check-consumer --root . --remote public/remoteEntry.js --baseline scripts/panel-size-baseline.json
```

`--root` resolves against the working directory, and every other path resolves against `--root`. Run the command after the panel build in the consumer's own check script.

The command checks remotes built with Webpack's `ModuleFederationPlugin`. A Vite or other module remote on the Admin's React globals is an integration the package supports and this command does not check: the entry check fails with a sentence that says so, rather than as a share map mismatch.

The command runs the consumer's own code. It loads the installed package's federation entry, requires and calls the Webpack configuration it finds beside `--root`, and evaluates a classic remote entry; with `--runtime` it evaluates the whole built remote. The contexts it evaluates in answer browser globals but are not a security boundary, so point the command only at a build and a working tree the operator trusts.

It checks, in this order, and stops at the first failure:

1. `package.json` pins an exact version in `devDependencies`, and the installed `node_modules/signalk-nearlcrews-ui` is that version. A pin in `dependencies`, `optionalDependencies`, or `peerDependencies` (unless `peerDependenciesMeta` marks it optional, since npm installs a required peer too) fails: the remote bundles the package, and a runtime entry makes every App Store install fetch this package, React Aria, and, because npm installs peer dependencies, React and React DOM into the server's `node_modules`. Pass `--runtime-dependency` only when the plugin's server code imports the package itself, such as `signalk-nearlcrews-ui/format`; the report still names that cost. Every field that declares the package must then pin the same exact version, because the remote bundles one and the server installs the other.
2. `keywords` include `signalk-plugin-configurator`, without which the server mounts no panel, and `--remote` is `public/remoteEntry.js`, the directory the server serves and the file name the Admin finds the script by.
3. The entry is a Webpack container that exposes `./PluginConfigurationPanel` and carries none of the library itself. The server writes every configurator's entry into the head of every Admin page whether or not its panel opens, so a library inside the entry would load for every Admin user.
4. The entry matches the script tag the server writes for the package's `type`. With `"type": "module"` it must export `get` and `init`. Otherwise the entry, evaluated alone, must leave a container with `get` and `init` on the global the Admin reads: the package name with `-`, `@`, and `/` replaced by underscores, or the name `--container` gives. `--container` works with or without `--runtime`, and is refused for a `"type": "module"` package, whose container comes from the module's exports.
5. The remote's JavaScript files, taken together, carry this version's `data-snui-version` stamp and no other version's, and none of them bundles a React runtime, a development JSX runtime, or the host harness.
6. The remote consumes exactly the published share map, and a `webpack.config.cjs` or `webpack.config.js` beside `--root` declares it; `--webpack-config` names another file.
7. Every CSS file beside the entry names only the installed release's public tokens, the documented consumer hooks, and the `snui-panel` container, with no name a CSS modules pipeline has renamed. A renamed or misspelled token fails silently in the browser, where the panel loses its theme in Dark and Night.
8. With `--stats <path>`, the Webpack stats record no build errors, and the module graph bundles nothing from React except the production JSX runtime, nothing from React DOM or `scheduler`, exactly one copy of this package, and at most one copy each of `react-aria`, `react-aria-components`, `react-stately`, and every `@internationalized` package. Emit the stats with `webpack --json`, or with `stats.toJson({ errors: true, modules: true, nestedModules: true })`.
9. With `--styles <dir>`, no CSS module class used in the panel source under that directory lands on a package component through a single class selector. Such a rule loses to the package's scoped rules as soon as the package sets the same property; the doubled class the design contract names is the supported override. The check follows default, namespace, and named imports of a CSS module. A class it cannot check, because its module is imported through a bundler alias or a package path or does not exist, is reported rather than skipped, so import CSS modules by a path relative to the component. Point `--styles` at the directory that holds the panel's components and their CSS modules.
10. With `--baseline <path>`, the gzip size of the remote's JavaScript and CSS stays within the recorded allowance. The baseline is a JSON object with `gzipBytes` (the recorded size), `maximumIncreasePercent` (the growth the check allows over it), and an optional `approvedCeilingGzipBytes` (an explicitly approved size above that allowance).

The report always gives the entry's own gzip size, beside the total when there is a baseline, because the entry loads on every Admin page and the rest only when the panel opens. Without `--asset`, every JavaScript and CSS file beside the remote entry counts as part of the remote, which inflates the size baseline and can trip the React runtime scan for a plugin that serves other bundles from the same directory; the repeatable `--asset <name>` names the remote's own files, and the remote entry is always included.

#### Rendering the panel the way the host loads it

Those checks read the built files. `--runtime` also evaluates them and renders the exposed component to static markup, which is what catches a chunk that throws as it evaluates, a panel that cannot open on a fresh install, a panel that renders nothing or saves during render, and a stale copy of this package rendering under a current pin:

```sh
npx snui-check-consumer --root . --remote public/remoteEntry.js --runtime --expose ./PluginConfigurationPanel --expect "Loading conversions"
```

A classic remote runs in a Node context that answers what a panel remote reads while it evaluates. A module remote runs in a worker thread that imports the entry by file URL, so both formats the Admin loads can be rendered. Either way the check initializes the share scope with the consumer's own React and React DOM, gets the exposed module, and renders it in turn:

1. Without the native CSS `@scope` interface, which is what `supportsNativeCssScope` looks for, asserting the compatibility notice a browser without it gets.
2. With `configuration` undefined, which the Admin passes a plugin nobody has configured, asserting the `data-snui-version` stamp of exactly the installed version and no other.
3. With `configuration` set to `{}`, which the Admin passes a package that enables itself by default, asserting only that the panel renders without calling `save`.
4. With the `--props` object, when one is given, asserting the stamp again.

The check owns the browser knowledge, so a consumer never maintains a list of the globals React Aria sets up on import.

Only `--expose` is required, naming the module the remote exposes. `--props` takes a JSON object passed to the panel as its props, `configuration` included, for a panel that needs a saved configuration to show what `--expect` looks for. The host's `save` callback always comes from the check, and a panel that calls it during any render is reported. `--expect` names text the rendered panel must contain and may be repeated; it applies to the `--props` render when there is one, and to the unconfigured render otherwise. `--expect-unsupported` does the same for the compatibility render, and replaces the default assertion on this package's own notice for a panel that passes `PanelShell` an `unsupported` element of its own. `--no-compatibility-render` skips that render for a panel that deliberately renders no notice. Every runtime option needs `--runtime`, and passing one without it fails rather than checking less than the consumer asked for.

### Host contract tracking

The repository checks the `@signalk/server-admin-ui-dependencies` declaration against the committed `tests/host-contract.baseline.json` rather than installing the contract package, for the reason recorded in `scripts/check-host-contract.mjs`. The baseline tracks the published npm inventory; it does not prove an installed Signal K version, React runtime, or share scope. Signal K 2.23 still used React 16 in its active Admin UI even though version 2.23.0 of the inventory declared a React 19 peer, which is why the floors above start at 2.24. `npm run host-contract` compares package metadata with the committed baseline. `npm run host-contract:drift` compares the baseline with the current registry declaration without changing files, and `npm run host-contract:update` refreshes and verifies the baseline when reviewed drift should be accepted.

The inventory does not describe the loader, which has changed its share and script handling in releases that left the inventory alone. `npm run host-contract:loader` hashes the Signal K server and Admin loader functions this package and its consumers build on, at the latest Signal K release, and fails when one moves, naming the facts a reviewer must recheck. `tests/host-loader.baseline.json` records the hashes and the release they were reviewed at, currently v2.33.0, and `npm run host-contract:loader:update` accepts a reviewed change. Both comparisons need the network, so they run weekly in the host contract workflow rather than in `npm run validate`.

`npm run dependency-contract` separately verifies that the locked React Aria packages remain deduplicated, mutually compatible, and compatible with their declared React peer ranges. It runs in `npm run validate` after the host contract check.

## Installation

Install an exact version as a development dependency because the consumer bundles the package into its panel remote:

```sh
npm install --save-dev --save-exact signalk-nearlcrews-ui@0.12.0
```

For unpublished local changes, build and pack this repository, then install the resulting tarball. `--pack-destination ..` keeps the tarball out of the repository tree:

```sh
npm run build
npm pack --ignore-scripts --pack-destination ..
npm install --save-dev --save-exact ../signalk-nearlcrews-ui-0.12.0.tgz
```

Do not configure this package as a runtime Module Federation share. Each plugin should embed the selected package version in its own remote while resolving React and React DOM from the Signal K Admin host through the integration supported by its bundler.

### Entry points

The package root contains the panel shell and root, layout, text, field, feedback, theme, compatibility, and formatting primitives. Composites, data grids, form composites, and overlays have focused entry points, so their ownership and bundle boundaries stay explicit:

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
  formatRelativeAge,
  resolveFreshness,
} from "signalk-nearlcrews-ui/format";
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

`Accordion`, `CheckboxGroup`, `EmptyState`, `Progress`, `SaveActionBar`, `Disclosure`, `Tabs`, and `Table` are available only from `/composites`. `Radio`, `RadioGroup`, `SecretInput`, and `Switch` are available only from `/forms`. The complete data-grid collection API is available only from `/data-grid`, and dialogs, menus, popovers, and toasts are available only from `/overlays`.

`signalk-nearlcrews-ui/format` publishes the formatting and state helpers (`formatRelativeAge`, `formatRelativeAgeSince`, `RELATIVE_AGE_EN`, `RELATIVE_AGE_NARROW`, `resolveFreshness`, `resolveReachability`, `REACHABILITY_STATUS`, `formatCount`, and `joinList`) with no React anywhere in its module graph, for a worker, a service worker, or a plain Node script; the package root exports the same helpers for panel code. A plugin whose server code imports it keeps the package in `dependencies` and passes `--runtime-dependency` to the consumer check. `signalk-nearlcrews-ui/tokens.css` is the one stylesheet entry point. Importing the stylesheet does not import or execute React, so panels in other frameworks can use the tokens described under theme preference below. Installing the package still resolves its declared dependencies and React peer dependencies; the stylesheet is not a dependency-free package split.

Three entries serve tooling rather than a panel. `signalk-nearlcrews-ui/federation` is the CommonJS Module Federation share map described under the host dependencies above, and `signalk-nearlcrews-ui/package.json` exposes the manifest so a build script can read the installed version through Node resolution. `signalk-nearlcrews-ui/host-harness` is browser test tooling: `createHostShareScope`, `loadPanelRemote`, and `HostPanelFrame` load a consumer's built remote the way the Signal K Admin loader does, from the fallback share scope and the script tag type through the configuration view around the panel, so a consumer's browser fixture does not rebuild the loader. It mirrors Signal K 2.33.0, opens the panel with `configuration` unset unless the fixture passes one, and replaces it with what the panel saves, as the Admin does. Import it from a test fixture only: `snui-check-consumer` fails a remote that bundles it. The API reference's [host harness section](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md#host-harness) lists its props and options. Every JavaScript entry also carries a `default` condition, so a CommonJS consumer such as a Node test runner can `require` it on Node 22.12 or newer.

The [API reference](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md) lists the complete entry-point inventory, the gzip size of each entry and of a typical tree-shaken panel, package-specific props, ref targets, public values, defaults, and localization hooks.

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

// The plugin owns its defaults. Signal K Admin passes no configuration for a
// plugin nobody has saved, and {} for a package enabled by default.
const DEFAULT_CONFIGURATION: Configuration = { serverUrl: "" };

interface PluginConfigurationPanelProps {
  configuration?: Partial<Configuration> | undefined;
  save: (configuration: Configuration) => void;
}

export default function PluginConfigurationPanel({
  configuration,
  save,
}: PluginConfigurationPanelProps) {
  const saved = { ...DEFAULT_CONFIGURATION, ...configuration };
  const [serverUrl, setServerUrl] = useState(saved.serverUrl);
  const [saveRequestedAt, setSaveRequestedAt] = useState<number | null>(null);
  const dirty = serverUrl !== saved.serverUrl;
  useUnsavedChangesGuard(dirty);

  return (
    <PanelShell themeToggle="end">
      <Section title="Server">
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
        unconfigured={configuration === undefined}
        saveRequestedAt={saveRequestedAt}
        onDiscard={() => setServerUrl(saved.serverUrl)}
        onSave={() => {
          setSaveRequestedAt(Date.now());
          save({ ...saved, serverUrl });
        }}
      />
    </PanelShell>
  );
}
```

The example reads its configuration the way the Admin supplies it. `configuration` is undefined until the first save, so the panel fills it from its own defaults and passes `unconfigured` while it is absent, which offers Save with nothing edited. After a save the Admin hands the saved object straight back as `configuration`, which clears `dirty` with no resync code, and `saveRequestedAt` keeps "Save sent to the server" up for a moment. The package boundary below lists the three states the host opens a panel in.

`PanelShell` is the recommended frame. It runs the browser preflight once, then renders `PanelRoot`, an outer `Stack`, the optional `title` and `description`, the panel's polite and assertive announcer regions, a `ThemeToggle` placed by `themeToggle`, and a `PanelErrorBoundary` that offers "Try again" and a page reload when the panel content throws; `onReload={null}` withholds the reload. State the placement rather than leaning on the default: `themeToggle="end"` is the convention every NearlCrews panel follows. Leaving out `title` is the convention too, because the Signal K Admin card header above the panel already names the plugin, by its npm package name, and a panel title would add a second name for the same plugin. That header is an `h5` and the Admin renders no `h1`, so `headingLevel` defaults to 2, the highest level a panel should take. A shell with no title passes that level to the `Section` and `CollapsibleSection` rendered inside it, and a titled shell offers them the level below its title; an explicit `headingLevel` on a section still decides, and the derived level stops at 6. Every other `PanelRoot` prop reaches the root; `title` and `children` belong to the shell, and `onError` goes to the error boundary rather than the root element.

`PanelRoot` installs the root stylesheet as one deduplicated style element per package version and CSP nonce in its rendered root's owner document for the lifetime of its mounted roots. Every other component installs its own style module the same way on first mount, so a panel carries CSS only for what it renders: `Dialog`, `AlertDialog`, `Popover`, `Menu`, `ToastRegion`, `DataGrid`, `Table`, `Tabs`, `RangeInput`, `Textarea`, `Switch`, `RadioGroup`, `Radio`, `Progress`, and `EmptyState`. The overlays and `DataGrid` also portal into the root, so they require a `PanelRoot` ancestor and throw without one; the in-flow controls render unstyled outside one. Separately bundled remotes share the same document registry. Native CSS scopes limit styles to the nearest exact package-version root, including nested version re-entry. Styles are removed after the last root using that version and nonce unmounts and are never written to `:root`. Consumers do not need a CSS loader. Panels use full width by default so the themed surface covers data-dense administration content. Set `width="standard"` or `width="wide"` when a bounded reading width is appropriate.

For a custom host that restricts stylesheet elements with a nonce, pass that nonce to `PanelRoot`:

```tsx
<PanelRoot styleNonce={styleNonce}>Panel content</PanelRoot>
```

The host must supply the nonce through its own trusted bootstrap. Do not read it from untrusted panel data. The nonce authorizes the package's injected `<style>` elements only; every component's module sheet carries the same nonce as the root sheet, so a host that authorizes one authorizes them all. Positioning, sizing, progress, and other runtime behavior still uses element `style` attributes, so such a host must also permit those through `style-src-attr`, currently with `'unsafe-inline'`. Signal K Admin `master` disables Content Security Policy and passes only `configuration` and `save` to a plugin configuration panel, so it does not currently provide an official nonce channel.

## Components

The [API reference](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md) holds every component's props, defaults, and ref target. This list says what each one is for, and the choice a panel makes when it reaches for it.

- `PanelShell` frames a panel, as Basic use shows; pass `themeToggle="end"` rather than relying on the default. `usePanelAnnouncer` speaks through the shell's own polite and assertive regions, which stay audible while a dialog, menu, or modal popover is open, and warns in development when no shell is there to speak through. `PanelErrorBoundary` is the boundary the shell renders, for a panel that builds its own frame, and `useUnsavedChangesGuard(dirty)` registers the browser's unload confirmation while the panel has unsaved changes.
- `PanelRoot` provides scoped styles, theme state, the label bundle, and the in-root portal container that overlays and notifications require. Compose it directly only when the shell does not fit: run the browser preflight yourself, rendering `UnsupportedBrowserNotice` when it fails, and expect `usePanelAnnouncer` to have no regions to speak through. `defaultTheme` suits a panel that expects night use.
- `ThemeToggle` offers Match Admin, Match device, Light, Dark, and Night. Offer all five unless the panel has a reason to narrow the set through `choices`.
- `Button` renders primary, secondary, ghost, and danger actions, and an anchor through `as="a"`. For an action that cannot run right now, prefer `ariaDisabled` with a `disabledReason` over `disabled`: the button keeps its focus and says why, and `disabledReasonVisibility="visible"` shows the reason on screen. A loading button keeps its name and adds `loadingLabel` as its busy description.
- `LabeledField` names, describes, and validates one control: `TextInput`, `NumberInput`, `RangeInput`, `Select`, `Textarea`, or a custom control that forwards the field props, and `InputGroup` lines a control up with its addons and actions. Pass the control as the child, or use the render-prop form for a composite field, as shown below. `Checkbox` carries its own label and validation message.
- `NumberField` is a labeled numeric field that keeps a draft while the user types. It validates by default, showing a message once the edit finishes and reporting `onValidityChange`, or clamps to its bounds when given a `fallback`. `useNumberDraft` gives a bare `NumberInput` the same draft, `useFieldValidity` collects field validity for the save bar, and `useResetDrafts` returns a reset that a Discard handler calls to clear every draft in the panel.
- `SegmentedControl`, `RadioGroup` with `Radio`, and `Switch` cover single choices and on or off settings, with native form participation. For a choice that cannot change right now, use `readOnly` rather than `disabled`, so the control keeps its tab stop.
- `SecretInput` is a text input with an explicit Show or Hide button, whose input turns off autofill of saved passwords and the spelling, capitalization, and correction services, so a revealed secret is not captured. The consumer still owns the secret value, storage, redaction, and authorization policy.
- `FieldGroup` groups related fields in a native fieldset under a legend, and `CheckboxGroup` builds a checkbox list with a select-all box on it. Name either with `label`; `legend` is an equivalent alias.
- `Section` and `CollapsibleSection` group content under a heading, and `Accordion` keeps at most one collapsible section open. A collapsible section's `mountStrategy` decides whether hidden content keeps its state, which the retaining strategies do while pausing its effects. A section nested in another package section, and an embedded collapsible section, stays out of the landmark list unless `landmark` says otherwise.
- `Disclosure` and `Tabs` provide a headless disclosure and a tab list that own their ids, keyboard handling, and focus handoff; `useDisclosure` returns the same props for custom elements.
- `Banner` and `StatusIndicator` report state in words, glyphs, and shapes rather than color alone. Decide whether a message is news: `live` announces it, and a polite region that mounts with its message waits a moment before speaking so a screen reader hears it, which `deferFirstMessage={false}` turns off.
- `FreshnessNote` says how recently a readout was checked, and changes to its own warning wording when the consumer marks it stale. The stale threshold stays with the consumer, and `resolveFreshness` and `usePollFreshness` compute it.
- `Progress` reports determinate or indeterminate progress under a required label.
- `Text`, `Code`, and `VisuallyHidden` are the hint, caption, identifier, and hidden-text primitives. `LiveRegion` announces text that is not otherwise on screen, and `settleMs` makes it wait until a changing message holds still.
- `RelativeAge` renders an elapsed age in words and owns its own tick. `formatRelativeAge` and `formatRelativeAgeSince` return the same words as a string, and `RELATIVE_AGE_EN` pins them to English for a panel whose surrounding copy is English.
- `ToastRegion` shows queued toasts inside the panel. Reach for a toast to report transient feedback; a condition that persists until someone acts on it belongs in a `Banner` or a tone-marked `Card`. `createToastQueue` builds a queue, and the shared `toast` queue covers a single region.
- `Stack`, `Cluster`, `Card`, `MetricGrid`, `Metric`, and `Badge` standardize rhythm and status shells, while the consumer decides what a status means. `as` renders a semantic element, such as `<Stack as="form">`. `Metric.unit` takes a symbol or `{ symbol, name }`, so a screen reader hears the unit's name.
- `DataGrid` is an accessible table with sorting, selection, and virtualized rows, and `Table` is the small semantic table that does not need the grid. Sorting is controlled: sort `items` in the consumer, and give each item a stable `id` or `key`.
- `EmptyState` presents an empty view with a title, a description, and an action. Its title is not a heading, so the consumer owns the outline around it.
- `ActionBar` lays out consumer-owned state and actions, and `SaveActionBar` is the Save and Discard footer built on it. Give `SaveActionBar` the panel's state (`dirty`, `saving`, `unconfigured`, `saveRequestedAt`, `invalidMessage`, and an `outcome` the plugin heard back from the server), and it decides the status, which buttons are enabled, and where focus goes; a Save or Discard handler may return the element to focus instead. `resolveSaveActionBarState` exposes the rules as data for tests.
- `InlineConfirm` replaces a blocking browser confirmation with a named inline region that manages focus and takes its heading level from the section around it.
- `Dialog` and `AlertDialog` are modal surfaces; use `AlertDialog`, whose `cancelLabel` is required, for a confirmation that demands acknowledgement. `Menu` pairs a button with a list of actions, and `Popover` anchors free-form content to a trigger; a custom trigger must render a semantic interactive element and forward its ref. All three portal into their owning `PanelRoot`, above the Signal K Admin header and sidebar.

`LabeledField` children must accept and forward `id`, `required`, `disabled`, `name`, `aria-describedby`, `aria-errormessage`, and `aria-invalid`. The exported `FieldControlProps` interface defines that contract for custom controls. Required field labels, checkbox labels, radio group labels, legends, section titles, collapsible titles, and metric labels must contain rendered, non-whitespace content.

### Refs

Refs are ordinary props and support object refs, callback refs, and React 19 callback-ref cleanup. `Button` resolves to an `HTMLButtonElement` or, with `as="a"`, an `HTMLAnchorElement`. A component exposes a ref only when it has a stable, documented owning element. The [API reference](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md) lists every ref-capable component and its native target.

`Banner.dismissFocusRef`, `ActionBar.statusRef`, and the `InlineConfirm` focus refs name focus destinations. They do not expose the component itself.

### Localization

Every package-owned user-visible string is overridable. The [localization table](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md#localization-defaults) records the defaults for loading, dismissals, tone names, secret visibility, inline confirmation, the theme selector, theme choices, code blocks, freshness notes, empty data, toasts, compatibility notices, panel errors, the save bar, number-field validation, and relative-age fallbacks. Every one of those defaults is fixed English: the package reads no locale for its own copy, while React Aria's built-in strings follow the browser locale. A panel shown in a non-English browser replaces them in one place with `labels` on `PanelRoot` or `PanelShell`, a deeply optional bundle keyed by the surfaces in that table, and a component prop still wins over the bundle where one call site needs its own words. Blank bundle text reads as absent, so a partial translation leaves the rest in English. `PANEL_LABEL_DEFAULTS` exports the English defaults, frozen, so a consumer test can assert the words the package ships rather than retyping them, and the [test hooks](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md#test-hooks) list the data attributes a test may select by. `AlertDialog.cancelLabel` has no default and must be supplied by the consumer.

### Validation announcements

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

### Loading buttons

A loading button stays in the focus order and refuses repeat activation. Keep the action label as its name; `loadingLabel` is the busy description added beside it, so pass a short state word:

```tsx
<Button loading={saving} loadingLabel="Saving" onClick={handleSave}>
  Save configuration
</Button>
```

### Composite fields

For a composite field, pass the render-prop argument through `splitLabeledFieldControlProps`, spread the `controlProps` it returns onto the primary control, and point each secondary control at `descriptionId` through `aria-describedby`. The two ids are lookups rather than attributes, so they belong on no element. Use a growing slot for the flexible control and a fixed slot to keep an exact input and its addon together:

```tsx
<LabeledField label="Cache limit" description="Whole GiB" layout="inline">
  {(fieldProps) => {
    const { controlProps, descriptionId } =
      splitLabeledFieldControlProps(fieldProps);
    return (
      <InputGroup density="compact">
        <InputGroupControl controlWidth="grow">
          <RangeInput
            {...controlProps}
            min={4}
            max={32}
            unit={{ symbol: "GiB", name: "gibibytes" }}
          />
        </InputGroupControl>
        <InputGroupControl controlWidth="fixed">
          <NumberInput
            aria-label="Cache limit exact value"
            aria-describedby={descriptionId}
            min={4}
            max={32}
          />
          <InputGroupAddon>GiB</InputGroupAddon>
        </InputGroupControl>
      </InputGroup>
    );
  }}
</LabeledField>
```

`RangeInput.unit` draws nothing: it makes the slider read its value as "12 gibibytes" rather than a bare number.

### Token overrides

All color, spacing, radius, typography, control-size, content-width, shadow, scrim, focus-ring, motion, transition, and layer tokens listed in [the design contract](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/design-contract.md) are public CSS API. `PUBLIC_TOKEN_NAMES` exposes the same names to tooling. Override tokens through `PanelRoot.style` so the values stay attached to the versioned root instead of depending on private classes or DOM nesting:

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

![Component showcase in the Light theme](https://unpkg.com/signalk-nearlcrews-ui@0.12.0/docs/screenshots/showcase-light.png)

![Component showcase in the Dark theme](https://unpkg.com/signalk-nearlcrews-ui@0.12.0/docs/screenshots/showcase-dark.png)

![Component showcase in the Night theme](https://unpkg.com/signalk-nearlcrews-ui@0.12.0/docs/screenshots/showcase-night.png)

The Night palette preserves red for dark-adapted vision at the helm. The showcase page itself lives in the fixtures directory of the repository and builds with the browser fixture bundle.

## Theme preference

The shared preference key is `signalk-nearlcrews-ui.theme.v1`, the only storage key the package reads or writes. On first resolution, `PanelRoot` uses this order:

1. Read the shared key when it contains a valid value.
2. Otherwise, use Auto, which the selector labels Match Admin, without writing an implicit preference. Auto leaves `data-snui-theme` off the root so an optional Bootstrap, CoreUI, or legacy `.dark-mode` ancestor marker can apply. Without a recognized marker, the library uses Light. Signal K Admin does not currently guarantee or set one of these markers.

Selecting a theme writes the shared key and broadcasts the choice to panels in the same document, while open panels in other tabs follow the browser storage event. If the write fails, the selection remains current in the mounted panels for the page session but is not durable. Existing valid values, including Auto and System, otherwise remain authoritative. Auto follows only an optional recognized ancestor marker and falls back to Light, including in the current unmarked Signal K Admin host. System, which the selector labels Match device, follows the operating-system color preference independently of the host theme. The Night theme uses a red-preserving palette inside the panel, so status remains distinguishable through text, glyphs, shapes, borders, and accessible tone labels rather than hue alone. It does not recolor Signal K host chrome or surrounding page gutters, so a host that needs full-surface night adaptation must coordinate those surfaces separately.

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

### What the host passes and does

The Admin opens a panel in one of three states, and never passes `null`:

- `configuration` is undefined for a plugin nobody has configured.
- `configuration` is `{}` for a package that enables itself by default through `signalk-plugin-enabled-by-default`, until its first save. That plugin is already running.
- After a save, `configuration` is the object the panel saved. The Admin hands it straight back without waiting for the server, so it is the panel's own value rather than a confirmation.

Normalize the first two through the plugin's own defaults, and derive `SaveActionBar` `unconfigured` from an absent configuration only: a plugin enabled by default is already running with `{}`, so "Save to enable the plugin" would be false there. `snui-check-consumer --runtime` renders the panel in both unsaved states.

The current host types `save` as a function returning `void` and does not await persistence before updating its local configuration state. Treat calling it as a submission request, not confirmed durable success. Confirming that a save persisted requires reading the saved value back, from the host's plugin configuration route or a plugin-owned API; failure details and retry behavior need a plugin-owned API.

Signal K Admin renders and handles several things around a configuration panel, which a panel should neither repeat nor assume away:

- Above the panel it renders one heading, the plugin card header, an `h5` holding the npm package name, then the Enabled, Data logging, and Enable debug switches, then the plugin's status message and last error while it is enabled. The page has no `h1`, so a panel heads at level 2, and a panel title adds a second name for the plugin the card header already names. A panel need not repeat the status line the card shows.
- Saving answers the request and then stops and starts the plugin, so a panel polling a plugin route sees failures for that window. A panel holds its last reachability state, or reports it as not yet contacted, through the restart that follows its own save.
- The host serves the persisted options at `GET /skServer/plugins/<id>/config`, readable by the admin session that holds the panel, which is how a panel can confirm a save without an API of its own.
- A failed save raises the Admin's own alert and is otherwise not reported to the panel.
- The Admin's viewport meta carries no `viewport-fit=cover`, so every `env(safe-area-inset-*)` is zero inside it, and the package's safe-area rules take effect only in a host that opts in.

Signal K loads an embedded remote as trusted same-origin code in the Admin document. `PanelRoot`, native CSS scope, versioned styles, and in-root portals isolate presentation; they do not sandbox JavaScript, storage, network access, or the host DOM. Review and secure a custom panel as part of the plugin that ships it.

### What stays in each plugin

- Fetching and Signal K API calls
- Configuration state and normalization
- SI storage, display-boundary conversion, and server unit preferences, which a panel reads from the server rather than from a panel-local units toggle, as described below
- Local draft, dirty, and submission state; confirmed save status and retry orchestration read the saved value back or use a plugin-owned API
- Domain validation and provider behavior
- Plugin-specific tables, cards, and workflows

The package draws and speaks a unit; it never fetches, selects, or converts one. A panel that shows a length, depth, speed, or temperature follows the Signal K server's unit preferences rather than a panel-local switch or a guess from the browser locale, and resolves them in four steps:

1. Read the user's own choice from `GET /signalk/v1/applicationData/user/unitpreferences/1.0.0` with same-origin credentials. It holds only `{ activePreset }`.
2. Resolve that name with `GET /signalk/v1/unitpreferences/presets/{name}`.
3. Without a user choice, read the server-wide preset from `GET /signalk/v1/unitpreferences/active`, which needs no authentication and carries each category's `targetUnit`, `formula`, `inverseFormula`, and `symbol`.
4. On any failure, use metric: servers without the unit preferences API answer 404.

The server's own per-user resolution has one more step, a legacy `userPresets` configuration a panel cannot read, so the ladder above is the closest a panel gets. A value read from a Signal K path takes its display unit from that path's metadata, whose `displayUnits` the server has already resolved for the user, rather than from the category preset. Keep configuration and the data model in SI and convert only at the field. For a `NamedUnit`, the symbol comes from the preset and the long name from `GET /signalk/v1/unitpreferences/definitions`, where each conversion carries a `longName` such as "knots" beside the symbol "kn". The lookup, the conversion, and the fallback all stay in the plugin.

See [the API reference](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/api-reference.md), [the design contract](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/design-contract.md), [the migration guide](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/migration.md), and [the release policy](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/release-policy.md) for the complete rules.

## Development

```sh
npm ci
npm run validate
npm run test:browser
```

Development supports Node 22.22.2 or newer in the Node 22 release line, Node 24.15.0 or newer in the Node 24 release line, or Node 26, with npm 11.16.0 or newer or npm 12; `devEngines` in `package.json` is the enforced statement of both ranges. These are source-tooling requirements and do not impose a Node runtime on consumers of the browser bundle; the published `engines.node` is the `>=22` floor Signal K server itself declares.

`npm run validate` runs Biome and Prettier formatting, Markdown lint, spelling, repository-local link checks, the localization table check, Biome and type-aware ESLint rules, Knip dead-code analysis, TypeScript checks under both installed compilers, a Signal K Admin host dependency comparison against the committed contract baseline, and a locked React Aria compatibility check. It also runs unit and type-level coverage with aggregate and per-file floors, the runtime dependency audit, compilation with the shipped style text compacted and checked against its source, packed-package validation, a comparison of the public type surface against the committed baseline, a consumer type check against the packed artifact, a compile of every `tsx` example in this README and the migration guide against the packed declarations, export-map-wide bundle-size and React externalization checks, and classic `var` and output-module ESM Module Federation fixture builds. The unit suite also renders each of those examples and fails on any console warning. The full-tree dependency audit runs as a separate, non-blocking CI job.

Two TypeScript compilers are installed on purpose. See the TypeScript toolchain section of `CONTRIBUTING.md` in the repository for why, and for the condition that collapses them back to one.

Biome owns JavaScript, TypeScript, JSON, and HTML formatting and supplies the fast recommended lint layer. Prettier is intentionally limited to Markdown and YAML, which Biome does not yet support. Type-aware ESLint remains for project-aware TypeScript, React Hooks, and JSX accessibility rules that are not equivalent to Biome's syntax-aware checks. Knip independently verifies the repository dependency and export graph.

Browser tests require Playwright Chromium, Firefox, and WebKit:

```sh
npx --no-install playwright install chromium firefox webkit
```

Set `SNUI_BROWSER_PORT` to an unused port from 1024 through 65535 when parallel local browser suites would otherwise contend for the default port.

## License

Apache-2.0

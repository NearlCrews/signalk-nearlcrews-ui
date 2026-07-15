# Signal K NearlCrews UI

[![npm version](https://img.shields.io/npm/v/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)
[![npm downloads](https://img.shields.io/npm/dm/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)
[![CI](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/react-%3E%3D19%20%3C20-149eca.svg)](https://react.dev/)

`signalk-nearlcrews-ui` provides accessible, theme-aware React primitives for NearlCrews Signal K administration panels. It standardizes common panel behavior without taking ownership of plugin data, Signal K APIs, units, validation, or save workflows.

The package is intentionally distinct from the official Signal K user interface and its internal component systems.

## Status

The package is a public npm dependency for NearlCrews Signal K projects. It is not a Signal K plugin, webapp, or marketplace package. The initial API may change during the `0.x` series, so consumers should pin an exact version.

## Compatibility

| Package | React      | JavaScript | Remote output                            | Browser verification                             | Signal K boundary                                                              |
| ------- | ---------- | ---------- | ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `0.1.x` | `>=19 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |

## Requirements

- React 19
- A browser capable of ES2022 and native CSS `@scope`
- A consumer build that bundles this package into its configuration-panel remote

React is a peer dependency. `react-dom` is not required by the library. Consumer bundles may contain React's small production JSX helper, but they must consume React itself from the host singleton and must not bundle React or React DOM implementations.

The repository builds real production Webpack remotes in classic global and ESM formats. Its browser harness initializes those containers with a minimal host-equivalent React share scope. It does not reproduce the complete Signal K Admin bootstrap, so each consumer must retain a production remote-load check against its supported Signal K host.

## Installation

Install an exact version as a development dependency because the consumer bundles the package into its panel remote:

```sh
npm install --save-dev --save-exact signalk-nearlcrews-ui@0.1.0
```

For unpublished local changes, build and pack this repository, then install the resulting tarball:

```sh
npm run build
npm pack --ignore-scripts
npm install --save-dev --save-exact ../signalk-nearlcrews-ui/signalk-nearlcrews-ui-0.1.0.tgz
```

Do not configure this package as a runtime Module Federation share. Each plugin should embed the selected package version in its own remote while continuing to share React with the Signal K Admin host.

## Basic use

```tsx
import {
  ActionBar,
  Button,
  LabeledField,
  PanelRoot,
  Section,
  StatusIndicator,
  TextInput,
  ThemeToggle,
} from "signalk-nearlcrews-ui";

export function PluginConfigurationPanel() {
  return (
    <PanelRoot legacyThemeStorageKeys={["my-plugin-theme"]}>
      <ThemeToggle />
      <Section title="Connection">
        <LabeledField label="Server URL" required>
          <TextInput />
        </LabeledField>
      </Section>
      <ActionBar
        status={<StatusIndicator>Unsaved changes</StatusIndicator>}
        actions={<Button variant="primary">Save</Button>}
      />
    </PanelRoot>
  );
}
```

`PanelRoot` installs one deduplicated style element in its rendered root's owner document for the lifetime of its mounted roots. Separately bundled remotes share the same document registry. Native CSS scopes limit styles to the nearest exact package-version root, including nested version re-entry. Styles are removed after the last root unmounts and are never written to `:root`. Consumers do not need a CSS loader.

For a strict Content Security Policy, pass the nonce that authorizes inline styles:

```tsx
<PanelRoot styleNonce={styleNonce}>Panel content</PanelRoot>
```

The host must supply the nonce through its own trusted bootstrap. Do not read it from untrusted panel data.

## Components

- `PanelRoot` provides scoped styles, theme state, and legacy preference migration.
- `ThemeToggle` selects Auto, Light, Dark, or Night.
- `Button` supplies primary, secondary, ghost, and danger presentation.
- `SegmentedControl` implements a single-choice radio group with arrow-key behavior.
- `LabeledField`, `TextInput`, `NumberInput`, `RangeInput`, and `Checkbox` provide accessible form structure.
- `Section` and `Disclosure` provide semantic content grouping. Set `headingLevel` when a section is nested below a different heading level.
- `Banner` and `StatusIndicator` provide text-backed feedback that does not rely on color alone.
- `ActionBar` lays out consumer-owned state and actions.
- `InlineConfirm` replaces blocking browser confirmations with a named, focus-managed inline region that supports Escape. Set `headingLevel` to preserve the surrounding heading hierarchy.

`LabeledField` children must accept and forward `id`, `required`, `aria-describedby`, `aria-errormessage`, and `aria-invalid`. The exported `FieldControlProps` interface defines that contract for custom controls.

## Theme preference

The shared preference key is `signalk-nearlcrews-ui.theme.v1`. `PanelRoot` uses this order:

1. Read the shared key when it contains a valid value.
2. Otherwise, read the first valid key in `legacyThemeStorageKeys`.
3. Copy the migrated preference to the shared key.
4. Otherwise, use Auto.

Auto follows explicit Bootstrap or CoreUI host themes, legacy `.dark-mode`, and then the operating-system color preference. The Night theme uses a red-preserving palette inside the panel. It does not recolor Signal K host chrome or surrounding page gutters, so a host that needs full-surface night adaptation must coordinate those surfaces separately.

## Package boundary

Keep these concerns in each plugin:

- Fetching and Signal K API calls
- Configuration state and normalization
- SI storage, display-boundary conversion, and server unit preferences
- Save status and save orchestration
- Domain validation and provider behavior
- Plugin-specific tables, cards, and workflows

See [the design contract](docs/design-contract.md), [the migration guide](docs/migration.md), and [the release policy](docs/release-policy.md) for the complete rules.

## Development

```sh
npm ci
npm run validate
npm run test:browser
```

Development supports Node 22.13 or newer within the Node 22, 24, and 26 release lines. npm 12.0.1 is preferred, and npm 11.16 or newer remains accepted during the transition. These are source-tooling requirements and do not impose a Node runtime on consumers of the browser bundle.

`npm run validate` runs Biome formatting and linting, Prettier documentation formatting, type-aware ESLint rules, Knip dead-code analysis, TypeScript checks, unit coverage, full and runtime dependency audits, compilation, packed-package validation, bundle-size and React-externalization checks, and classic and ESM Module Federation fixture builds.

Biome owns JavaScript, TypeScript, JSON, and HTML formatting and supplies the fast recommended lint layer. Prettier is intentionally limited to Markdown and YAML, which Biome does not yet support. Type-aware ESLint remains for project-aware TypeScript, React Hooks, and JSX accessibility rules that are not equivalent to Biome's syntax-aware checks. Knip independently verifies the repository dependency and export graph.

Browser tests require Playwright Chromium and WebKit:

```sh
npx --no-install playwright install chromium webkit
```

## License

Apache-2.0

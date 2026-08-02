# Signal K NearlCrews UI

[![npm version](https://img.shields.io/npm/v/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)
[![npm downloads](https://img.shields.io/npm/dm/signalk-nearlcrews-ui.svg)](https://www.npmjs.com/package/signalk-nearlcrews-ui)
[![CI](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/NearlCrews/signalk-nearlcrews-ui/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/LICENSE)
[![React](https://img.shields.io/badge/react-%3E%3D19.2%20%3C20-149eca.svg)](https://react.dev/)

`signalk-nearlcrews-ui` provides accessible, theme-aware React primitives for NearlCrews Signal K administration panels. It standardizes common panel behavior without taking ownership of plugin data, Signal K APIs, units, validation, or save workflows.

The package is intentionally distinct from the official Signal K user interface and its internal component systems.

## Status

The package is a public npm dependency for NearlCrews Signal K projects. It is not a Signal K plugin, webapp, or marketplace package. The initial API may change during the `0.x` series, so consumers should pin an exact version.

## What's new in 0.6.1

This release corrects the public token enumeration. Upgrading requires no code changes.

- **Complete token enumeration**: `PUBLIC_TOKEN_NAMES` now includes `--snui-color-scrim` and the z-index scale (`--snui-z-sticky`, `--snui-z-overlay`, `--snui-z-modal`, and `--snui-z-toast`). All five are emitted by the stylesheet and were missing from the list, so token enumeration never saw them. The design contract names them, and a stylesheet coverage test now fails when a defined token is neither public nor explicitly private.

## Compatibility

| Package | React        | JavaScript | Remote output                            | Browser verification                                      | Signal K boundary                                                              |
| ------- | ------------ | ---------- | ---------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `0.6.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.5.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.4.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.3.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.2.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |
| `0.1.x` | `>=19.2 <20` | ES2022     | Classic global and ESM Module Federation | Playwright Chromium, Firefox, WebKit, and mobile Chromium | Presentational only; each consumer verifies its own Signal K Admin integration |

## Requirements

- React 19.2 or newer within the React 19 release line
- Chromium or Edge 118 or newer, Firefox 146 or newer, or Safari 17.4 or newer
- A consumer build that bundles this package into its configuration-panel remote

The browser floors come from native CSS `@scope`, which became available in Chromium and Edge 118, Firefox 146, and Safari 17.4. `PanelRoot` throws a clear compatibility error when `CSSScopeRule` is unavailable instead of silently rendering unstyled controls. Signal K installations that embed an older browser engine must update that engine before adopting this package. Right-to-left caret mirroring, select indicator placement, and the range fill direction additionally use `:dir()`, which Chromium added in 120; Chromium and Edge 118 and 119 skip those cosmetic rules while everything else renders correctly.

The package renders in the browser only. Theme resolution reads `window` interfaces such as `localStorage` while mounting, so the components are not intended for server-side rendering.

Consumers that need to choose a fallback before rendering may call `supportsNativeCssScope(window)`. A failed `PanelRoot` installation throws the exported `UnsupportedBrowserError`, whose `feature` property is `CSS @scope`. The package does not ship an unscoped fallback because that would weaken style isolation between independently bundled panels.

React is a peer dependency. `react-dom` is not required by the library. Consumer bundles may contain React's small production JSX helper, but they must consume React itself from the host singleton and must not bundle React or React DOM implementations.

The repository builds real production Webpack remotes in classic global and ESM formats. Its browser harness initializes those containers with a minimal host-equivalent React share scope. It does not reproduce the complete Signal K Admin bootstrap, so each consumer must retain a production remote-load check against its supported Signal K host.

## Installation

Install an exact version as a development dependency because the consumer bundles the package into its panel remote:

```sh
npm install --save-dev --save-exact signalk-nearlcrews-ui@0.6.1
```

For unpublished local changes, build and pack this repository, then install the resulting tarball:

```sh
npm run build
npm pack --ignore-scripts
npm install --save-dev --save-exact ../signalk-nearlcrews-ui/signalk-nearlcrews-ui-0.6.1.tgz
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
  Stack,
  StatusIndicator,
  TextInput,
  ThemeToggle,
} from "signalk-nearlcrews-ui";

export function PluginConfigurationPanel() {
  return (
    <PanelRoot>
      <Stack gap={4}>
        <ThemeToggle />
        <Section title="Connection">
          <LabeledField label="Server URL" required>
            <TextInput type="url" />
          </LabeledField>
        </Section>
        <ActionBar
          status={<StatusIndicator>Unsaved changes</StatusIndicator>}
          actions={<Button variant="primary">Save</Button>}
        />
      </Stack>
    </PanelRoot>
  );
}
```

`PanelRoot` installs one deduplicated style element per package version and CSP nonce in its rendered root's owner document for the lifetime of its mounted roots. Separately bundled remotes share the same document registry. Native CSS scopes limit styles to the nearest exact package-version root, including nested version re-entry. Styles are removed after the last root using that version and nonce unmounts and are never written to `:root`. Consumers do not need a CSS loader. Panels use full width by default so the themed surface covers data-dense administration content. Set `width="standard"` or `width="wide"` when a bounded reading width is appropriate.

For a strict Content Security Policy, pass the nonce that authorizes inline styles:

```tsx
<PanelRoot styleNonce={styleNonce}>Panel content</PanelRoot>
```

The host must supply the nonce through its own trusted bootstrap. Do not read it from untrusted panel data.

## Components

- `PanelRoot` provides scoped styles and theme state.
- `ThemeToggle` selects Auto, Light, Dark, or Night and accepts per-instance labels for localization. `choices` limits the offered themes, and `onChange` reports each selection.
- `Button` supplies primary, secondary, ghost, and danger presentation, plus compact and pill options. `as="a"` renders an anchor form with a required `href`, `fullWidth` stretches the control to its container, and `iconOnly` squares it for icon content with a required accessible name. `ariaDisabled` keeps a control focusable while suppressing activation at a list boundary. A loading button uses the same focus-preserving behavior and accepts `loadingLabel` for its accessible state name.
- `SegmentedControl` implements a single-choice radio group with roving focus, Home, End, and direction-aware arrow keys. It runs controlled through `value` or uncontrolled through `defaultValue`, lays out horizontally or vertically through `orientation`, shows its legend through `legendVisibility`, and carries the selection into native form submission and reset through `name`.
- `RadioGroup` and `Radio` provide a native radio group with label, description, validation messages with opt-in live announcement, and horizontal or vertical orientation. `name` applies to every radio input so native form submission and reset work.
- `Switch` toggles a single setting and mirrors the `Checkbox` naming: `checked` and `defaultChecked` map to the selected state.
- `LabeledField`, `InputGroup`, `InputGroupControl`, `InputGroupAddon`, `TextInput`, `NumberInput`, `RangeInput`, `Select`, `Textarea`, and `Checkbox` provide accessible form structure. Render-prop fields identify the primary labeled control while allowing paired inputs, unit suffixes, and adjacent actions, and the render-prop control props carry `descriptionId` and `errorId` so paired controls can reference field text directly. Fields forward `name` and `disabled` to their control, and `optionalLabel` marks optional fields beside the required marker. Fields and checkboxes accept validation messages and opt-in live announcement modes. `TextInput` covers text, email, password, search, tel, url, date, time, datetime-local, month, and week entry. `Checkbox` drives the native mixed state through `indeterminate`, and `RangeInput` shows a filled progress track in every supported engine.
- `FieldGroup` provides a native fieldset and legend with description, action, validation error, and disabled support.
- `Section` and `CollapsibleSection` provide semantic content grouping. `CollapsibleSection` wraps the native details element: controlled or uncontrolled state, heading navigation, below-content or header-trailing summaries that stay visible while open through `summaryVisibility`, sibling actions, retained, lazily retained, or unmounted content through `mountStrategy`, and focus restoration.
- `Accordion` coordinates `CollapsibleSection` children so at most one section stays open at a time.
- `Banner` and `StatusIndicator` provide text-backed feedback that does not rely on color alone. Banners span the neutral tone plus the semantic tones, and accept actions, dismissal, a post-dismissal focus destination, localized severity text, and consumer-selected roles such as `note`. `StatusIndicator` varies its dot shape per tone and accepts `live` for opt-in announcements, and both accept `toneLabel` to localize the announced severity.
- `Progress` reports determinate or indeterminate progress with a required label, an optional tone, and `valueText` for assistive technology.
- `ToastRegion` renders queued toasts into the panel's portal container. `createToastQueue` builds a queue, the shared `toast` queue covers the common single-region setup, and each toast carries a tone, an auto-dismiss delay, and an announcement mode. A queue holds at most five toasts and drops the oldest beyond that, so sticky toasts cannot grow the DOM without bound.
- `Stack`, `Cluster`, `Card`, `MetricGrid`, `Metric`, and `Badge` standardize rhythm and presentational status shells while leaving status interpretation local. `Stack`, `Cluster`, `Card`, and `MetricGrid` accept `as` to render a semantic element, and `Card` adds compact density and header and footer slots. Each metric is a named semantic group. `Metric` and `Badge` render a tone glyph for non-neutral tones and accept `toneLabel`. `Metric` also accepts a `unit` suffix beside the value and `live` for opt-in announcements.
- `DataGrid` renders an accessible grid with sortable headers, single or multiple selection, compact density, zebra striping, an `EmptyState`-backed empty view, and windowed rows above a virtualization threshold. Sorting is controlled: pair `onSortChange` with `sortDescriptor` and sort `items` in the consumer. `Column`, `Row`, and `Cell` are re-exported from react-aria-components for its collection API.
- `EmptyState` presents an empty view with a decorative icon, a title, a description, and an action. The title is a styled div, not a heading, so consumers own the surrounding outline.
- `ActionBar` lays out consumer-owned state and actions, and `sticky` pins it to the top or bottom of its scroll container. Pass `statusRef` to move focus to the status after save or discard disables the initiating control.
- `InlineConfirm` replaces blocking browser confirmations with a named, focus-managed inline region that supports Escape and announces its message on open. It runs controlled through `open` or uncontrolled through `defaultOpen`. Set `headingLevel` to preserve the surrounding heading hierarchy, `landmark={false}` to drop the region landmark, and `initialFocusRef` and `returnFocusRef` to steer focus on open and close.
- `Dialog` renders a modal surface with a scrim, focus management, Escape and scrim dismissal, a title and description, and an actions footer. It supports controlled or uncontrolled open state and a standard or wide width.
- `AlertDialog` shares the `Dialog` API and renders with the `alertdialog` role for confirmations that demand acknowledgement.
- `Menu` pairs a `Button` trigger with a popover list of `MenuItem` actions, grouped by `MenuSection` and divided by `MenuSeparator`, with destructive styling for irreversible actions.
- `Popover` anchors free-form overlay content to a trigger with logical placement, collision flipping, and an optional fixed width.

`LabeledField` children must accept and forward `id`, `required`, `aria-describedby`, `aria-errormessage`, and `aria-invalid`. The exported `FieldControlProps` interface defines that contract for custom controls. Required field labels, checkbox labels, radio group labels, legends, section titles, collapsible titles, and metric labels must contain rendered, non-whitespace content.

### Refs

Refs are ordinary props. Each component below forwards to the native element named, and supports object refs, callback refs, and React 19 callback-ref cleanup.

| Component          | Ref element           | Prop  |
| ------------------ | --------------------- | ----- |
| `Button`           | `HTMLButtonElement`   | `ref` |
| `Banner`           | `HTMLDivElement`      | `ref` |
| `FieldGroup`       | `HTMLFieldSetElement` | `ref` |
| `TextInput`        | `HTMLInputElement`    | `ref` |
| `NumberInput`      | `HTMLInputElement`    | `ref` |
| `RangeInput`       | `HTMLInputElement`    | `ref` |
| `Select`           | `HTMLSelectElement`   | `ref` |
| `Textarea`         | `HTMLTextAreaElement` | `ref` |
| `Checkbox`         | `HTMLInputElement`    | `ref` |
| `PanelRoot`        | `HTMLDivElement`      | `ref` |
| `SegmentedControl` | `HTMLDivElement`      | `ref` |
| `InlineConfirm`    | `HTMLElement`         | `ref` |

Every component takes a plain `ref`. `Banner` additionally accepts `dismissFocusRef`, which names where focus should land after dismissal rather than exposing the banner itself.

Every user-visible default string is overridable for localization: `Button.loadingLabel`, `Banner.dismissLabel`, `Banner.toneLabel`, `InlineConfirm.cancelLabel`, `InlineConfirm.confirmLabel`, `InlineConfirm.fallbackTitle`, `ThemeToggle.legend`, and `toneLabel` on `Badge`, `Metric`, and `StatusIndicator`.

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

![Component showcase in the Light theme](https://unpkg.com/signalk-nearlcrews-ui@0.6.1/docs/screenshots/showcase-light.png)

![Component showcase in the Dark theme](https://unpkg.com/signalk-nearlcrews-ui@0.6.1/docs/screenshots/showcase-dark.png)

![Component showcase in the Night theme](https://unpkg.com/signalk-nearlcrews-ui@0.6.1/docs/screenshots/showcase-night.png)

The Night palette preserves red for dark-adapted vision at the helm. The showcase page itself lives in the fixtures directory of the repository and builds with the browser fixture bundle.

## Theme preference

The shared preference key is `signalk-nearlcrews-ui.theme.v1`, the only storage key the package reads or writes. On first resolution, `PanelRoot` uses this order:

1. Read the shared key when it contains a valid value.
2. Otherwise, use Auto without writing an implicit preference. Auto leaves `data-snui-theme` off the root, which is what allows the host-following and `prefers-color-scheme` rules to apply, so a fresh panel inside a dark Signal K Admin renders dark.

Selecting a theme writes the shared key and broadcasts the choice to panels in the same document, while open panels in other tabs follow the browser storage event. If the write fails, the selection remains current in the mounted panels for the page session but is not durable. Existing valid values, including Auto, otherwise remain authoritative. Auto follows explicit Bootstrap or CoreUI host themes, legacy `.dark-mode`, and then the operating-system color preference. The Night theme uses a red-preserving palette inside the panel. It does not recolor Signal K host chrome or surrounding page gutters, so a host that needs full-surface night adaptation must coordinate those surfaces separately.

## Package boundary

Keep these concerns in each plugin:

- Fetching and Signal K API calls
- Configuration state and normalization
- SI storage, display-boundary conversion, and server unit preferences
- Save status and save orchestration
- Domain validation and provider behavior
- Plugin-specific tables, cards, and workflows

See [the design contract](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/design-contract.md), [the migration guide](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/migration.md), and [the release policy](https://github.com/NearlCrews/signalk-nearlcrews-ui/blob/main/docs/release-policy.md) for the complete rules.

## Development

```sh
npm ci
npm run validate
npm run test:browser
```

Development supports Node 22.22.2 or newer in the Node 22 release line, Node 24.15.0 or newer in the Node 24 release line, or Node 26. npm 12.0.1 is preferred, and npm 11.16 or newer remains accepted during the transition. These are source-tooling requirements and do not impose a Node runtime on consumers of the browser bundle.

`npm run validate` runs Biome formatting and linting, Prettier documentation formatting, type-aware ESLint rules, Knip dead-code analysis, TypeScript checks under both installed compilers, unit coverage including type-level tests, full and runtime dependency audits, compilation, packed-package validation, an emitted-declaration comparison against the committed baseline, a consumer type check against the packed artifact, bundle-size and React-externalization checks, and classic and ESM Module Federation fixture builds.

Two TypeScript compilers are installed on purpose. See the TypeScript toolchain section of `CONTRIBUTING.md` in the repository for why, and for the condition that collapses them back to one.

Biome owns JavaScript, TypeScript, JSON, and HTML formatting and supplies the fast recommended lint layer. Prettier is intentionally limited to Markdown and YAML, which Biome does not yet support. Type-aware ESLint remains for project-aware TypeScript, React Hooks, and JSX accessibility rules that are not equivalent to Biome's syntax-aware checks. Knip independently verifies the repository dependency and export graph.

Browser tests require Playwright Chromium, Firefox, and WebKit:

```sh
npx --no-install playwright install chromium firefox webkit
```

## License

Apache-2.0

# Adopting signalk-nearlcrews-ui

`signalk-nearlcrews-ui` provides accessible, theme-aware React primitives for NearlCrews Signal K administration panels. It standardizes panel behavior without taking ownership of plugin data, Signal K APIs, units, validation, or save workflows.

Adopt one plugin at a time. Wrap the panel in `PanelRoot`, replace local theme tokens and the theme selector, then replace buttons, fields, disclosures, and confirmation surfaces in small steps. Do not combine adoption with a domain refactor or a visual redesign.

## Current conventions

- Theme preference persists under one shared storage key, `signalk-nearlcrews-ui.theme.v1`. An explicit Auto, System, Light, Dark, or Night selection is written to that key. An unresolved preference stays Auto and writes nothing. Auto leaves `data-snui-theme` off the root, follows an optional Bootstrap, CoreUI, or legacy `.dark-mode` ancestor marker, and otherwise uses Light. Signal K Admin does not currently set or guarantee one of those markers. System follows `prefers-color-scheme`. Panels on different library versions share the key, so a value this version does not recognize is ignored rather than treated as a clear; only an absent key returns a mounted panel to Auto.
- React and React DOM are host-provided peer dependencies. A Webpack consumer resolves both through the Module Federation host share scope as singletons. A Vite or other ESM consumer aliases the React entry points to the Signal K Admin `window.__SK_*` globals as documented upstream. Every consumer bundles this package and its React Aria dependencies, never configures `signalk-nearlcrews-ui` as a runtime share, and never embeds a second React implementation.
- `@signalk/server-admin-ui-dependencies` is the Signal K Admin compatibility inventory for embedded webapps and configuration panels. Install it as a development dependency in each consumer plugin and import it from the build configuration, so the plugin fails loudly when its React version drifts from the inventory. Treat the inventory as the host's floor rather than as this package's requirement: its React peer range is `^19.0.0`, which is wider than the `^19.2.0` this package requires, so it accepts a React 19.0 or 19.1 resolution that `signalk-nearlcrews-ui` does not support. Keep the consumer's own React and React DOM development dependencies at `^19.2.0`, and write `^19.2.0` into the Module Federation `shared` block directly instead of deriving it from the inventory. Do not treat every listed peer as a federation share: the current Admin loader guarantees only React and React DOM in its Webpack-compatible share scope and only React entry points through its ESM globals.
- Public components with a stable, documented owning element accept an ordinary React 19 `ref` prop. `SegmentedControl` and `InlineConfirm` are included, and neither takes `rootRef` any more. Object refs and callback refs resolve to the native target listed in the API reference, and callback refs support React 19 cleanup. The API reference is authoritative about which components expose a ref.
- The package renders in the browser only and requires native CSS `@scope` support. `PanelShell` runs that preflight once and renders `UnsupportedBrowserNotice`, or a consumer `unsupported` element, when it fails. A consumer that composes `PanelRoot` directly calls `supportsNativeCssScope(window)` before mounting and renders `UnsupportedBrowserNotice` instead of `PanelRoot` after a failed preflight. Verify support in every supported kiosk and embedded WebView deployment.
- `PanelRoot` installs the root stylesheet, and every other component installs its own style module from the owning root. `Dialog`, `AlertDialog`, `Popover`, `Menu`, `ToastRegion`, and `DataGrid` require a `PanelRoot` ancestor and throw without one, because they also portal into it. The in-flow controls that own a module (`RangeInput`, `Textarea`, `Switch`, `RadioGroup`, `Radio`, `Progress`, `Tabs`, `Table`, and `EmptyState`) do not: outside `PanelRoot` they render unstyled, as they always have. Consumer CSS that targets a package class at equal specificity loses to the scoped package rule even when it loads later. Prefer the documented props; where an override is unavoidable, raise specificity (for example `.my-panel.my-panel .snui-card`) and expect internal class names to change between releases. The design contract carries the example.
- Every component with a density prop uses the shared `Density` vocabulary, `"default"` or `"compact"`; `Card` adds `"flush"`. The `"comfortable"` spelling is gone: pass `"default"`.
- `label` is the accessible-name prop on every composed control (`LabeledField`, `Checkbox`, `Switch`, `Radio`, `RadioGroup`, `SegmentedControl`, and `ThemeToggle`). `FieldGroup` and `CheckboxGroup`, which render a real `<legend>`, take `label` and `legend` alike, and both are permanent: `label` decides when a group receives both. `SegmentedControl` and `ThemeToggle` take `label` and `labelVisibility` only.
- Native wrappers (`Checkbox`, `TextInput`, `NumberInput`, `RangeInput`, `Select`, and `Textarea`) take the React `onChange` event handler. Composed controls report values through callbacks named for their payload: `onCheckedChange` on `Switch`, and `onValueChange` on `RadioGroup`, `SegmentedControl`, `ThemeToggle`, `CheckboxGroup`, `NumberField`, and `Tabs`. The `onChange` aliases on `Switch`, `RadioGroup`, `SegmentedControl`, and `ThemeToggle` are gone; move each to the callback named for its payload.
- Prefer the standard Signal K schema-generated configuration form for simple fields whose schema behavior has been verified in every target Admin version. Give properties useful titles, descriptions, and defaults where appropriate, and use only `uiSchema` fields and widgets supported by the target host's React JSON Schema Form stack. The current host form does not preserve every root JSON Schema validation keyword. Adopt a custom panel when the interaction or validation requires behavior the target form does not provide. Expose its default component as `./PluginConfigurationPanel`, declare `signalk-plugin-configurator`, accept the host's `configuration` and `save` props, and keep configuration, Signal K access, units, validation, and save orchestration in the plugin. The host passes `configuration` undefined, `{}`, or the saved object, never `null`, and its `save` callback returns `void` and does not confirm persistence: confirming a save means reading the saved value back, from the host's plugin configuration route or a plugin-owned API, and failure reporting and retry stay with the plugin. The save recipe below puts the whole contract in one place.
- Require the Signal K floor of the remote format the panel ships: 2.24 for a classic Webpack `var` remote, with 2.29 recommended because it fixes an intermittent load failure; 2.25 for a Webpack module remote in a `"type": "module"` package; and 2.27 for a Vite or other module remote on the host-global React shims. The [design contract](design-contract.md#signal-k-floor-by-remote-format) records why each floor sits where it does. The dependency inventory's package version does not establish any of them.
- Units follow the Signal K server's unit preferences, resolved by the plugin in the four steps the API reference's "Units" section lists, never a panel-local switch or a guess from the browser locale. Configuration stays in SI; a `NamedUnit` lets a field draw the symbol and read its name.
- A browser test finds a package control by role and accessible name, then by the documented `data-snui-*` test hooks, and reads the package's own words from `PANEL_LABEL_DEFAULTS` rather than retyping them. Class names are private and change between releases.
- A panel states where the theme selector goes: `themeToggle="end"` on `PanelShell`, the foot of the panel, or `themeToggle="none"` with its own deliberately placed `ThemeToggle`. The [design contract](design-contract.md#where-the-theme-selector-goes) records why, and an operator moving between plugin panels is the reason.
- Pin an exact version (`npm install --save-dev --save-exact signalk-nearlcrews-ui@<version>`). During `0.x`, minor releases carry breaking changes, and the [release policy](release-policy.md#versioning) records that rule and what each release type may contain. The shipped `snui-check-consumer` command asserts the pin against the installed package and the built remote; the README documents it. A published prerelease pin such as `0.12.0-rc.1`, which the release policy publishes under the `next` dist-tag, is accepted as a pin, so a consumer testing a candidate needs no carve-out.

## Further reading

- The [README](../README.md) documents installation, the component inventory, theming, and the package boundary.
- The [API reference](api-reference.md) lists entry points, package-specific props, ref targets, defaults, and localization hooks.
- The [design contract](design-contract.md) records the stable theme, token, accessibility, and isolation behavior consumers may rely on.
- The [release policy](release-policy.md) records versioning, breaking-change, and publication requirements.

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

### Host configuration and saving

The Admin opens a panel in one of three states, and never passes `null`:

- `configuration` is undefined for a plugin nobody has configured.
- `configuration` is `{}` for a package that enables itself by default through `signalk-plugin-enabled-by-default`, until its first save. That plugin is already running.
- After a save, `configuration` is the object the panel saved. The Admin hands it straight back without waiting for the server, so it is the panel's own value rather than a confirmation.

These hold on every supported server. `save` returns nothing, and a failed request shows only the Admin's own alert. Build the panel on those three states:

1. Normalize the prop through the plugin's own defaults, `{ ...DEFAULTS, ...configuration }`, which covers `undefined` and `{}` alike. Never read a field of the raw prop.
2. Derive `SaveActionBar unconfigured` from an absent configuration only, `configuration === undefined`. A package enabled by default is already running with `{}`, where "Save to enable the plugin" would be false.
3. Keep one edit buffer, seeded from the normalized configuration, and compare it with the configuration the host holds now rather than with a copy of it in state. After a save the host hands the saved object straight back, so the buffer matches it and the panel is clean again with no resync code, while an edit in progress stays in the buffer whatever the host passes.
4. On Save, record the moment in `saveRequestedAt` and call `save` with the buffer: the bar reports "Save sent to the server" for `savedMessageDurationMs` and returns to the state underneath. To confirm that the save persisted, read the value back, from `GET /skServer/plugins/<id>/config` or a plugin-owned API, and report what came back through `outcome`, a danger tone for a request that failed. The read, its timing, and any retry stay in the plugin. Saving restarts the plugin, so a status poll that fails during that window is the restart, not an outage.
5. On Discard, restore the buffer from the configuration the host holds and call `useResetDrafts()`, which drops the number drafts a restored value cannot reach: an invalid draft never committed, so restoring the value it was typed against changes nothing it is keyed on. `useResetDrafts` reads the draft scope `PanelShell` publishes, so call it from a component rendered inside the shell.

```tsx
import { useState } from "react";
import {
  NumberField,
  PanelShell,
  Section,
  useFieldValidity,
  useResetDrafts,
  useUnsavedChangesGuard,
} from "signalk-nearlcrews-ui";
import { SaveActionBar } from "signalk-nearlcrews-ui/composites";

interface Configuration {
  readonly intervalSeconds: number;
}

const DEFAULTS: Configuration = { intervalSeconds: 30 };

interface PanelProps {
  readonly configuration?: Partial<Configuration> | undefined;
  readonly save: (configuration: Configuration) => void;
}

export default function PluginConfigurationPanel(props: PanelProps) {
  return (
    <PanelShell themeToggle="end">
      <PollingSettings {...props} />
    </PanelShell>
  );
}

function PollingSettings({ configuration, save }: PanelProps) {
  // What the host holds now: its first configuration, or the object this
  // panel saved, handed straight back.
  const saved: Configuration = { ...DEFAULTS, ...configuration };
  const [draft, setDraft] = useState(saved);
  const [saveRequestedAt, setSaveRequestedAt] = useState<number | null>(null);
  const validity = useFieldValidity();
  const resetDrafts = useResetDrafts();
  const dirty = draft.intervalSeconds !== saved.intervalSeconds;
  useUnsavedChangesGuard(dirty);

  return (
    <>
      <Section title="Polling">
        <NumberField
          {...validity.register("interval")}
          label="Interval"
          unit={{ symbol: "s", name: "seconds" }}
          integer
          min={5}
          max={3600}
          value={draft.intervalSeconds}
          onValueChange={(intervalSeconds) =>
            setDraft({ ...draft, intervalSeconds })
          }
        />
      </Section>
      <SaveActionBar
        dirty={dirty}
        unconfigured={configuration === undefined}
        saveRequestedAt={saveRequestedAt}
        invalidMessage={validity.valid ? null : "Fix the interval to save."}
        onSave={() => {
          setSaveRequestedAt(Date.now());
          save(draft);
        }}
        onDiscard={() => {
          setDraft(saved);
          resetDrafts();
        }}
      />
    </>
  );
}
```

`snui-check-consumer --runtime` renders the built panel with `configuration` undefined and then `{}` before any `--props` render, and `signalk-nearlcrews-ui/host-harness` does the same in a browser test, so a panel that reads a field of an absent configuration fails in the check rather than on a fresh install.

### Sending focus to a control in a closed section

A control inside a closed `CollapsibleSection` is hidden, and under the default retaining strategy its ref is detached, so it cannot take focus until the section's reveal has committed. Open the section inside `flushSync`, which commits the reveal before the next line runs, and then focus the control, or return it from the `SaveActionBar` handler, which focuses a returned target once the handler has run. Do not count animation frames to wait for the reveal, and do not find the section's toggle by querying the package's markup: `CollapsibleSection.triggerRef` names the toggle when that is the destination. A panel that validates on submit returns the refused field from `onSave` rather than moving focus itself, so the bar never has to be beaten with a deferred frame.

```tsx
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  CollapsibleSection,
  LabeledField,
  TextInput,
} from "signalk-nearlcrews-ui";
import { SaveActionBar } from "signalk-nearlcrews-ui/composites";

export function ProviderSettings() {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | undefined>(undefined);
  const apiKeyRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <CollapsibleSection
        title="Weather provider"
        open={open}
        onOpenChange={setOpen}
      >
        <LabeledField label="API key">
          <TextInput
            ref={apiKeyRef}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </LabeledField>
      </CollapsibleSection>
      <SaveActionBar
        dirty={apiKey !== (savedKey ?? "")}
        unconfigured={savedKey === undefined}
        onSave={() => {
          if (apiKey.trim() === "") {
            // Commit the reveal first, so the field returned below is
            // connected and visible when the bar focuses it.
            flushSync(() => setOpen(true));
            return apiKeyRef;
          }
          setSavedKey(apiKey);
        }}
        onDiscard={() => setApiKey(savedKey ?? "")}
      />
    </>
  );
}
```

A panel with several validated fields registers each with `useFieldValidity` and returns `validity.firstInvalid()`, the control of the first invalid field on screen in document order. A field hidden in a closed section is released while hidden and does not block Save, so a check that must reach into closed sections is the panel's own, as above.

## Re-pin checklist

Each release adds primitives that replace code panels wrote for themselves, and the optional adoption lists below record them release by release. Apply them at a re-pin by searching the panel's source, styles, tests, and scripts for each pattern on the left. Every row is optional: the old code keeps working unless a release's required list says otherwise.

### Panel shell and saving

| Search for                                                                                                     | Replace with                                                                                |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `onReload` given a function that calls `window.location.reload`                                                | Nothing: `PanelShell` reloads the page from its error fallback by default                   |
| A `setTimeout` that writes `saveRequestedAt` back to null                                                      | `saveRequestedAt` alone; `savedMessageDurationMs` closes the window                         |
| `savedMessageDurationMs={0}` with runtime text in `labels.saved`, or a failure `Banner` beside `SaveActionBar` | `SaveActionBar.outcome`                                                                     |
| `requestAnimationFrame` before focusing a refused field, or `focusOnAction="none"` beside a hand-moved focus   | Return the field, or `validity.firstInvalid()`, from `onSave`                               |
| `querySelector("h3 button")`, or nested `requestAnimationFrame` calls, to reach a control in a closed section  | Open the section inside `flushSync`, then focus the control or `triggerRef.current`         |
| A reset context, or a `resetKey` threaded into every `NumberField` for Discard                                 | `useResetDrafts()` called from `onDiscard`                                                  |
| `unconfigured={configuration == null}`, or a read of a field of the raw `configuration` prop                   | `configuration === undefined`, and a configuration normalized through the plugin's defaults |
| A comment or buffer that assumes the host never passes the configuration back after a save                     | The buffer comparison of the save recipe above                                              |
| `padding-block-end` with `--snui-sticky-clearance` on the shell, for the theme selector                        | Nothing: a docked bar releases above the selector at maximum scroll                         |

### Announcements and status

| Search for                                                                | Replace with                                                                                                                  |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `&& <Banner live`, `&& <StatusIndicator live`, or `&& <Metric live`       | The component rendered always, with its content going empty; `deferFirstMessage={false}` where the state at mount is not news |
| A `LiveRegion` beside a conditional `StatusIndicator` or `Banner`         | An announcing `StatusIndicator` or `Banner` alone                                                                             |
| A debounce around an announced count or status                            | `settleMs`                                                                                                                    |
| `Checked` beside `<RelativeAge`, or a hand-built stale readout            | `FreshnessNote` with the `stale` flag from `usePollFreshness`                                                                 |
| `tone="warning"` on a reachability probe still in progress                | `resolveReachability` and `REACHABILITY_STATUS`, which keep it neutral                                                        |
| A visible confirmation paired with a `LiveRegion` for a transient success | A success toast                                                                                                               |

### Fields and controls

| Search for                                                                                              | Replace with                                               |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `aria-describedby` from an `ariaDisabled` button to a hint paragraph, or a hint hook of the panel's own | `disabledReason` with `disabledReasonVisibility="visible"` |
| `ariaDisabled` with no `disabledReason` and no `aria-describedby`                                       | A `disabledReason`, which development now asks for         |
| `aria-valuetext` built as a value plus a unit                                                           | `RangeInput unit`                                          |
| A unit symbol a screen reader spells out, such as `unit="kn"`                                           | `unit={{ symbol: "kn", name: "knots" }}`                   |
| `Object.fromEntries` turning a selection array into a record of booleans, or the reverse                | `applyCheckboxGroupValue` and `toCheckboxGroupValue`       |
| A local serial-comma join, a plural suffix helper, or `toLocaleString()` around a count                 | `joinList`, and `formatCount` with `{ locale }`            |
| `descriptionId` or `errorId` stripped from a render-prop argument by hand                               | `splitLabeledFieldControlProps`                            |

### Layout and styles

| Search for                                                                                         | Replace with                                                             |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `role="group"` beside `aria-labelledby` or `aria-label` on a `<Card`                               | The native attribute alone; the card adds the role                       |
| `landmark={false}` on an embedded `CollapsibleSection` or a nested section                         | Nothing: that is the default                                             |
| `headingLevel` computed by hand on `<InlineConfirm`                                                | Nothing: the level follows the enclosing section                         |
| A flex wrapper holding an icon beside a `Section` title                                            | `Section leading`                                                        |
| `border-block-start: 1px solid var(--snui-color-border)` with a first or last child reset          | `Stack divided`                                                          |
| `--snui-color-border` on a decorative divider or a container outline                               | `--snui-color-border-subtle`                                             |
| `--snui-color-surface-raised` or `--snui-color-background` as a quiet tile fill                    | `--snui-color-neutral-subtle`                                            |
| A panel's own focus outline width, or a `prefers-contrast: more` rule of its own that thickens one | `--snui-focus-ring-width`                                                |
| `gap: 0` on a `Card density="flush"`                                                               | Nothing: flush clears the gap                                            |
| `position: sticky` on a panel toolbar with its own clearance                                       | `ActionBar sticky="top" variant="toolbar"` and `--snui-sticky-clearance` |
| `padding-inline-start` on a panel's plain `ul` or `ol`                                             | Nothing: the panel indents lists on the package scale                    |
| `snui-panel` written as a literal, or described as private                                         | `PANEL_CONTAINER_NAME` and `CONTAINER_BREAKPOINT_NARROW`                 |

### Tests and checks

| Search for                                                                             | Replace with                                                                                                 |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Package copy in an assertion, such as `"Nothing to save"` or `"Match Admin"`           | The string from `PANEL_LABEL_DEFAULTS`                                                                       |
| A private class in a selector, such as `snui-action-bar--sticky-viewport-bottom`       | `data-snui-sticky` and `data-snui-docked`                                                                    |
| `data-snui-docked` read from the action bar's parent element                           | The bar's own `data-snui-docked`; the parent no longer carries it                                            |
| A panel's own action bar marker, or a `[tabindex="-1"]` probe for the save status      | `data-snui-action-bar` and `data-snui-action-bar-status`                                                     |
| A theme radio found by its label                                                       | `data-snui-theme-choice`                                                                                     |
| `remoteEntry.includes("export")`, or a check that the package is not in `dependencies` | Nothing: the default `snui-check-consumer` run checks the host loading contract and the dependency placement |
| A walk over Webpack's stats for React modules or a second React Aria copy              | `snui-check-consumer --stats`                                                                                |
| A list of `--snui-*` names checked against a built stylesheet                          | Nothing: the default run checks every CSS asset                                                              |
| A test that requires doubled classes in CSS modules                                    | `snui-check-consumer --styles <dir>`                                                                         |
| A `node:vm` script that renders the built remote                                       | `snui-check-consumer --runtime`, which renders module remotes too                                            |
| A share scope and container loader written into the browser test fixture               | `signalk-nearlcrews-ui/host-harness`                                                                         |

## Changes in 0.13.0

This release renames or removes six props, moves focus and announcements to the timing the package's own rules call for, changes several defaults and strings, repaints sections, tone glyphs, borders, and Night, and makes `snui-check-consumer` check the Signal K host loading contract. Work through the required list first: each item is a compile error, a changed runtime contract, a changed test query, or a check that now fails. Then check the behavior below, refresh visual baselines, and apply the re-pin checklist above.

### Required migration work

1. Replace `LiveRegion announceOnMount={false}` with `deferFirstMessage`, and delete `announceOnMount` where it was `true` or bare, which is the new default. The old name read backwards: `true` rendered the first message at once, which is the arrangement a screen reader misses when the region mounts together with its message. Before: `<LiveRegion announceOnMount={false} message={count} />`. After: `<LiveRegion deferFirstMessage message={count} />`.
2. Rename `ThemeToggle labels` to `choiceLabels`, including inside `PanelShell themeToggleProps`, and the bundle key `themeToggle.choices` to `themeToggle.choiceLabels`. `choices` still names the set of themes offered. Before: `<ThemeToggle labels={{ auto: "Follow Admin" }} />`. After: `<ThemeToggle choiceLabels={{ auto: "Follow Admin" }} />`.
3. Replace `Card labelledBy` with the native `aria-labelledby`, which now names the card and, on the default div card, gives it the group role, and delete a hand-written `role="group"` beside a native `aria-labelledby` or `aria-label` on a `Card`. `label` is unchanged. Before: `<Card labelledBy={titleId}>`. After: `<Card aria-labelledby={titleId}>`.
4. Move `PanelShell errorLabels` into `labels.panelError`, renaming `retryLabel` to `retry` and `reloadLabel` to `reload`, and write the explanation twice: `description` for a fallback that offers Try again alone, and `reloadDescription` for the fallback `PanelShell` shows by default, which also offers the page reload. Move `PanelShell unsupportedLabels` into `labels.unsupportedBrowser`, where `title` keeps its name and the `children` text becomes `description`. The group words the browser notice only: the notice for a host React below the floor stays in English, so a panel that needs it translated passes its own `unsupported` element. Delete imports of `PanelShellErrorLabels` and `PanelShellUnsupportedLabels`. Before: `<PanelShell errorLabels={{ retryLabel: "Retry" }}>`. After: `<PanelShell labels={{ panelError: { retry: "Retry" } }}>`.
5. Pass `reloadDescription` beside a translated `description` on a `PanelErrorBoundary` that also takes `onReload`: `description` now shows only when the fallback offers Try again alone.
6. Replace `InlineConfirm fallbackTitle` with a `title` that asks the question, or with `labels.inlineConfirm.fallbackTitle` on the panel.
7. Write a `Popover width` number with its unit. A number is a type error and is no longer converted to pixels at runtime. Before: `width={240}`. After: `width="240px"`.
8. Update the test queries and assertions the new semantics change:
   - A toast card is no longer a live region. `getByRole("status")` and `getByRole("alert")` find the toast host's regions, which exist from the first `ToastRegion` mount, and a text match on a toast title finds both the card and the host's spoken line. Scope a card query to the notifications landmark, `getByRole("region", { name: "Notifications" })`, which holds the cards and not the spoken lines.
   - A polite `Banner`, `StatusIndicator`, or `Metric` that mounts with content shows it 100 milliseconds later. Wait for it (`findByText`), advance fake timers, or pass `deferFirstMessage={false}` where the content at mount is not news.
   - An embedded `CollapsibleSection`, and a section nested inside another package region, is no longer a `region`. Query its heading, or pass `landmark` where it should stay a landmark.
   - An unnamed `Code` block is `getByRole("group", { name: "Code" })`, not a `region`.
   - `data-snui-docked` sits on the action bar element alone: the viewport anchor around a docking bar no longer carries it, so a test that read it from the bar's parent reads the bar's own.
   - A field error's message sits in an element of its own inside the error region, beside the danger mark, so `getByText` on the message finds that element. A test that asserted on the region itself, its role or its id, looks the region up rather than finding it by its text. The region's class list now starts with `snui-field-error`, ahead of the wrapper's class, so compare it with `toHaveClass` rather than as one exact string, and refresh a snapshot that holds it.
   - `SegmentedControl readOnly` options no longer carry `aria-disabled`; assert `aria-readonly="true"` on the `radiogroup`.
   - A `NumberField` sets `aria-invalid` and shows its message once the edit finishes, so press Enter or move focus before asserting either. `onValidityChange` still fires on the keystroke.
   - Package copy changed: the clean save status reads "Nothing to save", bound messages read "Enter 5 or more." and "Enter 9 or less.", the theme selector's guidance names the Signal K Admin theme, and the panel error description begins "Try again reopens this panel". Read the words from `PANEL_LABEL_DEFAULTS` rather than retyping them.
   - An `InlineConfirm` title, and the title of a `PanelErrorBoundary` fallback inside a section or a dialog, head one level below the section, or below the `Dialog` or `AlertDialog` title, that encloses them. Query such a title at the level below that heading: level 3 under a level 2 section or a dialog title at its default level, and level 4 under the level 3 sections of a titled `PanelShell`. An `InlineConfirm` outside any section or dialog heads at the level a section there would take, level 3 under a titled `PanelShell`. A `Section` or `CollapsibleSection` inside a `Dialog` or `AlertDialog` also heads one level below the dialog title: query it at level 3 under a dialog title at its default level, and an `InlineConfirm` inside it at level 4.
   - Every error the package throws starts with `signalk-nearlcrews-ui:` and a space. A test that matches a package error with `toThrow("...")` keeps passing, because a string matches a substring. A test that compares `error.message` for equality, or matches a regular expression anchored with `^`, needs the prefix. A test that matched "must be a readonly array", "Conflicting signalk-nearlcrews-ui styles", "signalk-nearlcrews-ui 0.12.0 panel styles", or "requires a browser with native CSS @scope support" needs the new wording, which the changelog quotes in full; the `DataGrid` columns error now reads "DataGrid columns must be an array; received a Set. Pass a readonly array and replace it when the columns change.", naming what it received.
   - The blank-name errors read "FieldGroup requires a non-empty label or legend." and "CheckboxGroup requires a non-empty label or legend." after the prefix.
9. Rebuild, then fix what `snui-check-consumer` reports in its default run. It now fails this package in `dependencies`, `optionalDependencies`, or a required `peerDependencies` entry (pass `--runtime-dependency` only for plugin server code that imports `/format`; expect npm to install the React peers on the server then, and pin the same exact version in every field that declares the package), a package without the `signalk-plugin-configurator` keyword, a `--remote` that is not `public/remoteEntry.js` under `--root`, an entry without Webpack's container runtime or without the `./PluginConfigurationPanel` key, a `"type": "module"` package whose entry does not export `get` and `init`, a classic entry that leaves no such container on the global the Admin reads, the library's version stamp inside the entry, the host harness in any script, and an unknown, renamed, or misspelled `--snui-*` name or container name in any CSS asset. `--runtime` renders the panel with `configuration` undefined and `{}` first, and `--props` is now the object as given rather than merged over `{ configuration: null }`: a panel written against `null` fails until it handles `undefined`. `--container` is refused for a `"type": "module"` package, whose container comes from the module's exports. The command line is held to what the command reads: an argument that is neither an option nor the one value after an option fails, so write `--asset a.js --asset b.js` rather than `--asset a.js b.js`, and `--expect-unsupported` beside `--no-compatibility-render` fails, so drop whichever the panel does not need. A `webpack.config.mjs` beside `--root` is now found, after `webpack.config.cjs` and `webpack.config.js`, and an ES module configuration is read, so a share map that went unchecked there is checked. Add `--stats` and `--styles`, and `--runtime` for a module remote, then delete the checks they replace; the re-pin checklist lists them.

### Behavior to check

- `SaveActionBar` moves focus once, after the handler has run, instead of to its status before it. `onSave` and `onDiscard` are typed `SaveActionBarAction`, and every existing handler, async ones included, still compiles. A handler that returns an element or a ref sends focus there, a handler that moves focus itself keeps that destination, and a returned promise is not awaited, so an async handler gets the status. A handler that read the focused status inside `onSave` now finds the pressed button there.
- `SaveActionBar` keeps Discard available while `invalidMessage` blocks a save with nothing else to discard. Call `useResetDrafts()` from `onDiscard` so the invalid draft goes with the discard.
- `useFieldValidity` releases a field hidden in a retaining `CollapsibleSection` and restores its invalid state on reveal: an invalid field out of sight no longer blocks Save, and blocks it again once the section opens. A panel that must refuse a save for a field in a closed section checks that field itself and opens the section, as the recipe above shows.
- The panel announcer reads two messages from one handler, announces a repeat of the same words again, drops each message after 7 seconds, ignores a blank message rather than clearing the region, and is heard while a dialog, menu, or modal popover is open. A panel that announced an empty string to clear stale text can stop.
- A polite announcing component that mounts with content appears 100 milliseconds after mount, a visible delay as well as an announced one.
- An `InlineConfirm` title takes the level below its section, or below the title of the `Dialog` or `AlertDialog` it sits in, and a `PanelErrorBoundary` fallback inside a section or a dialog does the same, while a `Section` or `CollapsibleSection` inside a dialog heads below the dialog's title. Delete a `headingLevel` a panel computed by hand for any of them.
- `resolveFreshness` reads a sample more than 60 seconds in the future as stale with no age when a threshold is set, rather than fresh; `usePollFreshness` flips `stale` the moment the threshold passes and measures a new sample against the clock as it arrives; and `tickMs: 0` stops the clock between samples, so the age and the flag are measured when a sample arrives and not again until the next one.
- `formatCount` groups its digits, "1,234 charts" rather than "1234 charts", for `options.locale` or the runtime default, and rounds a fractional count to three decimal places.
- `Checkbox`, `SegmentedControl`, `RadioGroup`, `FieldGroup`, and `CheckboxGroup` read their own description, blocked reason, error, and empty-selection warning before a caller's `aria-describedby`, the order `LabeledField` already used. A test that compared the whole attribute value reads the new order.
- Development consoles show new warnings: a button, checkbox, or group option blocked with no reason, a reason beside native `disabled`, a select-all box blocked with no reason, a button whose `aria-label` does not contain its visible text, a dialog only Escape can close, an announcement from `usePanelAnnouncer`, `FreshnessNote`, or the `PanelErrorBoundary` fallback with no `PanelShell`, and `useResetDrafts` with no panel above it. Each names its fix.
- The notice for a host React below the floor is headed "Signal K update required".
- Under `prefers-contrast: more`, `DataGrid` rows and header cells, `Menu` items, radios, switches, and the picker of a date or time field thicken their focus rings to 3 pixels, as buttons and inputs already did outside forced colors; they kept 2 pixels before. Under forced colors the system-colored rings on tabs, primary, secondary, and ghost buttons, the selected segmented option, radios, and switches thicken too, and a danger button's to 4 pixels. The width is the new `--snui-focus-ring-width` token.
- A `Card` footer holds its content in an inner element, `snui-card__footer-content`, which carries the prose measure while the ruled footer spans the card. Consumer CSS that reached the footer's children directly needs one more level; like every package class, that name is private, so prefer the documented props.
- The header summary and actions of a `CollapsibleSection` sit in one inner element, `snui-collapsible__trailing`. Consumer CSS that reached them as direct children of the header needs one more level; like every package class, that name is private.
- The tone glyph in a toned `CollapsibleSection` toggle sits in an inner slot, `snui-collapsible__tone`, and no longer carries the `snui-collapsible__tone-glyph` class that 0.12.0 put on it. Consumer CSS that targeted that class or reached the glyph as a direct child of the toggle needs updating; like every package class, these names are private.
- Visual baselines change. `CollapsibleSection` takes the larger radius, the raised shadow, and the 16 pixel content inset of `Section`, an `ActionBar` pads its content by that same inset, and section titles are bold, with the first level under a titled shell at the large size. Tone glyphs take a shape per tone. Container outlines (cards, field groups, sections, and banners), card rules, and table, grid, menu, and tab dividers are fainter, painted with `--snui-color-border-subtle`. A `FieldGroup` legend sits inside the border on the actions' row in Chromium and Firefox; WebKit still draws it in the fieldset border, as before. Text inputs and selects are 44 pixels on a coarse pointer, level with the buttons. Night paints scrollbars, selection, option lists, autofill, the number and search buttons, the date and time picker icons and focus ring, the segment being edited in a date or time field, every date and time segment in the field's own color, and the textarea resize grip red, and the Light info tone and Night info and visited link colors moved. The theme selector's guidance reads differently. Fixed rendering moves pixels too: the card footer rule, field error rows, inline field labels, the label of a field whose control slot holds a blocked control beside a live one, such as a `Select` with a disabled placeholder option, natively disabled segmented options, buttons in a card footer, anchor buttons, disabled checkbox labels, the optional marker, the required and optional markers of a blocked field or checkbox, toned `Progress` glyphs, banner actions, the `CollapsibleSection` chevron in a right-to-left panel and beside a wrapped title, toned `CollapsibleSection` glyphs, the rows that wrap under a narrow `CollapsibleSection` heading, and the first column of every data grid.
- The shipped style text is compacted, which more than pays for this release's additions: a typical panel remote measures about 2.2 KB gzip smaller than on 0.12.0, so re-record a size baseline downward. `getPropertyValue` for `--snui-focus-ring` and `--snui-sticky-clearance` returns single-spaced text.
- A `CheckboxGroup` that passes both `label` and `legend` is now named by `label`, the way `FieldGroup` already was. Check any group that passes both and keep the one word you mean.
- `DataGrid` rebuilds its rows when `renderRow` changes identity. A grid that passes an inline arrow keeps working and now shows fresh output, but it rebuilds every rendered row whenever the panel renders. Move `renderRow` to module scope, or wrap it in `useCallback` listing the values it reads besides the item, such as a unit preference, to keep React Aria's row cache.
- `Accordion` with `defaultOpenIndex={null}` now opens nothing, even when a child carries `defaultOpen`. Leave `defaultOpenIndex` unset to keep the child's `defaultOpen`.
- A numeric timestamp outside the `Date` range now reads as unknown in `RelativeAge`, `formatRelativeAgeSince`, and `resolveFreshness`, the same as an unparsable string.
- `RangeInput` draws a thicker track on a coarse pointer in Chromium and Safari. A consumer with visual baselines of a slider on a touch device should expect that image to change.
- Internal helpers that no entry point exports have left the emitted declarations, marked `@internal`. No import resolves differently.

### Optional adoption

Every item is in the re-pin checklist above with the pattern to search for. This release adds `FreshnessNote`, `useResetDrafts`, `PANEL_LABEL_DEFAULTS`, `SaveActionBar.outcome` and returned focus targets, `FieldValidity.firstInvalid()`, visible blocked reasons on `Button`, `Checkbox`, and `CheckboxGroup`, `SegmentedControlOption.ariaDisabled`, `Switch` descriptions and errors, `Section.leading`, `Stack divided`, `settleMs`, named units, `NumberField` message templates and functions, `Menu.triggerProps`, `formatCount` grouping, the `--snui-color-border-subtle`, `--snui-color-neutral-subtle`, and `--snui-focus-ring-width` tokens, the `data-snui-sticky`, `data-snui-docked`, and `data-snui-theme-choice` test hooks, `snui-check-consumer --stats`, `--styles`, and module remotes under `--runtime`, and `signalk-nearlcrews-ui/host-harness` for browser tests.

## Changes in 0.12.0

These changes are backward compatible. No consuming code requires modification.

- A panel error announcement keeps the punctuation its title and description were written with, so a title ending in "!" or "?" is no longer announced with an extra full stop after it. A panel that asserted the announced string exactly should read it again.
- `ThemeToggle` falls back to the package's host-theme guidance when a panel's label bundle supplies a blank `themeToggle.description`, which is the blank-is-absent rule every other bundled string already followed.
- The emitted declarations change without changing any entry point: `PanelAnnouncerProvider`, `PanelLocaleProvider`, and `PanelLabelsProvider` declare `children` as optional, and `utils/aria.d.ts`, `utils/focus.d.ts`, `utils/motion.d.ts`, and `utils/text.d.ts` name the internal helpers the components share. None of them is exported from an entry point, so no import resolves differently.

## Changes in 0.11.0

Published as 0.11.1. Version 0.11.0 was tagged but never reached npm, so a consumer moving off 0.10.1 pins 0.11.1 and applies everything below.

This release removes every deprecated alias and prop the package carried, renames one prop across three components, and changes several defaults. Work through the required list first: each item is a compile error or a changed call signature, and the replacements are all exported today. The rest of the release is additive.

### Required migration work

1. Replace the removed type aliases: `BannerLive`, `CheckboxErrorLive`, `FieldErrorLive`, and `RadioGroupErrorLive` with `AnnouncementMode`; `RadioGroupOrientation` and `SegmentedControlOrientation` with `Orientation`; `SegmentedControlLegendVisibility` with `SegmentedControlLabelVisibility` or the shared `Visibility`; and `DataGridDensity`, `InputGroupDensity`, and `LabeledFieldDensity` with `Density`. `AnnouncementMode`, `Orientation`, `Visibility`, and `Density` are exported from the package root.
2. Rename `legend` to `label` and `legendVisibility` to `labelVisibility` on `SegmentedControl` and `ThemeToggle`. `SegmentedControlProps` is no longer a union over the two spellings, so `label` is now required.
3. Rename the value callbacks: `Switch.onChange` becomes `onCheckedChange`, and `RadioGroup.onChange`, `SegmentedControl.onChange`, and `ThemeToggle.onChange` become `onValueChange`. The payload is unchanged.
4. Replace `density="comfortable"` with `density="default"` on `LabeledField` and `InputGroup`.
5. Replace `MenuItem destructive` with `tone="danger"`, which is what it aliased.
6. Rename `width` to `controlWidth` on `InputGroupControl`, `NumberField`, and `SecretInput`. `width` now means a content-width token on `PanelRoot`, a size on `Dialog`, and a CSS length on `Popover`, and nothing else. `InputGroupControlWidth` is unchanged.
7. Move `SaveActionBar savedMessage` into `labels.saved`, which is a required member of `SaveActionBarLabels`. `SaveActionBarStateInput` is now a `Pick` over the props, and `SaveActionBarState` carries a required `blocked` flag for a consumer that derives the state itself.
8. Give `NumberField` either `value` or the new `defaultValue`, never both. `onValueChange` is optional now, so a read-only numeric display needs no state hook.
9. `Banner.onDismiss` is called with no arguments. A handler typed for a React mouse event no longer compiles; drop the parameter.
10. Remove `tabIndex` from `DisclosurePanel`, `Tab`, and `TabPanel` props, and `aria-labelledby` from `TabPanel`. The components own those attributes, and passing them is now a compile error rather than a silent override.

### Behavior to check

- Toast overflow never drops an unread warning or danger toast for a lesser arrival. When nothing in the queue is less consequential than the incoming toast, the arrival itself is refused, reported through the new `createToastQueue({ onEvict })` with reason `"rejected"`, and the key `enqueue` returned stays safe to pass to `dismiss`. A toast made sticky with `duration: 0` outranks a timed one on any tone.
- F6 reaches a panel's notifications only while focus is inside that panel, so a second panel and the Signal K Admin chrome keep the key, and F6 and Shift+F6 both toggle. Dismissing a toast moves focus to the card that takes its slot, else to the newest remaining toast.
- `formatRelativeAge` counts in numbers from a day up ("1 day ago", "1 week ago") instead of using calendar words; pass `numeric: "auto"` for the previous wording. Its fallback default is now "Unknown".
- The default `DataGrid` empty title is "Nothing to show yet". A grid still waiting on its request should pass its own `emptyState`.
- `ThemeToggle` shows its group label by default (`labelVisibility="hidden"` restores the old look), names the two automatic themes "Match Admin" and "Match device", carries a default description saying what Match Admin follows, and always offers the active theme even when `choices` leaves it out.
- `PanelShell` reloads the page from its default error fallback without being given `onReload`; pass `onReload={null}` for a panel that must not offer one. The default fallback no longer carries `role="alert"`: it takes focus when the crash left nothing focused, and otherwise announces through the panel announcer the shell now mounts.
- `SaveActionBar` status copy changed ("All changes saved", "Save to enable the plugin", "Save sent to the server"), an ordinary unsaved edit reports with the info tone, and a blocked save refuses through `aria-disabled` rather than the native `disabled` attribute, so Save and Discard keep their place in the tab order.
- `LabeledField` reads its own description and error before an `aria-describedby` already on the child element, matching the order it always applied to `controlDescribedBy`.
- `Section` titles take the type step their heading level implies, the compact field row gap is one space step rather than a half step, and `Card`, `Section`, and inline confirmations tighten their padding on a narrow panel.
- `SegmentedControl` answers all four arrow keys in both orientations, and Ctrl, or Command on macOS, moves focus without changing the selection.
- Palette values moved: Light and Dark paint the info tone in cyan with its own subtle tint, the Dark border is lighter, and Night darkens the scrim, the raised hover fill, and disabled text. `--snui-space-2` rises to 0.75rem under a coarse pointer, which widens the gaps the action bar and `Cluster` lay out with.
- `Table` and `TableScrollRegion` install their own style module, so a panel with no table no longer carries the table CSS, and a panel that renders one installs the `simple-table` module on first mount.
- Every field, group, checkbox, radio group, and segmented-control error leads with the danger tone mark and its visually hidden tone word, so an error does not depend on color.
- A focused `NumberInput` drops focus before a wheel or trackpad scroll can spin its value, and `TextInput` and `NumberInput` restore their controlled value after a native form reset.
- `TextInput`, `NumberInput`, `RangeInput`, `Select`, `Textarea`, and `SecretInput` are exported as function-typed constants rather than function declarations, which is what carries the mark that keeps `LabeledField` from warning about them as element children. Rendering them is unchanged; code that declared a variable as `typeof TextInput` still compiles.

### Optional adoption

- Delete a hand-rolled staleness rule in favor of `usePollFreshness` and `resolveFreshness`, and a hand-rolled reachability treatment in favor of `resolveReachability` with `REACHABILITY_STATUS`. The threshold and the poll interval stay yours; the age, the stale flag, the tone, and the default wording come from the package.
- Import `signalk-nearlcrews-ui/format` where formatting runs outside React, in a web worker, a service worker, or a Node script. The entry point has no React anywhere in its module graph.
- Replace local plural and list-joining helpers with `formatCount` and `joinList`, and a local reduced-motion scroll helper with `revealElement` or `revealAndFocus`.
- Track which fields hold an invalid draft with `useFieldValidity` instead of a panel-local record, and convert between a selection array and a record of booleans with `toCheckboxGroupValue` and `applyCheckboxGroupValue`.
- Explain a blocked button with `Button disabledReason` instead of wiring your own `aria-describedby`, and re-announce an unchanged message with `announceKey` on `Banner` and `StatusIndicator`, which `LiveRegion` already took.
- Seed a night-use panel with `PanelRoot defaultTheme`, pin one locale for the package's formatters with `PanelRoot locale`, and announce a panel-wide state change through `usePanelAnnouncer` rather than mounting a region beside the message.
- Replace a run of per-component label props with one `labels` bundle on `PanelRoot` or `PanelShell`, which is also how a panel translates the package's own copy. The groups follow the localization table in the [API reference](api-reference.md): `button.loading`, `banner.dismiss`, `tone`, `inlineConfirm`, `secretInput`, `themeToggle`, `numberField`, `dataGrid.emptyTitle`, `menuItem.tone`, `toastRegion`, `panelError`, `saveActionBar`, and `relativeAge.fallback`. A component prop still wins over the bundle, so a single call site can say something more specific, and `usePanelLabels` reads the bundle back in a consumer component.
- Reach for the new component API where it removes consumer scaffolding: `Accordion` controlled through `openIndex`, `CollapsibleSection tone`, `toneLabel`, `triggerRef`, and `idPrefix`, `Section headingRef` and `density`, `ActionBar variant="toolbar"`, `TabPanel focusable`, `SaveActionBar focusOnAction`, `SegmentedControl readOnly`, `description`, and `error`, `CheckboxGroup emptyWarningLive`, `Card label` and `labelledBy`, `Banner headingLevel`, `Text wrap`, `Code break`, `Progress toneLabel`, `Button variant="text"`, `Checkbox optionalLabel` and `requiredLabel`, `FieldGroup label` and `groupDescribedBy`, `Menu triggerLabel`, `MenuItem toneLabel`, `Popover id` and `style`, `LiveRegion announceOnMount`, `InlineConfirm onOpenChange`, `Dialog onCancel` reasons, `ToastRegion defaultDuration`, and `DataGrid caption`, `emptyDescription`, and `virtualize`.
- Pass `--asset <name>` to `snui-check-consumer` for a plugin that serves other bundles from the directory holding its remote entry, so the size baseline and the bundled-React scan cover the remote's own files alone.

## Changes in 0.10.1

These changes are backward compatible. No consuming code requires modification.

- Tab styles install with `Tabs` instead of traveling in the root sheet every panel installs, so a panel that renders no tabs carries no tab CSS.
- A consumer that bundles `signalk-nearlcrews-ui/composites` whole should expect its recorded size baseline to move: the tab rules now count against that entry point rather than against the root sheet.

## Changes in 0.10.0

Every 0.9.0 call site compiles unchanged, and nine behaviors change: `SaveActionBar` takes its saved message down on its own after 2,500 milliseconds, an announcing `Banner`, `StatusIndicator`, or `Metric` with nothing to show renders an empty region instead of empty chrome, `InlineConfirm` keeps Cancel and Escape live while `busy`, a disclosure panel that holds focus hands it back to its trigger however it closes, a `PanelShell` with no title resolves `themeToggle="between"` to `"end"`, a flush `Card` clears its row gap with its padding, a `Banner` hands focus on however it goes rather than on the Dismiss press alone, a `Banner` with a consumer landmark role takes its name from its own title, and the sections inside a titled `PanelShell` take the level below that title. The release types tab values with the consumer's own union, lets a tab panel build its content only where the panel is mounted, lets a disclosure take its ids from the consumer, moves the saved-message window and the repeat announcement into the components that own them, and merges extra description ids inside `LabeledField`.

### Behavior to check

- `Banner`, `StatusIndicator`, and `Metric` render an empty region instead of empty chrome when they announce. With `live` set to `"polite"` or `"assertive"`, or a live `role` given to `Banner` or `StatusIndicator`, and no content to show, the component now renders the element that carries the role with nothing inside it, and the stylesheet takes that empty element out of the flow, so it reserves no box, border, padding, or margin. Before, the same call rendered visible chrome around nothing: a bordered banner, a lone status dot, or a tone glyph with no reading. Content is the `title` and children on `Banner`, the children on `StatusIndicator`, and `value` on `Metric`; a `Banner` with `actions` or `onDismiss` counts as having content and renders in full, because hiding a focusable control would strand it. Nothing changes for a component that has something to show, or for one whose region does not announce, with one deliberate exception that should stay: the rule that takes an empty value region out of the flow is keyed on the region being empty rather than on it announcing, so a `Metric` with an empty `value` and no `live` also loses the four-pixel margin that empty region used to contribute. That region was already invisible, and keying the rule to the announcing case alone would mean a second mechanism beside the one the field errors already use. The point of the change is that `<Banner live="polite">{message}</Banner>` is now correct where `{message && <Banner live="polite">{message}</Banner>}` was not: the conditional builds the live region and its first message in one commit, which screen readers do not announce reliably. Move the condition off the component and onto its content.
- `InlineConfirm` no longer freezes Cancel and Escape while `busy`. Only Confirm is blocked. Before, a busy confirmation could not be dismissed at all, which left a keyboard user with no way out while an unrelated panel action ran. `onCancel` can now fire while `busy` is true, with reason `"cancel"` or `"escape"`, so a handler that assumed a cancel could only arrive from an idle region needs to decide what a cancel during the work means: abort it, close the region, or ignore it. Cancel also no longer carries `aria-disabled` while busy, which a test asserting the frozen state will see.
- A disclosure panel that holds focus when it closes now hands that focus to its trigger, whatever closed it. Before, only a close through the trigger or `setOpen` did that, so a consumer holding the open state and wiring a Close button inside the panel to its own setter left focus on the body, with no keyboard route back. Opening is unchanged: setting `open` directly still moves no focus into the panel. A close while focus sits outside the panel still moves nothing, so a panel closed in the background cannot pull focus off the control the user is working with. A consumer that had worked around this by focusing the trigger itself after its own close can delete that call; leaving it in place is harmless, because it runs after the handoff and wins.
- `PanelShell themeToggle="between"` on a panel with no `title` now places the theme selector after the content, the same as the default `"end"`. Before, with no title block to sit after, the selector became the panel's first element and its first tab stop, a placement none of the three values describes. A panel with no title that wants the selector to lead has no supported way to ask for it; give the panel a `title` if the toggle should precede the content.
- `SaveActionBar` owns the window for its saved message. It reads `saveRequestedAt` and takes the message down 2,500 milliseconds after that instant; before, the message stayed up until the panel wrote the prop back to null. A panel whose own timer was shorter behaves as it did, because its clearing still comes first. A panel whose window was longer, or which left the timestamp set until the next save, sees the message go sooner. Pass `savedMessageDurationMs` for a different window, or `0` to keep owning it. The window is measured from the timestamp rather than from the mount, so a panel that remounts holding an old one no longer replays a confirmation the user finished with minutes ago.
- `Card density="flush"` no longer keeps the row gap. Flush cleared the padding and left `gap: var(--snui-space-3)` behind, so a flush card with more than one child still spaced them, and a consumer drawing its own chrome inside the card wrote `.row.row { gap: 0 }` to take that back. Delete that override. A flush card that wanted the gap now sets `gap` itself, on the card or through its own class.
- A `Banner` hands focus to `dismissFocusRef` however it goes, not on the Dismiss press alone. An action inside `actions` that unmounts the banner, a Retry on an error banner being the usual one, previously dropped the reader on the body, and so did an announcing banner whose actions went with its message. The banner now moves focus to the same destination in those cases, but only when it actually held focus, so a banner removed in the background still moves nothing. The move runs before a newly mounted subtree's effects, so a panel that focuses what it renders in the banner's place keeps that focus; remove any consumer workaround that focused the destination after its own Retry, or leave it, since it runs later and wins.
- A `Banner` carrying a consumer `role` with no `aria-label` or `aria-labelledby` of its own is now named by its visible title, and the title element carries a generated `id` for that. A test asserting that a `role="region"` banner has no accessible name, or querying it as `getByRole("region")` with no name where a name now exists, needs updating. Delete an `aria-label` that repeated the title. A live role (`status`, `alert`, or `log`), a banner with no title, and a banner with a name of its own are all unchanged.
- The sections inside a titled `PanelShell` take the level below the panel title. `<PanelShell title="..."><Section title="..."></PanelShell>` rendered two level-2 headings before and now renders `h2` then `h3`, and `CollapsibleSection` follows the same rule. A test asserting `getByRole("heading", { level: 2 })` on a section inside a titled shell asserts level 3 now. Delete the `headingLevel={3}` a panel wrote on every section to work around this; it still wins where it stays. Nothing changes outside a shell, under a shell with no title, or where the level is passed explicitly, and a shell at level 6 keeps its sections at 6.

### Optional adoption

- Delete the guard that narrowed a reported tab value back to its union. `Tabs`, `Tab`, and `TabPanel` are generic over the value type, so `onValueChange` reports the union rather than `string`, and a value the union does not hold fails to compile instead of dropping the press. The type is pinned by a `value` or `defaultValue` of that type, or written out as `<Tabs<Category>>`; write the children the same way (`<Tab<Category> value="engine">`) to have their values checked too. `TabsProps`, `TabProps`, and `TabPanelProps` written without a type argument still mean `string`.
- Give a `TabPanel` a function child where its content is expensive to build and the panel is `mountStrategy="unmount"`. The panel calls the function only where it renders it, so an unselected tab builds nothing; a panel wrapped in a consumer ternary to avoid that cost can drop the ternary and the second copy of the selection test it needed. Plain children behave as they did and stay the right form everywhere else.
- Delete the save-notice timer: the state field, the `useEffect` holding a `setTimeout`, and the duration constant that existed only to write `saveRequestedAt` back to null. Pass the timestamp from the save handler and let the bar close the window. A panel that used 2,500 milliseconds keeps the timing it had; anything else goes in `savedMessageDurationMs`.
- Replace the sequence counter and the zero-width space that padded a repeated message with `announceKey`: `<LiveRegion message={text} announceKey={seq} />` announces the same words again whenever the key changes, and the message stays plain text. A panel that never learned the trick gains the repeat announcement by passing a key; one that keeps a counter for its own visible confirmation can reuse that counter as the key.
- Where a render-prop control joined an id into `controlProps["aria-describedby"]` by hand, name that id in `controlDescribedBy` on the `LabeledField` instead and spread `controlProps` unchanged. It takes one id or a list, serves element children too, and keeps the field's own description and error first in the reading order.
- Replace a `disabled` checkbox that the user may be standing on with `ariaDisabled`. A row that must stay checked, such as the last remaining selection in a list, previously had to be either changeable or natively `disabled`, and `disabled` gives up the tab stop, so setting it on the focused box destroys that focus and drops the reader on the body. `Checkbox.ariaDisabled` keeps the box focusable, keeps its checked and mixed states, and keeps it in the form, while refusing the change from the box, the label, and the Space key; `Enter` still reaches the form. `CheckboxGroup` takes the same flag per option, and select-all leaves those options as it finds them. `Switch` and `RadioGroup` express the same thing as `readOnly`, which `Switch` already had and `RadioGroup` gains here. Keep `disabled` where the control is genuinely unavailable, because giving up the tab stop is part of saying so.
- Write a consumer container query against `snui-panel` rather than hard-coding the name and the width. `PanelRoot` sets `container-name: snui-panel` and `container-type: inline-size`, and both the name and the 37.5rem narrow breakpoint are public from this release, as `PANEL_CONTAINER_NAME` and `CONTAINER_BREAKPOINT_NARROW`. They ship as strings rather than as CSS custom properties because a container query condition cannot read a custom property: interpolate the constants into generated CSS, or write the documented values and track the design contract, which now records both as public and stable within a minor release.
- Drop the conditional around an announcing `Banner`, `StatusIndicator`, or `Metric` and let its content go empty instead. A status chip beside a button is the common case: `<StatusIndicator live="polite">{message}</StatusIndicator>`, rendered whenever the panel exists, is now one element that announces correctly and shows nothing at all while `message` is empty, so it replaces both the conditional chip (which announces unreliably) and the chip paired with a separate always-mounted `LiveRegion` (which is two elements to keep in step). `SaveActionBar` has always worked this way internally, with one region whose text changes. Keep a separate `LiveRegion` only for words no visible element owns.
- Give `DisclosureTrigger` and `DisclosurePanel` a `disclosure` prop, a `useDisclosure` result, where a single `Disclosure` context cannot serve them. Two drawers in one row, with both triggers in a cluster and both panels below, previously had to nest their providers, and the inner one answered for both triggers, so such a row was written against the raw hook with a hand-rolled `<section>`. Call `useDisclosure` once per drawer and name each part's disclosure instead: the panel keeps the ids, region naming, `mountStrategy`, and focus handoff the composed form has. The context form is unchanged, and a part with neither a prop nor a provider still throws, now with a message naming both ways.
- Replace a consumer-local script that renders the built panel remote in a `node:vm` context with `snui-check-consumer --runtime`. The command owns the part a consumer could only guess at: the DOM members React Aria's import-time setup touches, the share scope the host initializes, and the two renders that prove the compatibility notice and the panel itself. Pass `--expose ./PluginConfigurationPanel`, the text the panel must render as `--expect`, and a `--props` object where the panel needs configuration to render; the README documents every option. The static checks are unchanged and still run first, so an existing invocation keeps working with the flag added. A remote built with a library type of `"module"` cannot be evaluated this way; the command reports it as such and the static checks cover that build without `--runtime`.
- Pass `id` to `Disclosure` or `useDisclosure` to name the trigger, or `idPrefix` to name both ends (`<idPrefix>-trigger` and `<idPrefix>-panel`), instead of finding the trigger through a DOM query such as `[aria-controls="..."]`. Both ids stay generated when neither option is given, and the ARIA relationships follow whichever is set. An id or prefix carrying whitespace throws, because `aria-controls` and `aria-labelledby` hold space separated lists.

## Changes in 0.9.0

This release changes toast defaults, dialog dismissal, several prop types, relative-age formatting, the Night palette, and token values, and it adds the primitives that let a consumer delete most of its local panel scaffolding. Work through the required steps first, then adopt the new primitives one panel at a time.

### Required migration work

1. Warning and danger toasts are sticky by default, and warning toasts announce politely. If a panel relied on a warning or failure vanishing after five seconds, pass `duration: 5000` (or another value) in the `ToastContent`; pass `live: "assertive"` on a warning that must interrupt. Info and success toasts are unchanged.
2. `queue.enqueue` throws synchronously for a blank title. Check server-provided text before enqueuing, or fall back to a fixed title such as the operation name.
3. `ToastRegion` renders its landmark only while toasts exist. Code or tests that queried `getByRole("region", { name: ... })` before enqueuing must enqueue first, and a `ref` on `ToastRegion` is null until the first toast shows. After a dismissal, focus lands on the next toast's dismiss button, the element focused before entering the region, or the panel root; remove any consumer code that moved focus after a toast closed. F6 moves focus into and out of the notifications.
4. `AlertDialog` closes on Escape and calls `onCancel`, and `onCancel` also fires for a scrim press when `dismissable` is set. A handler written for the cancel button alone now runs for every decline. Pass `keyboardDismissable={false}` only when Escape must be blocked.
5. Import `Column` for `DataGrid` from `signalk-nearlcrews-ui/data-grid`, not from `react-aria-components`, and render the grid inside `PanelRoot`. Type `density` with `Density` from the package root; `DataGridDensity` is removed, as "Changes in the next release" records. Before: `import { Column } from "react-aria-components";`. After: `import { Column } from "signalk-nearlcrews-ui/data-grid";`.
6. `MenuSeparator` no longer accepts `id`. Use `data-*` attributes to mark separators.
7. Replace `density="comfortable"` with `density="default"` on `LabeledField` and `InputGroup`. The old value still renders as default at runtime, and `LabeledFieldDensity` and `InputGroupDensity` still admit it, but new code should use the shared `Density` type exported from the package root. Before: `<LabeledField density="comfortable">`. After: `<LabeledField density="default">`, or omit the prop.
8. Rename `legend` to `label` and `legendVisibility` to `labelVisibility` on `SegmentedControl` and `ThemeToggle`. The old props keep working and are deprecated; the "requires a non-empty" error now says `label`, so update any test that matched the message. Before: `<SegmentedControl legend="Units" legendVisibility="visible" />`. After: `<SegmentedControl label="Units" labelVisibility="visible" />`.
9. Rename the value callbacks on composed controls: `Switch.onChange` becomes `onCheckedChange`, and `RadioGroup.onChange`, `SegmentedControl.onChange`, and `ThemeToggle.onChange` become `onValueChange`. The payload is unchanged, and the old names still fire and are deprecated. Native wrappers (`Checkbox`, `TextInput`, `NumberInput`, `RangeInput`, `Select`, and `Textarea`) keep the React `onChange` event handler. Before: `<Switch checked={enabled} onChange={setEnabled} />`. After: `<Switch checked={enabled} onCheckedChange={setEnabled} />`.
10. Replace the deprecated type aliases: `CheckboxErrorLive`, `FieldErrorLive`, `RadioGroupErrorLive`, and `BannerLive` with `AnnouncementMode`; `RadioGroupOrientation` and `SegmentedControlOrientation` with `Orientation`; `SegmentedControlLegendVisibility` with `SegmentedControlLabelVisibility`; and `LabeledFieldDensity`, `InputGroupDensity`, and `DataGridDensity` with `Density`. `AnnouncementMode`, `Orientation`, and `Density` are exported from the package root. Every one of those aliases is removed as of the release recorded under "Changes in the next release".
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
25. Import `DataGridColumnProps` where you named `ColumnProps` from `signalk-nearlcrews-ui/data-grid`: the wrapper's props are the ones carrying `numeric` and `wrap`. Where React Aria's own type is genuinely wanted, import `ColumnProps` from `react-aria-components`. Before: `import type { ColumnProps } from "signalk-nearlcrews-ui/data-grid";`. After: `import type { DataGridColumnProps } from "signalk-nearlcrews-ui/data-grid";`.
26. `DataGridProps` is a union on the header shape. Pass `columns` with a render-function header and omit it with `<Column>` element children; the two could be silently mismatched before. As with `StackProps`, replace `interface Props extends DataGridProps` with `type Props = DataGridProps<Row> & { ... }` or `ComponentProps<typeof DataGrid>`.
27. `cancelVariant` on `InlineConfirm` and `AlertDialog` no longer accepts `"primary"` or `"danger"`. Move a destructive tone to `confirmVariant`, which already carries it, and leave the escape action secondary or ghost.
28. Replace `MenuItem` `destructive` with `tone="danger"`. The old prop keeps working and is deprecated.

### Optional adoption

- Translate the default error fallback with `PanelShell.errorLabels` (`title`, `description`, `retryLabel`, and `reloadLabel`) rather than replacing it through `errorFallback`.
- `Visibility` from the package root names the `"hidden" | "visible"` vocabulary that `CheckboxLabelVisibility`, `SegmentedControlLabelVisibility`, and `TableCaptionVisibility` alias, alongside `Density`, `Orientation`, and `AnnouncementMode`.
- Tests of the save rules can call `resolveSaveActionBarState({ dirty: true })` and let the shipped strings apply, instead of building a complete `labels` object and a `savedMessage` by hand.
- Replace the copied panel frame (the `supportsNativeCssScope` preflight, `UnsupportedBrowserNotice`, `PanelRoot`, the outer `Stack`, the title heading, and `ThemeToggle`) with `<PanelShell themeToggle="end">`. Leave `title` unset: above the panel Signal K Admin renders only its plugin card header, an `h5` holding the npm package name, and no `h1`, so the card header already names the plugin, and a panel that does pass a title keeps it at level 2 or lower. Local error boundaries can go; `PanelShell` wraps the children in `PanelErrorBoundary`, `onReload` adds a page-reload action, and `errorFallback` keeps a custom fallback.
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

  The baseline JSON keeps the shape the consumers already use: `gzipBytes`, `maximumIncreasePercent`, and an optional `approvedCeilingGzipBytes`. It looks for `webpack.config.cjs` then `webpack.config.js` beside `--root`; pass `--webpack-config` to name another file.

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

These changes are backward compatible for consumers that use ordinary web, mail, telephone, fragment, query, or relative links.

- Anchor-form `Button` controls make dangerous and unknown URL schemes inert. Existing HTTP, HTTPS, mail, telephone, fragment, query, and relative destinations continue to work.
- `Accordion` documentation now makes its existing static-child-order contract explicit. Keep child order stable after the first render because open state is tracked by position.

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

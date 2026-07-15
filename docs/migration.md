# Consumer migration guide

Migrate one plugin at a time. Do not combine adoption with a domain refactor or visual redesign.

## Before migration

Record:

- The production panel bundle size and gzip size
- Light, dark, and night screenshots
- The current theme storage key
- A 320-pixel layout result
- The existing save, validation, and provider workflows
- The browser engine versions used by every supported desktop, kiosk, tablet, and embedded WebView deployment

Known legacy theme storage keys are:

| Consumer                 | Legacy key   |
| ------------------------ | ------------ |
| Chart Locker             | `cl-theme`   |
| Crows Nest               | `ac-theme`   |
| NMEA 2000 Emitter Cannon | `skn-theme`  |
| OpenRouter Companion     | `orc-theme`  |
| Synthetic Values         | `skn-theme`  |
| Virtual Weather Sensors  | `svws-theme` |

Emitter Cannon and Synthetic Values intentionally share `skn-theme`. Pass only the current consumer's key, for example `<PanelRoot legacyThemeStorageKeys={["cl-theme"]}>`. The shared `signalk-nearlcrews-ui.theme.v1` value always wins when valid. Otherwise, `PanelRoot` copies the first valid legacy value into the shared key and uses Auto when neither is valid.

The plugin should have a production remote-load check and at least one browser smoke test before replacing broad panel structure. Verify `typeof window.CSSScopeRule === "function"` in every supported deployment class. A passing developer-browser test does not establish support in an older kiosk or embedded WebView. Treat a failed check as an adoption blocker, retain the existing consumer UI, and update the deployment browser before migrating that consumer.

## Install a local artifact

From this repository:

```sh
npm run validate
npm pack --ignore-scripts
```

In the consumer:

```sh
npm install --save-dev --save-exact ../signalk-nearlcrews-ui/signalk-nearlcrews-ui-0.1.0.tgz
```

The dependency belongs in `devDependencies` because the consumer publishes compiled panel assets.

## Adopt in small steps

1. Wrap the panel in `PanelRoot` and pass its legacy theme key.
2. Replace local theme tokens and the theme toggle.
3. Add `Stack` around adjacent top-level surfaces, then replace buttons, segmented controls, sections, disclosures, fields, fieldsets, and inputs.
4. Replace blocking browser confirmation with `InlineConfirm`.
5. Replace status and banner presentation while preserving plugin-specific state.
6. Remove the replaced local styles and components.

Use `CollapsibleSection` only for heading-backed, controlled, summarized, or action-bearing content. Keep `Disclosure` for simple native details. Use `mountStrategy="unmount"` for expensive content that should exist only while open, or retain the default when form state and focus targets must stay mounted.

When save or discard disables its initiating button, pass a ref to `ActionBar.statusRef` and focus that status after the operation. The consumer still owns save timing, status text, and focus-transfer timing.

Do not move fetch hooks, reducers, unit conversion, save logic, or domain validation into this package.

## Module Federation

Keep React as a host-provided singleton. Do not add `signalk-nearlcrews-ui` to Module Federation `shared` configuration.

The consumer build must prove that it does not include a second React or React DOM implementation and that React is consumed from the host share scope. Embedding React's small production JSX helper is intentional and allowed. A shared declaration alone is not enough evidence.

## Consumer acceptance gate

- Lint, type-check, tests, boundary checks, and production build pass.
- The production remote loads in Signal K Admin.
- One full save and validation flow passes.
- Light, dark, night, and Auto render correctly.
- Every supported production browser engine exposes `CSSScopeRule` as a function.
- Keyboard behavior and visible focus pass.
- Axe reports no findings, except rules that are explicitly inapplicable to the test environment and covered in a real browser.
- A 320-pixel viewport has no page overflow.
- Coarse-pointer controls meet the 44-pixel floor.
- Screenshots and package metadata are refreshed.
- Gzip size does not increase by more than 5 percent after replaced local code is removed, unless the change is documented and approved.

## Rollback

Pin the previous exact package version or revert the consumer migration, rebuild the remote, and issue a consumer patch release. Do not mutate or unpublish an existing package version.

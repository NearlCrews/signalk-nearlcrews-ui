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

Emitter Cannon and Synthetic Values intentionally share `skn-theme`. Pass only the current consumer's key, for example `<PanelRoot legacyThemeStorageKeys={["cl-theme"]}>`. The shared `signalk-nearlcrews-ui.theme.v1` value always wins when valid. Otherwise, `PanelRoot` copies the first valid legacy value into the shared key and uses Light without persisting an implicit preference when neither is valid.

The plugin should have a production remote-load check and at least one browser smoke test before replacing broad panel structure. Verify `typeof window.CSSScopeRule === "function"` in every supported deployment class. A passing developer-browser test does not establish support in an older kiosk or embedded WebView. Treat a failed check as an adoption blocker, retain the existing consumer UI, and update the deployment browser before migrating that consumer.

## Install a local artifact

From this repository:

```sh
npm run validate
npm pack --ignore-scripts
```

In the consumer:

```sh
npm install --save-dev --save-exact ../signalk-nearlcrews-ui/signalk-nearlcrews-ui-0.3.0.tgz
```

The dependency belongs in `devDependencies` because the consumer publishes compiled panel assets.

## Upgrading from 0.2.x

Version 0.3 changes the theme default, which is public behavior during the `0.x` series:

- A panel with no valid shared or legacy preference now starts in Light instead of Auto.
- The implicit Light default is not written to storage. An explicit Light selection is persisted normally.
- Existing valid shared and legacy preferences remain unchanged, including Auto.
- Values that `0.2` persisted as Auto cannot be distinguished from an explicit Auto selection, so they remain Auto after upgrading. Select Light, or clear both the shared preference and the consumer's legacy preference, when an operator wants the new default.
- Auto remains available and continues to follow explicit host themes before the operating-system preference.
- Separately bundled roots share explicit and migrated choices in memory when browser storage is unavailable or a write cannot be persisted.

Update browser tests that assume Auto is initially selected or initially owns roving focus. Test the fresh Light default first, then select Auto explicitly before asserting host or operating-system theme following.

Refresh consumer metadata that records the exact bundled dependency version, including third-party notices. Rebuild before approving any consumer bundle-size baseline; do not raise a ceiling solely to make the upgrade pass.

## Upgrading from 0.1.x

Version 0.2 changes interaction and layout contracts that are public during the `0.x` series:

- Loading buttons remain focusable and use `aria-disabled="true"` instead of the native `disabled` attribute. Update tests to assert the busy and ARIA states, then verify that pointer and keyboard activation remain suppressed.
- `Stack` is the sole source of external vertical rhythm. Wrap adjacent sections, fields, disclosures, and action bars in an explicit `Stack` instead of relying on component sibling margins.
- `SegmentedControl` exposes the radio group on its root element. Do not assert a fieldset implementation, and assert each disabled option or the group's `aria-disabled` state instead.
- Responsive component rules follow `PanelRoot` width. Test narrow embedded panels inside a wide viewport, not only narrow browser viewports.
- Required labels, legends, section titles, disclosure titles, collapsible titles, and metric labels reject whitespace-only content.
- Persistent field and checkbox errors default to `errorLive="off"`. Opt in to `polite` or `assertive` only when interaction-driven changes need announcement.
- `PanelRoot` adds a private content wrapper to support container queries. Consumer selectors must not depend on the package's internal DOM or class names.

Use `supportsNativeCssScope(window)` when a consumer must render a local compatibility message before mounting `PanelRoot`. Catch `UnsupportedBrowserError` only at a product-owned error boundary. Do not bypass the check with unscoped copies of the package CSS.

## Adopt in small steps

1. Wrap the panel in `PanelRoot` and pass its legacy theme key.
2. Replace local theme tokens and the theme toggle.
3. Add `Stack` around adjacent top-level surfaces, then replace buttons, segmented controls, sections, disclosures, fields, fieldsets, and inputs.
4. Replace blocking browser confirmation with `InlineConfirm`.
5. Replace status and banner presentation while preserving plugin-specific state.
6. Remove the replaced local styles and components.

Use `CollapsibleSection` only for heading-backed, controlled, summarized, or action-bearing content. Keep `Disclosure` for simple native details. Use `mountStrategy="unmount"` for expensive content that should exist only while open, `mountStrategy="lazy-retain"` when the first open should defer initialization but later closes must preserve state, or retain the default when form state and focus targets must exist before the first open.

When save or discard disables its initiating button, pass a ref to `ActionBar.statusRef` and focus that status after the operation. The consumer still owns save timing, status text, and focus-transfer timing.

When dismissing a banner removes the focused button, pass `dismissFocusRef` for the next logical focus target. The consumer still owns banner visibility and target selection.

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

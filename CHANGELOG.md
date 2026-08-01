# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
## [0.5.0] - 2026-08-01

This release introduces major composite widgets, modernizes React 19.2 foundations, and changes public APIs.

### Breaking

- `Disclosure` is removed and merged into `CollapsibleSection` (which gains `summaryVisibility`).
- `legacyThemeStorageKeys` and the volatile cross-version theme channel are removed. Theme resolves from a single key.
- `InlineConfirm` renames `rootRef` to `ref` and passes a reason (`"escape"` or `"cancel"`) to `onCancel`.
- `SegmentedControl` renames `rootRef` to `ref`, makes `value` optional (adding `defaultValue`), and scopes arrow keys by orientation.
- `ActionBar` changes `sticky` from a boolean to `"bottom"` | `"top"`.
- `BannerTone` is replaced by `StatusTone`, adding a `neutral` tone.
- `Button` props are now a discriminated union requiring `href` when `as="a"`.
- `CollapsibleSection` retain strategies pause effects using `<Activity mode="hidden">`.
- Every component that accepts a ref now declares it as an ordinary `ref` prop instead of wrapping in `forwardRef`. Emitted declarations change from `ForwardRefExoticComponent` to plain functions.
- An unresolved theme preference now resolves to Auto instead of Light. A fresh panel follows the host and the operating system rather than pinning itself to Light.
- `Button` no longer rewrites its accessible name while loading.
- `InlineConfirm` cancel now blocks activation through `aria-disabled` instead of `disabled`, so it keeps focus while busy.
- `Banner` no longer emits `aria-live` alongside a role that already implies a live region.

### Added

- `Accordion`, `DataGrid`, `Dialog`, `AlertDialog`, `EmptyState`, `Menu`, `Popover`, `RadioGroup`, `Switch`, and `ToastRegion` components, built on React Aria Components.
- `as`, `fullWidth`, and `iconOnly` props on `Button`.
- `name`, `disabled`, and `optionalLabel` on `LabeledField`, plus `descriptionId` and `errorId` for render-prop consumers.
- `error` and `errorLive` on `FieldGroup`.
- `month` and `week` types for `TextInput`.
- `live` announcement option for `StatusIndicator` and `Metric`.
- Polymorphic `as` rendering for `Stack`, `Cluster`, `Card`, and `MetricGrid`.
- `around` and `evenly` justify options for `Cluster`.
- `density`, `header`, and `footer` slots for `Card`.
- `unit` suffix slot for `Metric`.
- `choices` restriction and `onChange` observer for `ThemeToggle`.
- `defaultOpen`, `initialFocusRef`, `returnFocusRef`, `cancelVariant`, `scroll-into-view`, and `aria-keyshortcuts` on `InlineConfirm`.
- Landmark opt-out (`landmark={false}`) for `Section` and `InlineConfirm`.
- Public token scales for z-index, motion, and typography, plus per-theme dark and night elevation shadows.

### Fixed

- `RangeInput` left a stale fill after a native form reset. It now resynchronizes.
- `Checkbox` left a stale indeterminate state after a native form reset. It now resynchronizes.
- `Button` leaked `onKeyDown` activation to consumers while blocked by `ariaDisabled` or `loading`.
- `SegmentedControl` probed `getComputedStyle` on every keydown; it now uses `element.matches(":-dir(rtl)")`.
- `InlineConfirm` reattached a caller-supplied `ref` on every commit. A callback ref now attaches once per mount.
- Validation live regions are now mounted before their content arrives, ensuring reliable announcements.
- Forced colors erased the distinction between valid and invalid text inputs, checkboxes, and ranges. Invalid controls now carry a dashed outline.
- Night tone tokens were near-isoluminant, with danger and info at 1.00:1 against each other.
- Host global styles, including the Bootstrap Reboot that Signal K Admin bundles, reached unclassed consumer markup inside a panel and changed legend, heading, and block spacing.
- The reduced-motion reset applied to all consumer content through a universal selector, so a consumer could only preserve an essential animation with an `!important` declaration.
- Optional public props now admit `undefined`, so consumers compiling with `exactOptionalPropertyTypes` can pass a computed optional value.

### Changed

- ESLint uses `recommended-latest` to surface React Compiler diagnostics.
- Bundle size budget raised to 120 kB to accommodate React Aria Components composite widgets.
- The default font stack no longer names `Inter`, which the package does not ship and the host does not load.

## [0.4.1] - 2026-07-27

### Fixed

- Refreshed the x64 and ubuntu24 Playwright visual baselines so release verification passes on GitHub-hosted runners. The library is unchanged from 0.4.0.

## [0.4.0] - 2026-07-27

This version was tagged but not published to npm. Install 0.4.1 instead.

### Added

- An `indeterminate` prop on `Checkbox` that drives the native mixed state and its existing dash styling.
- Date and time entry through `TextInput` types `date`, `time`, and `datetime-local`.
- A filled range-track progress indicator on Chromium and WebKit, matching the existing Firefox fill.
- A hover affordance on enabled checkboxes and a smooth checkbox state transition.

### Changed

- Night theme hover, border, and muted-text tokens are brighter so hover feedback is visible on every Night surface while keeping WCAG AA text contrast and 3:1 boundary contrast.
- Banner dismissal now uses a raised-surface hover fill that stays visible in Dark and Night, where the shared hover color matched the banner background.
- Segmented-control options now use concentric corner radii inside the group border, and checkbox labels use the shared 650 label weight.
- Development tooling moved to ESLint 10 with the maintained `eslint-plugin-jsx-a11y-x` accessibility rules, jsdom 30, Testing Library jest-dom 7, and current releases of the remaining toolchain.
- Documented the browser-only rendering model and the Chromium 120 floor for right-to-left `:dir()` mirroring.

### Fixed

- Loading buttons no longer dim their label and spinner below readable contrast while a busy action runs.
- Confirmation regions focus their Cancel action reliably under React StrictMode remounts and no longer steal focus back to the trigger when the user moved focus away before the confirmation closed.
- Sticky action bars blur their backdrop on Safari 17.4 through 17.6 via the prefixed backdrop filter.
- Button spinners keep their rotating gap in Windows High Contrast forced-colors mode.
- Action-bar status, inline-confirmation actions, and field-group actions now carry the shared overflow guards used by their sibling layouts.
- Removed duplicate and dead style declarations, consolidated all banner rules into one module, and moved the action-bar status focus rule beside its component styles while retargeting it to `:focus-visible`.

## [0.3.0] - 2026-07-17

### Added

- Dedicated Windows package validation and fresh-profile browser coverage for the Light default.
- In-page theme synchronization for separately bundled roots when browser storage is unavailable.

### Changed

- Panels without a valid shared or legacy preference now use Light without persisting an implicit choice. Existing stored preferences, including Auto, remain unchanged.
- Classic and ESM Module Federation fixtures now derive their required React version from the package peer dependency.
- Updated Vite and compatible transitive development dependencies to their current patch releases.

### Fixed

- Package validation now invokes the declared `attw` JavaScript entry point through Node instead of launching platform-specific command shims.
- Later-mounted panel roots no longer replace an in-memory explicit theme with the implicit fallback when storage is unavailable.

## [0.2.0] - 2026-07-15

### Added

- Checkbox validation messages, configurable field error announcements, and consistent invalid range styling.
- `loadingLabel`, banner tone labels, dismissal focus destinations, per-instance theme labels, and localized inline-confirmation fallbacks.
- The `lazy-retain` collapsible mount strategy, semantic metric names, native attribute and ref support for composite primitives, and a dedicated section-action wrapper.
- The public `--snui-color-interactive-hover` token, `supportsNativeCssScope`, and `UnsupportedBrowserError`.

### Changed

- Loading buttons now remain focusable with `aria-disabled` while suppressing repeat pointer and keyboard activation.
- Responsive rules now follow panel width through container queries, coarse target sizing follows any coarse pointer, and pseudo-elements inherit border-box sizing.
- Segmented controls use direct radio-group semantics and direction-aware arrow keys. Disclosure and collapsible carets mirror in right-to-left layouts.
- `Stack` is the sole owner of external vertical rhythm between shared surfaces. Required semantic names now reject whitespace-only content.
- Banners include a visible, non-color severity cue, preserve explicit `aria-live="off"`, and expose their root ref.

### Fixed

- Light-theme hover feedback is visibly distinct from raised surfaces.
- Field-group actions retain logical reading order when narrow panels reflow.
- Invalid range tracks no longer lose their danger color to later base track rules.

## [0.1.0] - 2026-07-15

### Added

- Accessible React form, feedback, layout, disclosure, metric, theme, and confirmation primitives.
- Scoped Light, Dark, and Night themes with public color, spacing, typography, radius, sizing, and transition tokens.
- Classic and ESM Module Federation fixtures, strict CSP coverage, and Chromium, Firefox, WebKit, and mobile browser tests.
- Biome formatting and linting, type-aware ESLint, Knip dead-code checks, package audits, type validation, and bundle limits.
- GitHub repository policy, protected npm publication workflow, security configuration, and migration guidance.

[Unreleased]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/releases/tag/v0.1.0

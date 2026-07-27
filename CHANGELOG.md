# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-07-27

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

[Unreleased]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/releases/tag/v0.1.0

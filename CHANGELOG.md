# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.1] - 2026-08-22

### Changed

- Adoption guidance now records that the Signal K Admin dependency inventory declares a wider React peer range than this package requires. A consumer keeps its own React and React DOM development dependencies and its Module Federation share requirement at `^19.2.0` rather than deriving them from the inventory.

### Fixed

- A viewport-bottom `ActionBar` no longer scrolls the panel while a pointer is pressed. The first click on a control the docked bar overlaps now reaches that control instead of dispatching on an ancestor after the control moved out from under the pointer. Keyboard and programmatic focus keep immediate clearance, and a clearance deferred by a press runs as soon as the press ends.
- Viewport-bottom docking measurement now settles within a bounded number of frames when a docked and an undocked geometry alternate, so one focus change can no longer leave the bar moving on every frame.

## [0.8.0] - 2026-08-19

### Breaking

- `DataGrid.columns` now requires a readonly array instead of a generic iterable. Arrays provide replay-safe column data across React StrictMode and concurrent render retries. Consumers must replace generators, sets, and other iterables with an array, then replace that array when the column data changes.
- `Dialog`, `Menu`, and `Popover` now throw outside an owning `PanelRoot` instead of falling back to `document.body`. Overlays and toasts also reject nested portal providers that redirect them away from their exact owning root. This enforces the style, theme, CSP, portal, and version-isolation boundary. `ToastRegion` has required `PanelRoot` since 0.7.0.

### Added

- A packaged API reference covering entry points, package-specific props, ref targets, defaults, public values, and localization hooks.
- Blocking documentation checks for Markdown structure, spelling, and repository-local links and anchors.
- Read-only Signal K host-drift and locked React Aria dependency-contract checks.
- Per-file coverage floors that complement the existing aggregate thresholds and prevent new source files from hiding severe test gaps.
- Browser-console error capture, visual-baseline family enforcement, and maintained Light, Dark, Night, hover, active, reflow, right-to-left, collapsible, and forced-colors coverage.

### Changed

- Consumer guidance now documents the Popover trigger contract, schema-form boundary, Night theme status cues, token-scoping exception, toast layer ordering, and current adoption recipes.
- Component guidance now correctly describes `loadingLabel` as a busy-state description and `CollapsibleSection` as a heading button with a named region.
- The `tokens.css` guidance now distinguishes its lack of React execution from the package's install-time dependency and peer-dependency graph.
- Popovers validate semantic interactive triggers, and labeled fields validate labelable controls at runtime. Optional public props also explicitly admit `undefined` for consumers using `exactOptionalPropertyTypes`.
- Package validation now rejects stale lockfile roots and canonical metadata drift, checks the API reference's release line, enforces release metadata, and permits only maintained documents in the tarball.
- Release publication now verifies an annotated tag's peeled commit and binds every required exact-commit check to the newest run of its trusted CI or CodeQL workflow before publishing the verified tarball.
- Consumer integration guidance now distinguishes Webpack host-share containers from the host-global React shims required by Signal K's current Vite and ESM contract, records the corresponding Signal K 2.24 and 2.27 host floors, and documents current schema-form, theme-marker, and stylesheet-nonce limits.
- Repository hardening now includes workflow security auditing, scheduled external-document link checks, and export-map-wide bundle and federation validation.
- Compatible development dependencies were refreshed to current patch releases.

### Fixed

- `DataGrid` dynamic headers no longer consume one-shot column data before React Aria renders it, and virtualized zebra rows now match direct-row striping, including rows with functional styles.
- Checkbox and secret-input refs remain stable across rerenders, while segmented controls reject empty option lists, blank labels, and duplicate values.
- Toast regions now isolate viewport updates, multiple mounted queues, and overflow behavior within one panel-owned host. Queue overflow prefers to preserve focused and sticky-critical notifications while remaining bounded. Oversized popovers remain scrollable within the available viewport.
- Viewport-bottom action bars retain visible focus when focus moves, when a viewport resize docks the bar, and when nested scroll containers have limited safe movement. Forced-colors mode also preserves focus rings and readable built-in and consumer-supplied banner actions.

## [0.7.1] - 2026-08-12

### Added

- `signalk-nearlcrews-ui/tokens.css`, a framework-neutral stylesheet carrying the palette and foundation tokens for panels that do not use React. Put the public `snui-tokens` class on a panel root and set `data-snui-theme` to pick a theme. See the design contract for what the class guarantees.
- `npm run host-contract`, which checks the package against the Signal K Admin host dependency declaration recorded in `tests/host-contract.baseline.json`. See the host dependencies section of the README.

### Changed

- The React and React DOM peer ranges narrowed to `^19.2.0`. Every stable React 19 release keeps the support it had; the previous `>=19.2.0 <20.0.0` also accepted React 20 prereleases, which the host dependency declaration excludes.

## [0.7.0] - 2026-08-12

### Breaking

- Composite, data-grid, form-composite, and overlay exports moved from the package root to `/composites`, `/data-grid`, `/forms`, and `/overlays`. Consumers must update those import paths. The package root now contains the lightweight panel, layout, field, feedback, theme, compatibility, and formatting primitives.
- `DataGrid.ref` now resolves to the stable outer `HTMLDivElement` in both direct and virtualized modes. Consumers that used table-specific ref operations must query the descendant grid element instead.
- React DOM `>=19.2 <20` is now a peer dependency because in-root overlays use its portal API. Module Federation consumers must resolve both React and React DOM from the Signal K Admin host as singletons, while continuing to bundle this package into each remote.
- `ThemeChoice` and `THEME_CHOICES` add `"system"`. Auto now follows an explicit Bootstrap, CoreUI, or legacy `.dark-mode` host theme and otherwise falls back to Light. Select System when the panel should follow `prefers-color-scheme` without an explicit host theme.
- `AlertDialog` requires a non-empty `cancelLabel` and always renders an enabled cancel action before supplemental `actions`. `onCancel` runs before close, `cancelVariant` defaults to `secondary`, and the dialog is not dismissible through Escape or the scrim by default.
- `ToastRegion` must render inside `PanelRoot`. It now throws outside that boundary instead of portaling to `document.body`, where version-scoped styles and theme tokens cannot apply safely.

### Added

- Focused `/composites`, `/data-grid`, `/forms`, and `/overlays` package entry points.
- `SecretInput`, with controlled or uncontrolled reveal state, localized Show and Hide labels, optional trailing content, and pointer-safe caret and selection preservation.
- `UnsupportedBrowserNotice`, a standalone alert consumers can render instead of `PanelRoot` after `supportsNativeCssScope(window)` fails.
- `formatRelativeAge`, which formats a nonnegative elapsed age in milliseconds through `Intl.RelativeTimeFormat` with locale, numeric, style, and fallback options.
- The `"viewport-bottom"` `ActionBar.sticky` mode. It aligns to the `PanelRoot` column, accounts for visual-viewport occlusion and safe-area insets, reserves flow space, returns to natural flow at its anchor, and stops docking when the panel leaves the viewport.
- Native form participation for `Switch` through `form`, `name`, `readOnly`, `required`, and `value`.
- The public `--snui-font-family-mono` token for paths, identifiers, and other fixed-width consumer content.

### Changed

- Large `DataGrid` collections now use React Aria `Virtualizer` and `TableLayout` instead of TanStack Virtual. The virtualizer observes variable row heights while preserving complete-collection keyboard navigation and accessibility metadata.
- Dialogs honor the visual viewport and safe-area insets. Menus, popovers, and nested dialogs use token-driven overlay layers so an overlay opened from a dialog stays above its owner.
- Toast positioning honors safe-area insets. Exit removal follows the actual transition, uses the public transition token for its fallback timer, and completes immediately when reduced motion is requested.
- Development dependencies and compatible runtime dependencies were refreshed to current releases. React Aria and React Aria Components remain bundled with each consumer remote rather than shared through Module Federation.

### Fixed

- Disabled, loading, and unsafe anchor-form buttons no longer retain a navigable `href`.
- A disabled `SegmentedControl` no longer contributes its hidden value to native form submission.
- The viewport-bottom action bar now works in the Signal K Admin `.app-body` layout, whose vertical overflow is unconstrained, and stays aligned across Chromium, Firefox, WebKit, and mobile Chromium.

## [0.6.2] - 2026-08-04

### Fixed

- Anchor-form buttons now make dangerous and unknown URL schemes inert while preserving HTTP, HTTPS, mail, telephone, fragment, query, and relative destinations.

### Changed

- Accordion API documentation now states that child order must remain stable after the first render because open state is positional.
- Refreshed compatible development dependencies.

## [0.6.1] - 2026-08-02

### Fixed

- `--snui-color-scrim` was emitted by every theme block but missing from `PUBLIC_TOKEN_NAMES`, so the scrim token introduced in 0.6.0 never appeared in token enumeration.
- The z-index scale (`--snui-z-sticky`, `--snui-z-overlay`, `--snui-z-modal`, and `--snui-z-toast`) was declared public in 0.5.0 but entered neither `PUBLIC_TOKEN_NAMES` nor the design contract. All five tokens are now listed in both, `FoundationTokenName` includes them, and a stylesheet coverage test fails when a defined token is neither public nor explicitly private.

## [0.6.0] - 2026-08-02

### Fixed

- Virtualized `DataGrid` rows kept only `aria-rowindex`, so real browsers dropped row, row group, and gridcell roles once the virtualized grid restyled table layout. Explicit roles are now stamped on row groups, header and body rows, and cells.
- A mounted panel reset to Auto when another document wrote an unrecognized value to the shared theme key, as a plugin on a different library version can. Unrecognized values are now ignored, and only a genuine clear returns the panel to Auto.
- `FieldError` emitted `role` alongside `aria-live`, double announcing on some screen readers. It now emits exactly one of the pair, matching the design contract.
- `FieldGroup` wired a group error only through `aria-describedby`. The fieldset now also carries `aria-errormessage` and `aria-invalid` while an error is present, matching `RadioGroup` and `LabeledField`.
- A toast's live region wrapped the whole card, so the dismiss button's accessible name joined the announcement. The region now scopes to the toast text.
- Toast queues grew without bound when sticky toasts (`duration: 0`) piled up. A queue now holds at most five toasts and drops the oldest beyond that.

### Added

- `SemanticTone` and `OverlayOpenState` are exported from the package root, so the `ToastContent` tone slot and the shared overlay open-state props can be named directly.
- `--snui-color-scrim` token, resolved per theme, so Dark and Night dialogs no longer sit on the light-theme scrim color.

### Changed

- `SegmentedControlProps.onChange` is now optional, matching `RadioGroup`, `Switch`, and `Checkbox`.
- `Menu`, `Dialog`, and `Popover` open-state props now share the exported `OverlayOpenState` interface, and the `Dialog` trio admits explicit `undefined` like every other optional public prop.
- `BannerLive` is now an alias of `AnnouncementMode`; the union is unchanged.
- Label defaults, tone announcements, overlay open-state props, and description-id resolution moved into shared helpers, and focus-ring, disabled, and pressed-fill declarations into shared style fragments, replacing per-component copies.

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
- Shared panel behavior moved into single primitives: overlay portal readiness, field error regions, live-region roles, tone labels, ref composition, and reduced-motion detection. Repeated style declarations are emitted from one source, and the overlay stylesheet is split into per-component modules. The emitted declarations for these internal modules changed; the package entry point `dist/index.d.ts` and all 156 exported names are unchanged.

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

[Unreleased]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.8.1...HEAD
[0.8.1]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.6.2...v0.7.0
[0.6.2]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.4.1...v0.5.0
[0.4.1]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/NearlCrews/signalk-nearlcrews-ui/releases/tag/v0.1.0

# UI and UX Improvement Plan

Status: Stage 0 and Stage 1 delivered in 0.5.0. Stage 2 onward pending.
Last revised: 2026-07-31, against package version 0.5.0.
Findings that informed this revision are recorded in `improvement-findings.md`.

This roadmap covers improvements to the `signalk-nearlcrews-ui` React component library. It is a repository planning document, not a published package contract or release commitment. Target versions will be assigned only after scope, compatibility, and consumer evidence are complete.

Publishing to npm, creating a release tag, or creating a GitHub Release requires separate explicit approval under the repository release policy.

## Goals

- Modernize the public API for React 19 without changing runtime behavior accidentally.
- Standardize reusable, accessible presentation across NearlCrews Signal K administration panels.
- Add public primitives only when at least two administration-panel consumers demonstrate the same need.
- Preserve scoped styles, theme isolation, Module Federation behavior, browser compatibility, and the package-size budget.
- Keep public APIs controlled, localization-ready, and independent of plugin business logic.

## Package Boundary

The library may own:

- Theme tokens and scoped component styling
- Accessible names, focus states, and keyboard interaction
- General-purpose form controls and layout
- Presentational feedback and confirmation surfaces
- Coarse-pointer sizing, responsive behavior, reduced motion, and forced-colors behavior

The library must not own:

- Signal K requests, paths, sources, unit-preference lookup, or provider detection
- Unit selection, display conversion, or SI conversion
- Configuration schemas, reducers, persistence, or save orchestration
- Save state, save timing, retry policy, or plugin restart detection
- Plugin-specific validation, status interpretation, or workflows
- Binnacle-specific chartplotter framing, chart interaction, or application navigation

## Decisions From Review

### React Form State

Do not add `ActionForm` or a `SubmitButton` coupled to `useFormStatus` in the current package architecture.

`useFormStatus` comes from `react-dom`, while this package intentionally requires only React as a peer and must not bundle React DOM. Signal K Admin configuration saves also do not expose an awaited persistence result that React form pending state could represent reliably. Consumers will continue to supply the controlled `loading`, `aria-busy`, and status state that existing primitives render.

Any future React DOM integration requires a separate boundary decision covering peer dependencies, externalization, Module Federation sharing, fixtures, package documentation, and consumer migrations.

### Units

Do not add a `UnitField` that fetches server preferences or converts values. Document and test a composition recipe using `LabeledField`, `InputGroup`, `InputGroupControl`, `NumberInput`, and `InputGroupAddon`.

The consumer must:

- Obtain the effective display unit from supported Signal K metadata or APIs.
- Keep configuration and stored values in SI.
- Convert to the display value at render time.
- Convert accepted input back to SI at commit time.
- Fall back visibly to a labeled SI value when optional unit metadata is unavailable or malformed.
- Avoid local metric or imperial toggles unless the consumer already has a documented exception.

If repeated consumer markup still justifies a component after the evidence phase, it may accept an already converted display value, a visible unit label, and caller-owned commit behavior. It must not select units, convert values, clamp domain values, or decide draft policy.

### Save Feedback

Do not add a stateful `SaveStatus`. Consumers have incompatible lifecycles that include different combinations of validation, dirty state, initial configuration, persistence failure, plugin restart, retry, timeout, and transient success.

Provide a documented composition recipe using `ActionBar`, `StatusIndicator`, `Banner`, and `Button`. Consumers remain responsible for state, labels, timing, focus transfer, live-region policy, and retry behavior.

### Target Sizing

Preserve the current density contract unless a separate compatibility proposal is approved:

- Desktop controls have a 40-pixel minimum height.
- Devices with any coarse pointer use a 44-pixel minimum height.

Forty-four by forty-four CSS pixels corresponds to WCAG 2.5.5 Target Size (Enhanced), Level AAA. WCAG 2.5.8 Target Size (Minimum), Level AA, uses 24 by 24 CSS pixels with defined exceptions. A universal 44-pixel policy would be an intentional marine-usability and density change, not a routine accessibility correction.

Tests must measure both dimensions for square and icon-only targets. Inline text links and user-agent-owned controls retain the applicable standards exceptions.

### Focus and Night Theme

Do not make Night focus indicators thinner or dimmer. Continue to use the public focus color token, a visible two-pixel outline, and at least 3:1 contrast against adjacent surfaces. Night behavior must remain red-preserving through tokens rather than theme-name checks in components.

The public theme name is `night`.

### Forced Colors and Style Organization

Treat forced-colors work as a gap audit because controls, selected segmented options, status indicators, and browser snapshots already have coverage.

- Preserve native forced-color adjustment by default.
- Use system colors and `forced-color-adjust: none` only when a state distinction must be reconstructed.
- Keep component-specific accessibility rules with their component style modules.
- Extract the visually hidden rule to `utilities.ts` only when doing so improves ownership without changing the cascade.
- Put only genuinely cross-cutting focus, reduced-motion, or forced-colors rules in an `a11y.ts` module.
- Do not rely on loading an accessibility module last as the accessibility contract.

### Existing Layout Primitives

Do not introduce another stat-grid abstraction without first evaluating `MetricGrid` and `Metric`.

A semantic detail-list candidate must preserve `dl`, `dt`, and `dd` relationships, use tabular figures where appropriate, keep values and units adjacent, wrap long content, and reflow at a 320-pixel panel width.

Navigation and action rows require separate semantics:

- Navigation uses a native link or button and `aria-current` for the current destination.
- Toggle rows use the appropriate native control or `aria-pressed` behavior.
- Multi-action rows must not nest interactive elements.
- Selection, current location, toggle state, and active processing state must not be represented as interchangeable concepts.
- State must never rely on color alone.

## Delivery Stages

### Stage 0: Consumer Evidence and Boundary Decisions

The consumer inventory is complete. All six React consumers exist, each has a React administration
panel, and each pins this package at an exact version. Adoption is universal, so later stages must not
describe consumer discovery as outstanding work.

| Consumer                          | Panel entry                              |
| --------------------------------- | ---------------------------------------- |
| `signalk-crows-nest`              | `src/panel/PluginConfigurationPanel.tsx` |
| `signalk-nmea2000-emitter-cannon` | `src/panel/components/`                  |
| `signalk-openrouter-companion`    | `src/configpanel/components/`            |
| `signalk-synthetic-values`        | `src/configpanel/components/`            |
| `signalk-virtual-weather-sensors` | `src/configpanel/components/`            |
| `signalk-chart-locker`            | `src/panel/PluginConfigurationPanel.tsx` |

Re-check adoption versions before each stage begins. For each candidate, record:

For each candidate, record:

- At least two distinct consumer packages, and the call sites within each
- The duplicated markup, styles, and behavior
- The common semantic and interaction contract
- Incompatible variants and explicit non-goals
- The package-boundary rationale
- Expected code removal in each pilot consumer
- Expected uncompressed and gzip bundle impact

Reject or defer a candidate when it is app-specific, when consumer policies are incompatible, or when adapters and overrides would approach the code removed.

Deliverable: a candidate matrix with `proceed`, `recipe only`, `consumer local`, or `defer` status.

### Stage 1: React 19 Ref Migration

Delivered in 0.5.0. `forwardRef` is gone from `src`, every public prop contract declares a typed `ref`,
and `RangeInput`, `Checkbox`, and `PanelSurface` keep their throw-on-unresolved imperative handles. The
behavior baseline was captured in `tests/unit/refs.test.tsx` before the migration and passes unchanged
after it. `tests/declarations.baseline.txt`, `tests/types/refs.test-d.ts`, and
`fixtures/consumer` now guard the emitted contract. The declaration change is recorded in
`CHANGELOG.md` and `docs/migration.md`.

The original scope is retained below as the record of what the migration covered.

Scope:

- `Button`
- `Banner`
- `FieldGroup`
- `TextInput`
- `NumberInput`
- `RangeInput`
- `Select`
- `Textarea`
- `Checkbox`
- `PanelRoot`

Requirements:

- Add an accurately typed `ref` prop to every public prop contract.
- Preserve native element types for object and callback refs.
- Preserve `RangeInput`, `Checkbox`, and `PanelRoot` internal ref composition.
- Preserve callback-ref cleanup, thrown-ref cleanup, replacement, and unmount behavior.
- Compare emitted declarations before and after the change.
- Add a packed-consumer TypeScript fixture that compiles ref usage against `dist`. This fixture is a shared prerequisite, not a Stage 1 deliverable: the Types and refs acceptance row requires packed declaration compilation for every changed primitive, so Stage 2 cannot begin without it.
- Classify the declaration change under the semantic-versioning policy before assigning a target version.

Definition of done:

- Runtime and type tests cover every migrated component.
- Existing component behavior and DOM semantics remain unchanged.
- Packed-package, bundle, and federation checks remain green.
- Migration guidance identifies any public declaration change.

### Stage 2: Recipes and Proven Presentation Gaps

Add documentation recipes first:

1. Numeric input with a visible unit while conversion remains consumer-owned.
2. Save, discard, validation, and transient success feedback with managed focus.
3. Permanent live-region mounting when a status change must be announced reliably.

Then evaluate only the presentation gaps supported by Stage 0 evidence:

- A semantic detail list
- A native navigation-card row
- A flat multi-control list row
- An extension to `Metric` for a separately styled visible unit, if composition is insufficient

Each component must use native semantics, accept localized content, expose native attributes, and avoid owning domain state.

### Stage 3: Overlay Feasibility

Do not commit to public overlay APIs until these decisions are documented:

- Native Popover API, native dialog, internal positioning, or a justified dependency
- Nonmodal popup, action menu, modal dialog, and nonmodal panel semantics
- Rendering inside the owning versioned `PanelRoot`
- An explicit in-root overlay host if inline rendering is insufficient
- No default portal to `document.body`
- Positioning across scrolling ancestors, viewport edges, zoom, RTL, and `visualViewport` changes
- Initial focus, focus containment where applicable, focus restoration, and focus-not-obscured behavior
- Outside interaction, Escape behavior, nested overlays, and one topmost-dismissal stack
- Reduced motion, safe-area insets, virtual keyboards, and 320-pixel reflow
- CSP nonce behavior, owner-document behavior, nested package versions, and unmount cleanup
- Overlay surface, scrim, border, shadow, z-order, panel-size, pill-radius, and numeric-typography tokens
- Bundle impact against the 24 KiB gzip ceiling, which currently has roughly 40 percent headroom and will therefore not be the deciding gate
- If a dependency is proposed, its license, its effect on `npm run audit:runtime`, third-party notices in this repository, and its effect on the federation share scope. The package has no runtime `dependencies` today, and adding the first one changes its supply-chain posture for every pinned consumer

Public menu roles are allowed only when the complete menu keyboard contract is implemented. A generic popup containing ordinary controls must not use menu semantics.

Deliverable: an architecture decision and tested foundation with no exported component API unless the evidence and budget gates pass.

### Stage 4: Overlay Primitives

If Stage 3 passes, implement in this order:

1. `AnchoredMenu`
2. `OverflowActions`

`OverflowActions` must depend on the shared anchored positioning, dismissal, and focus behavior. It must keep a visible primary action outside the overflow menu and accept localized labels.

Treat `SlideOver` as a separate scope decision. Do not port Binnacle's chartplotter shell wholesale. Proceed only if two React administration consumers require the same host-contained panel behavior without viewport, chart, phone-minimization, or application-navigation assumptions.

If approved, a slide-over must define:

- Modal and nonmodal modes without conflating them
- A named header, one scrolling body, and an optional pinned footer
- Correct inertness and focus trapping only in modal mode
- Scroll padding so sticky chrome does not obscure focused content
- Focus restoration and topmost Escape dismissal
- Host-contained sizing and stacking
- Safe-area, virtual-keyboard, reduced-motion, and narrow-panel behavior

### Stage 5: Consumer Pilots

Install a locally packed exact version into at least two representative administration-panel consumers. Select pilots based on the Stage 0 evidence rather than convenience.

Each pilot must:

- Remove the duplicated local implementation.
- Preserve SI storage, server unit preferences, validation, save behavior, and provider behavior.
- Build a production Module Federation remote without React or React DOM implementations.
- Load that remote in the supported Signal K Admin host.
- Pass a complete save and validation flow.
- Verify Light, Dark, Night, and Auto.
- Verify keyboard behavior, focus visibility, Axe, forced colors, reduced motion, RTL, 320-pixel reflow, and coarse-pointer sizing.
- Record production bundle and gzip changes.
- Update exact dependency metadata and third-party notices.

Do not raise a consumer bundle ceiling solely to make adoption pass.

### Stage 6: Documentation and Release Preparation

For every approved public API change, update together:

- `README.md`
- `docs/design-contract.md`
- `docs/migration.md`
- `CHANGELOG.md`
- The compatibility table
- Package version metadata when a release is approved
- Browser fixtures and visual baselines

Release preparation must include formatting, linting, Knip, type checking, unit coverage, dependency audits, compilation, package validation, bundle checks, federation fixtures, the full browser matrix, and real consumer proof.

Publication remains a separate action that requires explicit final approval.

## Acceptance Matrix

Every new or changed public primitive must satisfy the applicable rows.

| Area           | Required acceptance                                                                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public API     | Export review, native attribute forwarding, localized labels, semantic-versioning classification, and migration notes                                                                                                                           |
| Types and refs | Type checks, object refs, callback refs, replacement, cleanup, unmount, and packed declaration compilation                                                                                                                                      |
| Accessibility  | Native semantics, accessible names, keyboard behavior, initial and restored focus, live-region policy, Axe, and no color-only state                                                                                                             |
| Themes         | Auto, Light, Dark, and Night behavior, plus token contrast checks                                                                                                                                                                               |
| Forced colors  | Boundaries, selected states, invalid states, disabled states, focus, overlays, and scrims                                                                                                                                                       |
| Motion         | Reduced-motion behavior for every transition and animation                                                                                                                                                                                      |
| Layout         | Panel-container queries, 320-pixel reflow, long and unbroken content, direction-independent RTL behavior on every supported engine, `:dir()` cosmetic mirroring only where supported, zoom, virtual keyboards, safe areas, and no page overflow |
| Targets        | Coarse-pointer sizing and width plus height checks for square and icon-only controls                                                                                                                                                            |
| Overlays       | Positioning, collision, scroll, resize, dismissal stack, focus containment, focus return, CSP, owner document, nested versions, and cleanup                                                                                                     |
| Browsers       | Chromium, Firefox, WebKit, and mobile Chromium                                                                                                                                                                                                  |
| Packaging      | `publint`, Are the Types Wrong, npm pack inspection, 24 KiB gzip ceiling, React externalization, and no React DOM implementation                                                                                                                |
| Federation     | Classic and ESM production builds and runtime checks with the host-equivalent React share scope                                                                                                                                                 |
| CI             | Supported Node lines, Windows package validation, and x64 plus ARM64 browser lanes                                                                                                                                                              |
| Consumers      | At least two packed-artifact pilots and a production remote-load check in Signal K Admin                                                                                                                                                        |
| Visual review  | Light, Dark, Night, forced-colors, narrow-layout, and focused-interaction snapshots inspected on supported architectures                                                                                                                        |

## Candidate Disposition

| Candidate                            | Current disposition                                                                                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 19 ref-as-prop migration       | Proceed as a separate compatibility-reviewed change                                                                                                  |
| `ActionForm`                         | Do not implement                                                                                                                                     |
| `SubmitButton` using `useFormStatus` | Do not implement under the current React-only runtime contract                                                                                       |
| Stateful or converting `UnitField`   | Do not implement                                                                                                                                     |
| Numeric-with-unit composition recipe | Proceed. The separate-unit composition exists in one consumer, so the recipe is the deliverable and a component is not                               |
| Stateful `SaveStatus`                | Do not implement                                                                                                                                     |
| Save-feedback composition recipe     | Proceed. Six consumers, six different transient-success policies, and contradictory live-region policies confirm the refusal of a stateful component |
| Detail-list primitive                | Recipe only. Four consumers show the pattern, but three already use `MetricGrid` and `Metric`, and no consumer ships `dl` markup                     |
| Second stat-grid primitive           | Do not implement; evaluate `MetricGrid` first                                                                                                        |
| Navigation-card row                  | Reject. Zero consumers, no `aria-current` anywhere, and these panels have nowhere to navigate to                                                     |
| Flat multi-control row               | Recipe only. `Cluster` and `CollapsibleSection` already cover it, and two consumers hold no local row code                                           |
| `AnchoredMenu`                       | Feasibility first                                                                                                                                    |
| `OverflowActions`                    | Depends on an approved `AnchoredMenu` foundation                                                                                                     |
| `SlideOver`                          | Defer pending a separate scope decision and two administration consumers                                                                             |
| Universal 44-pixel target floor      | Preserve the current 40-pixel desktop and 44-pixel coarse-pointer contract                                                                           |
| Thinner Night focus ring             | Do not implement                                                                                                                                     |
| Forced-colors work                   | Perform a gap audit before changes                                                                                                                   |
| `utilities.ts`                       | Optional behavior-preserving extraction                                                                                                              |
| Catch-all late `a11y.ts` overrides   | Do not implement                                                                                                                                     |

## Stop Conditions

Stop or narrow a candidate when:

- Consumers require incompatible variants.
- Adapters and overrides approach the amount of code removed, measured as net lines deleted across all pilot consumers versus lines added in adapters, wrappers, and style overrides. Stop when the ratio exceeds 1 to 2.
- The shared component begins owning plugin data or business behavior.
- A portal or dependency weakens style isolation or host compatibility.
- Bundle size, accessibility, browser reliability, or consumer release independence becomes worse. Release independence fails when a consumer can no longer ship a panel change without a coordinated release of this package.
- The feature is supported by only one consumer package, or is justified by a non-React or single-application codebase. `signalk-binnacle` is Svelte, does not depend on this package, and therefore cannot appear in the Stage 0 inventory; a candidate justified by it requires its own boundary decision rather than a stop condition.

When a component is rejected, retain the shared tokens, accessibility guidance, composition recipe, and verification approach that consumers can use locally.

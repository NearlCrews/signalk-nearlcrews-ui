# Improvement Findings

Status: Findings, dated 2026-07-31, against version 0.4.1.

Companion to `improvement-plan.md`. The plan decides what the package may own and in what order. This document
records what the current code, tooling, documentation, and consumers actually show, so plan stages start from
measured facts rather than assumptions.

Every item cites a file and a line. Items that contradict a binding decision in the plan are quarantined in their
own section. Claims that were examined and did not hold are listed at the end so they are not reproposed.

## 1. Already applied

These landed while preparing this document. They are recorded because they change the toolchain contract.

1. **TypeScript 7 adopted side by side with TypeScript 6.** `package.json:100,118` now reads
   `"@typescript/native": "npm:typescript@^7.0.2"` and `"typescript": "npm:@typescript/typescript6@^6.0.2"`.
   TypeScript 7.0.2 is the current release, but typescript-eslint 8.65.0 refuses to load under it, which had left
   `lint:eslint`, and therefore `validate`, `release:check`, and `prepack`, failing outright. The alias gives
   `tsc` the native compiler while the bare `typescript` specifier that typescript-eslint, ts-loader, and knip
   import resolves to the TypeScript 6 API. Declaration output was compared first: all 35 emitted `.d.ts` files
   are byte identical between 6.0.3 and 7.0.2, so the published contract is unchanged. Type-check went from
   5.82 seconds to 0.72 seconds. All 20 platform binaries are recorded in the lockfile, so `npm ci` still
   resolves on the Windows and ARM64 lanes, and `@typescript/native` declares no install scripts.
2. **A cross-compiler check was added.** `type-check:ts6` runs `tsc6` over the root project and the build project,
   and `validate` runs it alongside `type-check`. It compares reported diagnostics, not emitted declarations.
3. **`biome.json:2` schema raised to 2.5.6** to match the installed Biome.
4. **`.remember/` added to `.prettierignore` and to the ESLint ignores.** It is git ignored through a nested
   `.gitignore` that neither Prettier nor ESLint flat config reads, so local scratch files failed `format:check`
   and then crashed the ESLint project service.

Remaining toolchain note: Dependabot does not bump aliased dependency ranges, so both TypeScript entries need
manual review. Collapse them to a single `typescript` dependency once typescript-eslint supports TypeScript 7,
and re-verify declaration output across that collapse.

## 2. Correctness defects

1. **`InlineConfirm` reattaches a callback ref on every commit.** `src/components/InlineConfirm.tsx:73-76` calls
   `useImperativeHandle(rootRef, () => containerRef.current)` with no dependency array, so the layout effect
   re-fires on every commit: a consumer callback ref receives `null` and then the element, repeatedly. Merge
   `containerRef` and `rootRef` into a single callback ref on the section rather than adding `[]` deps, because
   empty deps would strand a stale element when `open` goes false.
2. **`Checkbox` leaves a stale `indeterminate` DOM property.** When the prop goes from a boolean to omitted, the
   DOM property is never cleared, so the control keeps rendering mixed until user interaction or unmount.
3. **`Disclosure` forwards a controlled-looking `open` it never syncs.** `src/components/Disclosure.tsx:6-10`
   inherits `open` from `DetailsHTMLAttributes`, where it sets initial state only, while `CollapsibleSection`
   ships a genuinely controlled `open` plus `onOpenChange` pair. The two read alike and diverge after the first
   user toggle. Either reassert the prop on change, or remove it in favor of `defaultOpen`. Removal is a public
   API change and needs classifying first.
4. **Theme sync cannot distinguish an absent shared value from an unrecognized one.**
   `src/theme/context.tsx:35` collapses both to `null`, so a storage event carrying an unrecognized value drops
   mounted panels to Light and clears the volatile fallback used when a storage write failed
   (`src/theme/context.tsx:140-143`). Keep the current theme instead, and reserve the reset for a genuine clear.
   `tests/unit/theme.test.tsx:391-425` covers invalid values only at mount, where the code correctly bails.
   The broadcast-event path is not an independent trigger: it falls through to the storage read.

## 3. Accessibility

1. **Live regions are mounted at the same moment as their content.** `src/components/LabeledField.tsx:124-133`
   and `src/components/Inputs.tsx:248-257` render the error container only when an error exists, so the region
   does not exist before the message arrives and will not announce reliably. Render the container with its `role`
   and `aria-live` whenever `errorLive` is not `"off"` and vary only the text inside it. Keep `aria-invalid` and
   `aria-errormessage` conditional on a real error. This is the same permanent-live-region recipe the plan lists
   as Stage 2 item 3, and it applies to the library's own components first.
2. **`InlineConfirm` never announces its message.** The message lives only in `aria-describedby` on the
   container, while initial focus lands on the nested Cancel button, so the description is not conveyed on open.
3. **Tone is encoded as color alone,** in `Badge`, `Metric`, and `StatusIndicator`, with no glyph, shape, or text
   fallback. The tone tokens are also mutually low contrast in every theme and degenerate in Night, where
   `src/styles/tokens.ts:82-85` sets success `#ff8a7a`, danger `#ff6b6b`, and info `#ef7777`, which sit at 1.00:1
   and 1.21:1 against each other. The plan already requires at line 107 that state never rely on color alone.
   Separating the three by lightness within the red family satisfies the Night red-preserving rule through
   tokens.
4. **Forced colors erases the invalid state** on text inputs, checkboxes, and ranges: the danger border and the
   range track collapse to system colors, leaving error text as the only distinction, with no test asserting one.
5. **`Button` rewrites its accessible name while busy** and puts the state prefix ahead of the visible label,
   so the name changes identity mid-interaction.
6. **`InlineConfirm` natively disables the focused Cancel button while busy,** then programmatically chases the
   focus it just destroyed.
7. **`role="alert"` is emitted together with `aria-live="assertive"`,** which double speaks in VoiceOver on iOS.
   Separately, a consumer supplied `role="alert"` is silenced by `aria-live="off"`, and a test currently locks
   that behavior in.
8. **The reduced-motion reset reaches consumer content.** `src/styles/foundation.ts:97-107` applies
   `!important` over `:scope, *, *::before, *::after`. A consumer can still keep an essential animation, because
   a bare selector inside `@scope` carries specificity 0-0-0, but it costs an undocumented `!important`.
   Document the escape hatch, or narrow the reset to package-owned classes.

## 4. Target sizing

The density contract is enforced on height only. `tests/browser/panel.spec.ts:278-304` measures `box.height` and
never `box.width`. This is not yet a defect, because neither the library nor the browser fixture ships a square
or icon-only control, so the plan's rule at line 76 that both dimensions be measured for square and icon-only
targets currently has no subject. Adding one is a density-contract decision, not a test tweak, and the fixture
addition plus a `min-width` rule should land as a single reviewed change.

One genuine gap sits inside the contract already: `src/styles/controls.ts:176-184` and `:199-205` set the range
thumb to a fixed `1.25rem` with `appearance: none`, while `src/styles/tokens.ts:204-208` raises every other
control to `2.75rem` under `@media (any-pointer: coarse)`. The thumb does not scale. The WCAG user-agent
exception the plan relies on covers targets not modified by the author, and this one is explicitly opted out of
native rendering, so the exception does not apply on its own terms.

## 5. Stage 1 readiness, types and refs

Stage 1 scope is confirmed accurate: `forwardRef` appears at exactly 11 call sites across 5 files, matching the
ten named components plus the internal `PanelSurface` at `src/components/PanelRoot.tsx:34`. The internal ref
composition the plan says to preserve is real: `useImperativeHandle` at `src/components/Inputs.tsx:89,189` and
`src/components/PanelRoot.tsx:56`, all of which throw when the element is unresolved.

Before the migration starts, these gaps make "behavior preserving" unprovable:

1. **No type-level test suite exists.** `vitest.config.ts` declares no `typecheck` block, and no `*.test-d.*`
   file exists. Add `tests/types/` with `test.typecheck` enabled, asserting the ref element type of every
   Stage 1 component.
2. **Six of the ten components have no runtime ref assertion:** Banner, FieldGroup, TextInput, NumberInput,
   Select, and Textarea. Capture these before the migration, not after.
3. **Callback-ref cleanup, replacement, and unmount are covered for `PanelRoot` only**
   (`tests/unit/theme.test.tsx:71-113`). No test anywhere returns a cleanup function from a callback ref, which
   is the React 19 behavior most at risk.
4. **Nothing compiles a consumer against `dist`.** `tsconfig.json:20-22` maps the package name back to source
   for every fixture and test, while both fixtures execute `dist` at runtime. Stage 1 requires a packed-consumer
   fixture; there is no foundation for it yet.
5. **No committed declaration baseline exists,** so the before-and-after comparison Stage 1 mandates stays
   manual and unguarded against later regression.
6. **Optional props omit `| undefined`.** With `exactOptionalPropertyTypes` on, consumers cannot pass a computed
   optional value into library-declared optional props whose types do not already admit undefined. Fix this while
   touching every prop contract, not separately.
7. **Type the new ref prop by extending or intersecting `RefAttributes<T>`** rather than hand-writing
   `readonly ref?: Ref<T>`, so the declaration matches what `forwardRef` ships today and stays usable under
   `exactOptionalPropertyTypes`.

Expected declaration change to classify: each component moves from `ForwardRefExoticComponent` to a plain
function, `ref` relocates into the props interface, `key` drops out of `ComponentProps<typeof X>`, and the
writable `displayName` declaration disappears.

## 6. Signal K Admin host integration

Verified against the `@signalk/server-admin-ui` 2.27.0 installed on this machine.

1. **Bootstrap Reboot reaches library markup.** The admin declares `bootstrap ^5.3.3`, ships Reboot verbatim in
   its built stylesheet, and mounts plugin panels inline in the same document with no iframe and no shadow root.
   `@scope` bounds which elements the library's own selectors match; it does nothing to stop host element
   selectors matching inside the root. `src/styles/foundation.ts` resets `box-sizing`, control fonts, link
   colors, `touch-action`, `:focus-visible`, and the disabled cursor, but nothing for `legend`, `label`,
   headings, `p`, `ul`, `ol`, `table`, or `hr`. Measured on the real `FieldGroup` DOM: legend font-size 15px to
   23.1px, margin-bottom 0 to 8px, width 114px to 806px, and `float` none to left in Chromium and Firefox. The
   class rule wins every property it declares and falls through on the four it never declares. Extend the
   `@scope` block with a minimal reset for the tags consumers actually write inside panels, and add a fixture
   that loads the panel under a Reboot-equivalent stylesheet, since `fixtures/browser/index.html` carries no
   framework CSS at all.
2. **Eight unscoped rules lose same-specificity ties to later host CSS.** The shipped stylesheet holds 7
   `CSSScopeRule` blocks covering every component rule, plus exactly 8 unscoped rules, all token declarations
   from `src/styles/tokens.ts`, the one style module that never calls `scopeStyles`. Scope proximity beats order
   of appearance, so every scoped rule already wins; only these 8 do not.
3. **The unresolved theme default defeats host following.** `src/theme/context.tsx:124-126` falls back to
   `"light"` and `src/components/PanelRoot.tsx:70` then writes `data-snui-theme="light"`, which disables every
   host-following rule in `src/styles/tokens.ts:168-186`, all written as `:not([data-snui-theme])`. Defaulting to
   `auto` keeps Light as the rendered result on a light host and still writes nothing to storage. Signal K Admin
   2.27.0 never sets a Bootstrap color mode today, so this changes nothing now and matters when it does.

## 7. Overlay feasibility, input to Stage 3

Positioning facts, established by driving Chromium 151, Firefox 153, and WebKit 26.5 rather than from
documentation:

1. **`container-type: inline-size` does not trap fixed positioning.** It has not forced layout containment since
   the CSSWG resolution of July 2024, and it creates neither a containing block for fixed descendants nor a
   stacking context. A `position: fixed; inset: 0` descendant of the panel root measures the full viewport in all
   three engines. Note that Chromium 118 and Safari 17.4, both inside the declared support floor, predate that
   resolution, so neither behavior should be relied on.
2. **`backdrop-filter` does create a containing block.** `src/styles/components.ts:193-194` sets
   `backdrop-filter: blur(0.4rem)` on `.snui-action-bar`, and a fixed `inset: 0` descendant measures the action
   bar's padding area. Combined with `.snui-action-bar--sticky`, an `OverflowActions` menu rendered inside an
   `ActionBar` would be genuinely confined and z-ordered by it.
3. **The panel root is not a positioning context.** It sets no `position`, so an in-root absolutely positioned
   overlay escapes to an unknown consumer ancestor. An overlay host must establish one explicitly.
4. **Top-layer promotion loses the container query.** `src/styles/foundation.ts:20-21` makes the panel the only
   query container, and every responsive rule keys off `snui-panel`
   (`foundation.ts:91`, `collapsible.ts:119`, `forms.ts:148`, `feedback.ts:105`, `components.ts:253`). A native
   Popover or modal dialog promoted to the top layer leaves that container, so overlay-internal responsive rules
   stop resolving. This is the substantive Stage 3 decision: either the overlay surface declares its own
   container, or overlays stay out of the top layer.
5. **Platform gaps to record:** `showPopover` is unavailable on iOS Safari below 18.3 while `@scope` admits 17.4,
   and no lane tests below-floor engines at all. The `dialog` `closedby` attribute is not shipped in WebKit, so
   light dismiss needs a scripted path. CSS anchor positioning sits above all three declared floors and cannot be
   the sole positioning mechanism.

The 24 KiB gzip ceiling will not be the gate. Current bundle is 13,258 gzip bytes, of which CSS is 4,845, leaving
roughly 46 percent headroom. Decide overlays on boundary and platform grounds, not budget.

## 8. Tests, tooling, and packaging

1. **The versioned spinner keyframe is unverifiable.** It is wired correctly today
   (`src/styles/controls.ts:5,89` define and reference `snui-v0-4-1-spin`), but nothing would catch a break: a
   rule naming nonexistent keyframes still computes `animationDuration: 0.8s`, so
   `tests/browser/panel.spec.ts:761-772` cannot detect it, and screenshots run with `animations: "disabled"`.
   Assert that the installed CSS contains a version-derived `@keyframes` name and that a spinner reports
   `getAnimations().length === 1` with motion enabled.
2. **The Vitest 5 second default timeout is too tight for the jsdom axe test** on a cold coverage run.
3. **The browser matrix tests only current engines,** so an accidental adoption of a feature below the declared
   floor passes CI and fails in the field.
4. **`package.json` has no `engines` field,** only `devEngines`, so consumers receive no Node constraint.
5. **`scripts/check-bundle-size.mjs` does not report the CSS share.** Per-component CSS splitting is the wrong
   answer, because it would break the version-conflict check at `src/styles/install.ts:67-73`, and tree-shaking
   already works: `Button` alone bundles to 567 gzip bytes with zero CSS. Log the share as a non-gating
   diagnostic instead.
6. **CSP is already handled and should not be re-engineered.** `styleNonce` covers nonce-based policies and
   `tests/browser/csp.spec.ts` covers matching, missing, and wrong nonce. The residual gap is only a nonce-less
   policy such as `style-src 'self'`. Do not replace the style element with `adoptedStyleSheets`: a constructed
   sheet cannot be adopted into the foreign or detached documents `install.ts` supports, and jsdom 30 reports
   `'adoptedStyleSheets' in document === false`, so the install, dedup, refcount, and nonce tests would go dark
   against the 95 percent thresholds.

## 9. Documentation

1. **No document enumerates component props,** yet `docs/release-policy.md:13` treats them as versioned API.
   `SegmentedControl.rootRef`, `SegmentedControl.disabled`, and `InlineConfirm.rootRef` appear nowhere. Stage 1
   and Stage 2 both need this artifact.
2. **No document records which components accept a ref, or to which element type,** so Stage 1 has no before
   state and `docs/migration.md` has no ref section to extend.
3. **The package boundary has drifted.** `docs/design-contract.md:13` omits the forced-colors clause the plan
   carries at line 25. Make the contract the single boundary source and have the plan reference it.
4. **The Night focus ring contract is written nowhere,** despite the plan protecting it: record the 2 pixel
   outline, the 2 pixel offset, `--snui-color-focus` as the source, and the 3:1 minimum.
5. **`docs/release-policy.md:26` omits README from the release path,** yet README pins the version twice.
6. **No deprecation or removal policy exists for the 0.x series.** `docs/release-policy.md:22` covers only
   post-1.0, while all six consumers pin exact versions.
7. **Localization is a stated goal with no inventory and no acceptance row.** The overridable English defaults
   are `"Working"`, `"Dismiss"`, `"Cancel"`, `"Confirm"`, `"Confirm action"`, and `"Panel theme"`.
8. **`CHANGELOG.md` has an empty Unreleased section** while the toolchain change above sits uncommitted.
9. **Four public value exports are described nowhere:** `PUBLIC_COLOR_TOKEN_NAMES`,
   `PUBLIC_FOUNDATION_TOKEN_NAMES`, `THEME_CHOICES`, and `THEME_STORAGE_KEY`.
10. **`src/styles/tokens.ts:147` names `Inter` first** in the font stack, which the package does not ship and the
    admin does not load, so typography varies by machine.

## 10. Stage 0 candidate matrix

Measured across all six consumers, every one of which is React and pins this package at exactly `0.4.1`. The
binding bar is two distinct consumer packages, not two call sites.

| Candidate                 | Consumers | Verdict     | Deciding fact                                                                        |
| ------------------------- | --------- | ----------- | ------------------------------------------------------------------------------------ |
| Detail list               | 4 of 6    | recipe only | Three of the four already use `MetricGrid` and `Metric`; no `dl` exists anywhere     |
| Numeric with visible unit | 1 of 6    | recipe only | The separate-unit composition exists once, in chart-locker `RangeField.tsx:138`      |
| Navigation card row       | 0 of 6    | reject      | `aria-current` appears nowhere, and these panels have nowhere to navigate to         |
| Flat multi-control row    | 5 of 6    | recipe only | `Cluster` and `CollapsibleSection` cover it; two consumers hold zero local row code  |
| Save feedback             | 6 of 6    | recipe only | Roughly 20 lines genuinely duplicated, and that pair disagrees on live-region policy |
| Loading and empty states  | 4 of 6    | reject      | An empty state reduces to one declaration, `color: var(--snui-color-text-muted)`     |

The plan's contested refusals are supported by the evidence. Across six consumers the transient-success policy
alone takes six forms, from a fixed timer, to a phase-dependent 6000 or 30000 milliseconds, to never clearing, to
no success state at all. Live-region policy is directly contradictory: chart-locker suppresses announcement while
invalid, while emitter-cannon and openrouter-companion announce validation errors. Focus-transfer timing differs
three ways, and openrouter-companion inverts the button order.

Two places the plan specifies ahead of demand: the detail-list requirement to preserve `dl`, `dt`, and `dd`
describes a need no consumer has expressed, and the Stage 2 option to extend `Metric` with a separately styled
visible unit has no demand at all, because every consumer formats the unit into a string and `Metric` already
accepts `ReactNode`.

Server-driven unit preferences exist in exactly one consumer, crows-nest, which reads the preference, stores
meters, converts at render, converts back on commit, and re-clamps in meters. The other five store native units
and never convert. That single-consumer footprint is the real basis for refusing a converting `UnitField`.

Suggested Stage 5 pilots on the evidence: emitter-cannon, which still hand-rolls the most local markup, and
crows-nest, which exercises the widest slice of the existing API.

## 11. Plan defects

1. **Stage 0 treats settled facts as pending work.** The six-consumer list is correct, and adoption is already
   universal at 0.4.1. Replace the bare list with the recorded inventory.
2. **Stage 1 is not isolatable from Stage 2.** Stage 1 line 160 introduces the packed-consumer fixture, and the
   Types and refs acceptance row then requires packed declaration compilation for every changed primitive, so
   Stage 2 cannot start first. Make the fixture a shared prerequisite.
3. **Stage 3 admits "a justified dependency" with no acceptance row for it.** The package currently has no
   `dependencies` field at all. Either strike the clause, or add a row covering license review, runtime audit
   impact, third-party notices, and the effect on the federation share scope.
4. **Three stop conditions have no metric,** most importantly "adapters and overrides approach the amount of
   code removed", which names no unit, scope, or threshold.
5. **The RTL acceptance rows are unmeasurable,** because the design contract records the criterion as engine
   dependent. Split them into direction-independent behavior required everywhere, and cosmetic mirroring
   required only where `:dir()` is supported.
6. **The Binnacle stop condition is inert.** Binnacle is Svelte, has no React, and does not consume this package,
   so it cannot appear in a Stage 0 inventory. Replace the clause with the risk that actually exists, namely a
   candidate justified by a non-React or single-application consumer.
7. **The document has no date, owner, or target version,** while later stages depend on version assignment.

## 12. Examined and refuted

Recorded so they are not reproposed.

1. **README relative file links are not a defect here.** The App Store rule does not apply: `scripts/check-package.mjs:27-55`
   fails the build if any Signal K discovery keyword appears, and `docs/repository-setup.md:27` states the package
   is an npm dependency only. All five link targets ship in the tarball and resolve on GitHub, on npm, and in the
   installed tree.
2. **Cross-version style isolation is already covered.** `tests/browser/panel.spec.ts:159-188` asserts both
   directions of the scope boundary, `tests/browser/federation.spec.ts` loads two independently compiled remotes,
   and `tests/unit/theme.test.tsx:156-191` covers the two-module-instance registry. A second-build fixture would
   add a build artifact for no detection power.
3. **`sideEffects: false` is truthful,** and tree-shaking keeps CSS out of component-only imports.
4. **StrictMode does not move the style element's cascade position.** It is restored to the same position in head.
5. **`PanelRoot` assigning its ref before a throwing install is deliberate and harmless.** Nothing is mutated
   before either throw site, and the ordering prevents a spurious second error from the imperative handle.
6. **The theme layer's use of the global window is the intended page-wide preference bus,** not a realm defect.
   The resolved theme lands on the root element in the same document as its styles, and `auto` resolves in CSS.
7. **Stage 0's "two consumer locations" wording is not a contradiction** of the Goals bar. It records per-candidate
   call sites within consumers already qualified by that bar.
8. **A 320 pixel visual baseline is not missing.** `panel-mobile-light` captures narrow layout at 375 pixels and
   crosses the same breakpoints.
9. **Light and Night forced-colors baselines would duplicate the Dark one,** because theme choice is irrelevant
   under forced colors. The real gap is the missing invalid-state and disabled-state assertions.

# Contributing

Review the [Code of Conduct](.github/CODE_OF_CONDUCT.md) before participating. Use the repository issue forms for confirmed bugs and feature proposals, and use Discussions for usage questions.

## Local checks

Use Node 22.22.2 or newer in the Node 22 release line, Node 24.15.0 or newer in the Node 24 release line, or Node 26, with npm 11.16.0 or newer or npm 12. `devEngines` in `package.json` is the one enforced statement of both ranges, and the CI workflows install the newest npm that satisfies it. The package declares no `packageManager` field, because npm enforces `devEngines` and Corepack does not read it; a Corepack user can add the field to an uncommitted local copy, and `npm run validate` rejects it if it is committed. Install the locked dependency tree and run:

```sh
npm ci
npm run validate
npm run test:browser
git diff --check
```

`npm run validate` includes the committed Signal K host contract, the locked React Aria dependency contract, aggregate coverage thresholds, per-file coverage floors, the public type surface comparison, the documentation example compile, and the bundle size budgets described below. Use `npm run host-contract:drift` to compare the committed host baseline with the registry without changing files. Run `npm run host-contract:update` only when reviewed upstream drift should replace the baseline. `npm run host-contract:loader` compares the Signal K loader functions the package builds on with `tests/host-loader.baseline.json`; it needs the network, so the weekly host contract workflow runs it, and `npm run host-contract:loader:update` records a change only after a reviewer has rechecked the facts the failure names.

Vitest runs two projects, and a unit spec lands in one by its extension. `tooling` runs `tests/unit/**/*.test.mjs` under plain Node: the specs for the scripts and the published CLI, which build any browser globals they need in their own `node:vm` contexts. `components` runs `tests/unit/**/*.test.{ts,tsx}` under jsdom with `tests/setup.ts`, and type checks `tests/types/**/*.test-d.ts`. `tests/unit/toolchain-config.test.mjs` fails when a unit spec lands in neither project or in both. Pass `--project tooling` or `--project components` to `npx vitest run` to run one half.

Component specs are one file per `src/components` module, named after it in kebab case: `src/components/SegmentedControl.tsx` is tested in `tests/unit/segmented-control.test.tsx`, and the text controls in `Inputs.tsx` share `inputs.test.tsx`. `DataGrid` has two files, `data-grid.test.tsx` and `data-grid-virtualization.test.tsx`, so its slow virtualization cases run on a worker of their own. Behavior that spans components keeps a cross-cutting suite, such as `accessibility`, `composites-accessibility`, `announcing-regions`, `refs`, `runtime-cost`, `contrast`, and `panel-labels`, and the style, utility, and hook suites keep their own names. Put a fixture that several spec files share in `tests/unit/lib`, and keep `tests/helpers.tsx` for helpers every spec may use.

Coverage is measured over three roots. `src` carries the package's own floors, set in `COVERAGE_FLOORS` in `scripts/lib/coverage-contract.mjs`: 74 percent branches, 90 percent functions, 83 percent lines, and 81 percent statements per file, under the aggregate thresholds in `vitest.config.ts`. Each floor sits a little under the lowest file the suite measured on that metric when the floors were last raised, and the comment beside `COVERAGE_FLOORS` records which files and figures set them. The margin covers the other Node versions CI runs, and the floors still let a component that loses tests fail its own floor rather than hide under the aggregate. The published CLI under `bin/lib` and the release-gate modules under `scripts/lib` carry the lower `TOOLING_COVERAGE_FLOORS`: 45 percent branches and 65 percent functions, lines, and statements per file, with their own aggregate thresholds keyed by glob so they never move the `src` numbers. They sit lower because those modules are tested through the behavior a release depends on rather than line by line. The two entry scripts, `bin/snui-check-consumer.mjs` and the gate scripts directly under `scripts`, are outside the measurement: the specs that exercise them spawn them as child processes, which the in-process coverage provider cannot see, so a floor there would record a permanent zero rather than a real gap. Their behavior is covered by those spawning specs.

`react-aria` is a direct dependency that no source file imports. It is the lever `scripts/check-react-aria-contract.mjs` uses to require exactly one installed copy at a version compatible with `react-aria-components` and with the React peer range; the script header explains the check. Do not remove it as unused.

`.npmrc` sets `strict-allow-scripts`, so `npm ci` fails if a dependency runs an install script that `allowScripts` in `package.json` does not name. Today that list is the locked esbuild version and the locked fsevents version, which installs on macOS only, and `npm run validate` asserts the list names exactly the locked packages that declare an install script, so a Dependabot bump of either fails with the fix in the message: update that `allowScripts` key to the new version.

`biome.json` and `knip.json` take their `$schema` from the installed packages under `node_modules`, so an editor validates against the tool the lockfile holds and a Dependabot bump needs no second edit.

Install Playwright browsers when needed:

```sh
npx --no-install playwright install chromium firefox webkit
```

Set `SNUI_BROWSER_PORT` to an unused port from 1024 through 65535 when another local browser suite is running on the default port, for example `SNUI_BROWSER_PORT=4273 npm run test:browser`.

### Browser specs

`npm run test:browser` builds the package and the federation fixtures, then runs every spec under `tests/browser` in desktop Chromium, Firefox, WebKit, and mobile Chromium, unless a spec narrows its own projects:

- `panel.spec.ts` and `showcase.spec.ts` hold the pixel baselines and the component behavior that needs a real engine, and `panel.spec.ts` runs axe in every theme.
- `theme-accessibility.spec.ts` grades the showcase with axe in Light, Dark, and Night, and again in Night with a dialog and a danger toast open, apart from the showcase baselines so a pixel mismatch cannot hide an audit failure.
- `federation.spec.ts` loads the classic and module fixture remotes through the host harness, against the host's React and React DOM.
- `live-regions.spec.ts` proves that the panel announcer, toasts, the save bar status, and announcing banners stay exposed to assistive technology while a dialog, menu, or popover hides the rest of the page; `live-regions.ts` is its helper.
- `docked-bar.spec.ts` releases a docked save bar above the trailing theme selector, keeps the selector reachable by keyboard and by pointer, and lines the bar's status and buttons up with the section content above it, docked and in flow.
- `field-layout.spec.ts` keeps field group legends inside their border and naming their group, text controls level with the buttons beside them, an inline field's label centered on a control with no description, a field error's glyph apart from its message with wrapped lines hung past it, and the optional marker at the regular weight.
- `control-rendering.spec.ts` checks button, checkbox, and selection control painting in Chromium: a button keeps its own type size in a small-text card footer, a button rendered as an anchor draws as its variant without the link underline or hover color, and a disabled checkbox label and its optional and required markers take the disabled text color. Under forced colors, blocked buttons, a blocked danger button's dashed outline, and a disabled checkbox label and its marker paint GrayText, while a busy button keeps its variant and a link in that label keeps LinkText; on the showcase's `?disabled-controls=1` page a disabled radio, switch, and slider, and a disabled or blocked selected segmented option, paint GrayText and Canvas and none of the theme's disabled color; a focused danger button keeps a solid focus ring while the pointer rests on it, and an invalid text input, slider, and checkbox trade their dashed invalid outline for a 2 pixel solid focus ring on keyboard focus.
- `text-spacing.spec.ts` applies the WCAG 1.4.12 text spacing overrides at 320 pixels and fails on any label, addon, option, or banner text that is cut off.
- `increased-contrast.spec.ts` checks a `prefers-contrast: more` request: the raised boundary, outline, and muted text tokens in every theme and under a host's dark marker, the 3 pixel focus rings a grid row, a radio, a switch, and a menu item draw, and a date picker ring that widens from 2 to 3 pixels in Light, Dark, and Night, where the widened Night picker still paints its glyph under the channel cap. It also holds the Night browser chrome under the channel cap: scrollbars, selection, option lists, the native parts of date, time, month, week, and textarea fields, the focused date segment, and the hovered number spinner. It keeps the Night number spinner and resize grip working, gives the spinner the native pointer target, rings the Night date picker in the focus token, and draws the grip clear of the border and facing its corner, mirrored in a right-to-left field, in button text under forced colors, and with both strokes one weight at device pixel ratios of 1.25, 2, and 2.5.
- `data-grid-selection.spec.ts` checks the `DataGrid` selection bar, focus ring, and row separators in Chromium, in the table, virtualized, and compact virtualized layouts of the `data-grid.html` fixture. Separators run from the grid's start edge because no cell draws a leading border. The bar sits only in a selected row's first cell, inside the inset set aside for it at every density and as wide as the `Banner` tone bar, moves no text, and stays inside a focused row's focus ring, which a `prefers-contrast: more` request widens to 3 pixels. Under forced colors the bar and a focused selected row's ring both paint HighlightText, so the ring shows against the row's Highlight fill.
- `design.spec.ts` holds the design rules that need computed styles: the info dot's rounded square against the neutral dot, coarse-pointer input text, menu hover and zebra fills, the table scroll region's focus ring, tab and grid row states under forced colors, the whole value of a focused grid cell, one surface for `Section` and `CollapsibleSection`, the Bootstrap Reboot rules neutralized inside the panel, the heading type scale, and content padding against the safe-area inset. Its panel-width groups check layout at three widths: at 1024 pixels, banner and link actions centered on the banner title, toned progress and collapsible glyphs centered on a one-line label or title, and a card footnote kept to the prose measure; at 375 pixels, a collapsible's action kept on the summary's row when it fits; and at 320 pixels, banner actions stacked under the text, a stacked link action's row kept to the link's own height, a wrapped label or title keeping its glyph and chevron on the first line, and a collapsible's action and summary row starting under the title text.
- `controls.spec.ts` keeps text controls at 16 pixels or more on a coarse pointer and at the panel type size on a fine one, and paints the inline confirmation's Cancel button in system colors under forced colors.
- `csp.spec.ts` proves that a matching style nonce authorizes the root sheet and a component module sheet, while a missing or wrong nonce leaves them unapplied.

### Visual baselines

`panel.spec.ts` and `showcase.spec.ts` are the two snapshot specifications, listed in `SNAPSHOT_SPECS` in `scripts/lib/snapshot-families.mjs`; `tests/unit/workflow-contract.test.mjs` fails when any other browser spec takes a screenshot, through a `toHaveScreenshot` call or a `.png` literal, until it joins that list. Every screenshot they take must have both hosted families, `ubuntu24-x64` and `ubuntu24-arm64`, for the Playwright project that takes it: desktop Chromium, except WebKit for the native-controls image and mobile Chromium for the coarse-pointer mobile image. The browser meta-test and `npm run test:snapshot-families` read the expected names from the quoted `.png` literals in those specs, so a spec that loops over themes keeps its names in a literal table. The families are the `snapshot_variant` values of the browser matrix in `.github/workflows/ci.yml`; the refresh workflow and the meta-test repeat them, and `tests/unit/workflow-contract.test.mjs` keeps the three copies equal.

The mobile image is a viewport capture in a tall viewport, because a full-page capture drops the coarse-pointer emulation. Headless Chromium hides scrollbars, so no baseline shows one.

Hosted families come only from the workflow. A local run names its images `linux-local-<arch>`, which `.gitignore` excludes, so a local image can never be mistaken for a hosted one and is never committed. The first local run therefore has no baselines to compare against: run `npm run test:browser:update` once to write the local family, then run `npm run test:browser` normally. A local image is useful for inspection, but it cannot substitute for a different runner image or architecture.

After a screenshot specification is added or intentionally changed:

1. Push the reviewed source to a temporary branch without creating a release.
2. Dispatch the `Update visual baselines` workflow against that exact branch. Each runner regenerates every project and asserts its family is complete before uploading.
3. Run `npm run baselines:fetch -- <run-id>` with the id of that workflow run. It downloads each `baselines-*` artifact with the GitHub CLI, copies only the images each snapshot specification expects for that family into its snapshot directory, and runs the family check over the result.
4. Visually inspect every changed image `git status` shows, then commit both families with the source change.
5. Run the normal browser suite. Update mode skips only the family-completeness guard so a clean branch can bootstrap new images; normal CI keeps the guard blocking, and `npm run test:snapshot-families` checks completeness without a browser.

Never relabel an image generated on one platform as another platform's baseline.

### Public type surface

`npm run validate` compares the public type surface with `tests/declarations.baseline.txt`. The surface is what a consumer can name through the exports map: each entry point's exported names, and every declaration those names reach, printed without doc comment prose and with destructured parameters given plain names. Only the `@deprecated` and `@default` tags are kept, because they change what a consumer's editor and linter do, and a reachable file that augments a global or another module is compared whole. A reworded doc comment therefore leaves the baseline alone and can ship in a patch.

A companion check fails when a file an entry reaches exports a name that no entry exports and no public declaration uses. Nobody can import such a name, so either mark it `@internal` in the doc comment directly above its declaration, which the build strips from the emitted declarations, or export it from an entry on purpose. A second check fails when a declaration file an entry reaches does not compile, which is what an `@internal` tag on a type a public declaration still uses leaves behind once the build strips it; remove that tag. Run `npm run declarations:update` to accept an intended surface change, and record it in the changelog. `/data-grid` re-exports types from React Aria Components, so a React Aria update can change public types without a diff here; record every React Aria version change in the changelog.

### Documentation examples

Every `tsx` fence in `README.md` and `docs/migration.md` is code a consumer copies, so the suite holds it to the API. `npm run validate` compiles each example against the packed declarations inside the consumer type check, `scripts/check-consumer-types.mjs`, so the package is packed once, and `npm run docs:examples` runs the same compile on its own after a build, taking documents named on the command line in place of those two: a module example compiles as written, and a snippet is completed first, importing each package name it uses from the entry that exports it and declaring any other free name. `tests/unit/doc-examples.test.tsx` renders each example in jsdom, a module's default export as a Signal K panel with `configuration` undefined, and fails on any console warning or error. The same suite also runs the recipes whose prose promises a behavior, such as the Basic use save and the closed section reveal in the migration guide, and fails when a recipe loses the line that behavior depends on.

Write an example that runs as shown. A module example imports only from `react`, `react-dom`, and the package entry points a panel uses, and code that is not a panel, such as a Webpack configuration or a host harness fixture, goes in a `js` or `sh` fence instead. An example known to be wrong goes in the test's `KNOWN_BROKEN` table with the defect it shows, which expects it to fail until the documentation is fixed and then fails until the entry is removed.

### Bundle size budgets

The entry point size table in `docs/api-reference.md` has two columns that change in different ways. The measured gzip size is refreshed for every release from `node scripts/check-bundle-size.mjs --table`, which prints the table to paste. The budget column carries forward: a measurement over its budget fails `npm run test:bundle:built` until the budget is raised by hand in the table, with the reason in that release's changelog entry, so growth is a reviewed decision rather than a side effect of the refresh. After a shrink, `--table --tighten` lowers each budget to its measurement plus 6 percent, rounded up to the next kibibyte, and never raises one; a new entry's first budget is derived the same way. The `fixtures/size/consumer-panel.ts` row bundles, with tree shaking, the names most consumer panels import, so it measures what a typical remote pays rather than whole entries.

### Workflow steps and pinned tools

Every workflow installs npm through an inline step named "Set up npm", or "Set up npm on Windows" on the Windows lane, rather than a local composite action, because the required workflow lint reports the `GITHUB_PATH` write such an action would make. `tests/unit/workflow-contract.test.mjs` holds every copy of each step to one canonical body and requires every step that reads `devEngines.packageManager.version` to carry one of those names, so change every copy together.

`.github/pinned-tools.json` pins the version and archive checksum of each tool the workflows download directly: actionlint, lychee, and zizmor. No dependency updater can see those pins, so `npm run tools:outdated` compares each one with the tool's latest GitHub release and fails with the new version and its checksum, ready to paste. The weekly host contract workflow runs the same check as a non-required job. It needs the network, and a `GITHUB_TOKEN` in the environment lifts the anonymous API rate limit. A unit test holds every workflow download step to the pinned table.

## TypeScript toolchain

Two TypeScript compilers are installed on purpose, through npm aliases in `devDependencies`:

- `@typescript/native` is the real `typescript` package at 7.x. `npm run build` and `npm run type-check` run its compiler by path through `scripts/tsc7.mjs`. Only `@typescript/native` claims the `tsc` binary today, but a future TypeScript 6 alias could claim it again and npm links `node_modules/.bin/tsc` to whichever package installed last, so the scripts resolve the compiler by package path rather than by bin name; never call bare `tsc` from a script.
- `typescript` is aliased to `@typescript/typescript6`, which provides the TypeScript 6 JavaScript compiler API plus a `tsc6` binary.

The alias exists because tools that import the compiler API, most importantly typescript-eslint, do not yet run under TypeScript 7. Resolving the bare `typescript` specifier to the TypeScript 6 API keeps type-aware linting working while builds use the native compiler.

Because type-aware lint rules evaluate under TypeScript 6 while the build evaluates under TypeScript 7, `npm run validate` runs `type-check` and `type-check:ts6`. That compares the diagnostics the two compilers report over both the root project and the build project. It does not compare emitted declarations, because only TypeScript 7 emits shipped output.

Two maintenance consequences follow from the alias layout. Dependabot does not bump npm-alias ranges, so the `typescript` (6.x) and `@typescript/native` (7.x) ranges need a manual check with `npm outdated` and a hand-written bump. And the two compilers meet in the package checks: ts-loader in `fixtures/federation/*/webpack.config.cjs` resolves the bare `typescript` specifier, so the fixture remotes compile with the TypeScript 6 API, and so do the release gates that parse TypeScript themselves, the public type surface reader in `scripts/lib/public-surface.mjs` and the style text compaction in `scripts/lib/style-text.mjs`. `scripts/check-consumer-types.mjs` and `scripts/check-doc-examples.mjs` compile against the packed declarations with `@typescript/native`, TypeScript 7. All of them must pass.

Collapse this back to a single `typescript` dependency once typescript-eslint supports TypeScript 7. Verify emitted declarations are unchanged before and after that collapse.

## Change rules

- Keep components presentational and independent of plugin domain state.
- Add or update keyboard and accessibility tests with interaction changes.
- Add contrast coverage when theme colors change.
- Keep every descendant selector inside the exact version-qualified native scope. Root token declarations and the selectors matching host theme markers may target the exact versioned root outside that scope. The unversioned `snui-tokens` class in `dist/tokens.css` is the one isolation exception recorded in the design contract; do not add a second.
- Keep descendant styles from crossing a nested root with another package version.
- Update `src/version.ts` and the root package metadata in `package-lock.json` whenever `package.json` changes version.
- Document public API changes in `CHANGELOG.md`, `docs/api-reference.md`, and `docs/migration.md`.
- Treat exported components, props, types, tokens, theme persistence, keyboard behavior, focus behavior, and compatibility floors as versioned API.
- Update browser snapshots only after visually inspecting the result in every affected theme and viewport.
- Keep hosted visual baselines separate by runner image and architecture through `SNUI_SNAPSHOT_VARIANT`; local images are named `linux-local-<arch>` and never committed.
- Keep code, documentation, package metadata, and repository templates consistent.
- Do not publish, tag, or create a release without explicit final approval.

## Documentation map

- `README.md` is the consumer overview. Keep installation commands, compatibility, entry points, feature summaries, the consumer check, and package boundaries current. Link other repository documents from it by absolute GitHub URL, never by a relative path, because the README is also read where a relative link does not resolve.
- `docs/api-reference.md` inventories public entry points, their sizes and budgets, package-specific props, ref targets, defaults, public values, and localization hooks.
- `docs/design-contract.md` defines stable ownership, theme, token, accessibility, isolation, overlay, density, and compatibility behavior.
- `docs/migration.md` gives current adoption guidance and preserves version-specific upgrade history.
- `docs/release-policy.md` records semantic-versioning and publication requirements. `docs/repository-setup.md` records external GitHub and npm settings for this repository and is not published in the package tarball.
- `SUPPORT.md` routes usage questions, bug reports, feature proposals, and security reports to their channels.
- `.github/SECURITY.md` records the supported release line and the package security boundary, including the boundary the shipped `snui-check-consumer` command runs outside of.
- `CHANGELOG.md` records notable user-facing changes. Preserve released sections as historical statements, even when the current contract later changes. It follows Keep a Changelog with one deliberate extension: a `### Breaking` category, listed first in a release that has one, so a consumer scanning the file sees every change that needs migration work before the Added, Changed, Deprecated, Removed, Fixed, and Security categories.

Update every affected document in the same change. Do not copy exhaustive prop lists into the README when the API reference can remain the single detailed inventory. Run `npm run docs:check` to lint Markdown, check spelling, verify repository-local links and anchors, and compare the localization table with the package defaults, and run `npm run docs:examples` after a build to compile the documentation examples. External URL availability is not part of the blocking local gate because remote services can be transient. Run the documentation formatter and `git diff --check` before opening a pull request.

## Deferred component proposals

The removed historical roadmap is not a current package contract, but two candidate dispositions remain useful during feature review:

- Keep overflow actions as a composition of the existing `Menu`, `Popover`, and button primitives unless at least two React administration consumers demonstrate the same reusable action-priority contract. A future `OverflowActions` proposal must retain a visible primary action and accept localized labels.
- Keep slide-over shells consumer-local. Reconsider a shared `SlideOver` only when at least two React administration consumers require the same host-contained panel behavior without chart, phone-minimization, viewport-navigation, or application-shell assumptions. Any proposal must separately define modal and nonmodal focus, inertness, scrolling, dismissal, safe-area, CSP, and nested-version behavior.

These names are deferred candidates, not reserved exports or release commitments. Apply the public-API evidence, accessibility, package-boundary, bundle-budget, and browser-verification requirements above before advancing either one.

## Pull requests

1. Create a focused branch from `main`.
2. Add tests that fail without the change and pass with it.
3. Run `npm run validate` and the browser suite relevant to the change.
4. Include Light, Dark, and Night screenshots when presentation changes.
5. Confirm 320-pixel reflow and 44-by-44-pixel coarse-pointer targets when layout changes.
6. Update the changelog, API reference, design contract, migration guidance, and consumer overview when required.
7. Complete the pull request template and call out compatibility or semantic-versioning impact.

Never include credentials, access tokens, private server data, or unsanitized logs in issues, pull requests, fixtures, or snapshots.

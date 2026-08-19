# Contributing

Review the [Code of Conduct](.github/CODE_OF_CONDUCT.md) before participating. Use the repository issue forms for confirmed bugs and feature proposals, and use Discussions for usage questions.

## Local checks

Use Node 22.22.2 or newer in the Node 22 release line, Node 24.15.0 or newer in the Node 24 release line, or Node 26. npm 12.0.2 is preferred, and npm 11.16.0 or newer also satisfies the development engine range. Install the locked dependency tree and run:

```sh
npm ci
npm run validate
npm run test:browser
git diff --check
```

`npm run validate` includes the committed Signal K host contract, the locked React Aria dependency contract, aggregate coverage thresholds, and per-file coverage floors. Use `npm run host-contract:drift` to compare the committed host baseline with the registry without changing files. Run `npm run host-contract:update` only when reviewed upstream drift should replace the baseline.

Install Playwright browsers when needed:

```sh
npx --no-install playwright install chromium firefox webkit
```

Set `SNUI_BROWSER_PORT` to an unused port from 1024 through 65535 when another local browser suite is running on the default port, for example `SNUI_BROWSER_PORT=4273 npm run test:browser`.

### Visual baselines

Every Chromium screenshot specification must have the three hosted families enforced by the browser meta-test: `linux-x64`, `ubuntu24-x64`, and `ubuntu24-arm64`. A local snapshot is useful for inspection, but it cannot substitute for a different runner image or architecture.

After a screenshot specification is added or intentionally changed:

1. Push the reviewed source to a temporary branch without creating a release.
2. Dispatch the `Update visual baselines` workflow against that exact branch.
3. Download all three `baselines-*` artifacts, preserve each generated suffix, and copy the reviewed images into `tests/browser/panel.spec.ts-snapshots/`.
4. Visually inspect every changed image, then commit all required families with the source change.
5. Run the normal browser suite. Update mode skips only the family-completeness guard so a clean branch can bootstrap new images; normal CI keeps the guard blocking.

Never relabel an image generated on one platform as another platform's baseline.

## TypeScript toolchain

Two TypeScript compilers are installed on purpose, through npm aliases in `devDependencies`:

- `@typescript/native` is the real `typescript` package at 7.x. It provides the `tsc` binary that `npm run build` and `npm run type-check` use.
- `typescript` is aliased to `@typescript/typescript6`, which provides the TypeScript 6 JavaScript compiler API plus a `tsc6` binary.

The alias exists because tools that import the compiler API, most importantly typescript-eslint, do not yet run under TypeScript 7. Resolving the bare `typescript` specifier to the TypeScript 6 API keeps type-aware linting working while builds use the native compiler.

Because type-aware lint rules evaluate under TypeScript 6 while the build evaluates under TypeScript 7, `npm run validate` runs `type-check` and `type-check:ts6`. That compares the diagnostics the two compilers report over both the root project and the build project. It does not compare emitted declarations, because only TypeScript 7 emits shipped output.

Collapse this back to a single `typescript` dependency once typescript-eslint supports TypeScript 7. Verify emitted declarations are unchanged before and after that collapse.

## Change rules

- Keep components presentational and independent of plugin domain state.
- Add or update keyboard and accessibility tests with interaction changes.
- Add contrast coverage when theme colors change.
- Keep every descendant selector inside the exact version-qualified native scope. Root token declarations and host-ancestor theme selectors may target the exact versioned root outside that scope. The unversioned `snui-tokens` class in `dist/tokens.css` is the one isolation exception recorded in the design contract; do not add a second.
- Keep descendant styles from crossing a nested root with another package version.
- Update `src/version.ts` and the root package metadata in `package-lock.json` whenever `package.json` changes version.
- Document public API changes in `CHANGELOG.md`, `docs/api-reference.md`, and `docs/migration.md`.
- Treat exported components, props, types, tokens, theme persistence, keyboard behavior, focus behavior, and compatibility floors as versioned API.
- Update browser snapshots only after visually inspecting the result in every affected theme and viewport.
- Keep local ARM64 and x64 visual baselines separate because native controls and font rasterization differ by architecture.
- Keep hosted visual baselines separate by runner image and architecture through `SNUI_SNAPSHOT_VARIANT`.
- Keep code, documentation, package metadata, and repository templates consistent.
- Do not publish, tag, or create a release without explicit final approval.

## Documentation map

- `README.md` is the consumer overview. Keep installation commands, compatibility, entry points, feature summaries, and package boundaries current.
- `docs/api-reference.md` inventories public entry points, package-specific props, ref targets, defaults, public values, and localization hooks.
- `docs/design-contract.md` defines stable ownership, theme, token, accessibility, isolation, overlay, density, and compatibility behavior.
- `docs/migration.md` gives current adoption guidance and preserves version-specific upgrade history.
- `docs/release-policy.md` records semantic-versioning and publication requirements. `docs/repository-setup.md` records external GitHub and npm settings.
- `CHANGELOG.md` records notable user-facing changes. Preserve released sections as historical statements, even when the current contract later changes.

Update every affected document in the same change. Do not copy exhaustive prop lists into the README when the API reference can remain the single detailed inventory. Run `npm run docs:check` to lint Markdown, check spelling, and verify repository-local links and anchors. External URL availability is not part of the blocking local gate because remote services can be transient. Run the documentation formatter and `git diff --check` before opening a pull request.

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

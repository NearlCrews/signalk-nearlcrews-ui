# Release policy

## Approval

Publishing to npm, creating a release tag, or creating a GitHub Release always requires explicit final approval. Public source and a publishable package manifest do not grant standing approval for a future release.

## Versioning

During `0.x`, consumers pin exact versions.

The following are public API and require semantic-versioning treatment:

- Exported component names and props
- Public TypeScript types
- Public color and foundation token names
- Theme names and persistence behavior
- Keyboard, focus, and accessibility semantics
- Supported React, browser, or development-tool floors

Internal class names, exact DOM nesting, and non-public token names are private implementation details.

Emitted declarations are part of the public contract. A change to `dist/**/*.d.ts` is a public API change even when no source signature looks different, so `npm run validate` compares the emitted declarations against `tests/declarations.baseline.txt` and fails on any difference. Accept an intended change with `npm run declarations:update`, and record it in `CHANGELOG.md` and `docs/migration.md` in the same commit.

Before 1.0, breaking changes increment the minor version. After 1.0, breaking changes increment the major version.

Additive public API (a new export, entry point, prop, token, or widened union) ships in a minor release. A patch release changes behavior or fixes bugs only and adds nothing to the declarations, so a consumer pinned to a patch line can take every patch without reading the API reference. Two `0.x` patches (0.6.1 and 0.7.1) shipped additive API before this rule was written; they stand as history and are not the pattern to follow.

## Breaking changes

During `0.x`, breaking changes ship in minor releases without a deprecation window. A removal takes effect in the release that announces it in `CHANGELOG.md`, and consumers pin exact versions so the change only reaches them on a deliberate upgrade.

After 1.0, a withdrawn prop, export, token, or documented behavior is marked with a `@deprecated` tag naming its replacement and remains available for at least one minor release.

## Release path

1. Update `package.json`, the root package metadata in `package-lock.json`, `src/version.ts`, `README.md`, `CHANGELOG.md`, and the versioned scope example in `docs/design-contract.md` together. The README carries five version pins that `scripts/lib/package-contract.mjs` checks: the `What's new in <version>` heading, the pinned `npm install` command, the pinned tarball example, the `<major>.<minor>.x` compatibility table row, and the three versioned unpkg screenshot URLs. Regenerate the entry-point size table in `docs/api-reference.md` with `node scripts/check-bundle-size.mjs --table`. Review `docs/api-reference.md` and `docs/migration.md`, and update them whenever the public contract or consumer migration changes.
2. Run `SNUI_RELEASE_APPROVED=true npm run release:check` only after explicit final approval.
3. Commit the verified source, merge it through the protected `main` branch, and record the exact resulting commit.
4. Wait for that exact commit's required CI and CodeQL checks, including every supported Node line, x64 and ARM64 browser tests, Windows package validation, workflow lint, and the JavaScript/TypeScript and Actions CodeQL analyses. The required check names are the job names in `.github/workflows/ci.yml`, listed in `scripts/lib/release-checks.mjs` and verified by `scripts/check-release-ci.mjs` at publish time. A change to the Node matrix or to a job name therefore changes a required check name: update `release-checks.mjs` and the branch-protection rule on `main` in the same pull request, or the next release stalls on a check that no longer exists.
5. Confirm that no `.github/workflows/npm-publish.yml` run is queued, in progress, or waiting for environment approval. Do not publish another GitHub Release until the existing publication run completes.
6. Create the approved annotated `v<version>` tag and GitHub Release from that exact commit.
7. Let `.github/workflows/npm-publish.yml` verify the annotated tag and peeled commit, bind each required check to the newest exact-commit run of its trusted CI or CodeQL workflow, verify registry ordering, rebuild and test the source, stamp the release commit as `gitHead`, preserve one tarball, and publish that exact tarball through the protected `npm` environment.
8. Confirm that the publication workflow completed successfully and was not canceled. If GitHub replaced a pending run, rerun that canceled workflow after the active run completes and before publishing another GitHub Release.
9. Verify npm version, dist-tag, integrity, provenance, `gitHead`, packed files, repository links, and a clean consumer install.

Prerelease versions publish under `next`. Stable versions publish under `latest`. Never reuse, mutate, or unpublish a released version as a normal correction path.

## Release checks

Every release candidate must pass:

- Formatting, type-aware linting, Knip, type checking, unit tests, and coverage
- Chromium, Firefox, WebKit, and mobile Chromium browser tests
- Axe, contrast, reduced-motion, forced-colors, and screenshot checks
- 320-pixel reflow and 44-by-44-pixel coarse-pointer target checks
- Packed-artifact inspection and type-resolution checks
- Bundle-size checks and React plus React DOM externalization checks
- Classic `var` and output-module ESM Module Federation remote builds and runtime checks
- Changelog, API reference, compatibility table, migration note, community file, and package metadata review
- Runtime-only dependency audit (`npm run audit:runtime`)
- Signal K host-baseline and locked React Aria compatibility checks

`npm run validate` skips the browser tests in this list, while `npm run release:check` runs them.

Two dependency audits exist, and only one blocks. `npm run audit:runtime` audits the tree a consumer installs (`--omit=dev`), which is also what the Signal K plugin registry audits, so it runs inside `npm run validate` and fails the release. `npm run audit` covers the full tree, including development tooling whose advisories carry no runtime exposure for consumers. It runs as the separate `Full dependency audit` job in CI, which is not a required check for `main`, so a development-only advisory is visible and gets fixed on its own schedule without stopping a release. Do not add an advisory allowlist to make the runtime audit pass: fix or remove the dependency.

Each visual specification must have reviewed `ubuntu24-x64` and `ubuntu24-arm64` baselines before release, for every Playwright project it maps a screenshot to. Generate missing platform images with the manual `Update visual baselines` workflow on the exact candidate branch, then commit them and rerun normal CI. Never copy or rename a baseline across runner images or architectures.

The publish job uses npm OIDC trusted publishing with provenance. It receives `id-token: write` only after the protected `npm` environment is approved. Release workflows are serialized, reject an existing version or a stable version that would move `latest` backward, and publish only the tarball verified in the preceding job. GitHub retains at most one pending run in a concurrency group, so the release path checks that the queue is empty before publishing another GitHub Release and checks for canceled publication runs afterward. No npm token belongs in repository or environment secrets.

The package is established on npm and uses the GitHub Release workflow with OIDC. The external GitHub and npm settings that support that path are recorded in [repository setup](repository-setup.md).

`SNUI_RELEASE_APPROVED` is a mechanical local guard, not authorization. Set it to `true` only after the explicit approval required above.

## Stop conditions

Stop expanding the React component layer when any of these conditions persist across consumers:

- Consumers require incompatible variants of the same primitive.
- Adapters and overrides approach the amount of code removed.
- Shared components begin owning plugin data or business behavior.
- Release coordination prevents independent plugin releases.
- Bundle size, accessibility, or browser reliability becomes worse.

If expansion stops, retain the theme contract, accessibility rules, testing approach, and written standard.

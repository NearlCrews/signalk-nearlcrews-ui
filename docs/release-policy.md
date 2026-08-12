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

## Breaking changes

During `0.x`, breaking changes ship in minor releases without a deprecation window. A removal takes effect in the release that announces it in `CHANGELOG.md`, and consumers pin exact versions so the change only reaches them on a deliberate upgrade.

After 1.0, a withdrawn prop, export, token, or documented behavior is marked with a `@deprecated` tag naming its replacement and remains available for at least one minor release.

## Release path

1. Update `package.json`, `src/version.ts`, `README.md` (including both pinned install commands), `CHANGELOG.md`, `docs/design-contract.md` (including its versioned scope example), and `docs/migration.md` together.
2. Run `SNUI_RELEASE_APPROVED=true npm run release:check` only after explicit final approval.
3. Commit the verified source, merge it through the protected `main` branch, and record the exact resulting commit.
4. Wait for that exact commit's required CI and CodeQL checks, including every supported Node line, x64 and ARM64 browser tests, Windows package validation, workflow lint, and both CodeQL analyses.
5. Confirm that no `.github/workflows/npm-publish.yml` run is queued, in progress, or waiting for environment approval. Do not publish another GitHub Release until the existing publication run completes.
6. Create the approved annotated `v<version>` tag and GitHub Release from that exact commit.
7. Let `.github/workflows/npm-publish.yml` verify the tag and registry ordering, rebuild and test the source, stamp the release commit as `gitHead`, preserve one tarball, and publish that exact tarball through the protected `npm` environment.
8. Confirm that the publication workflow completed successfully and was not canceled. If GitHub replaced a pending run, rerun that canceled workflow after the active run completes and before publishing another GitHub Release.
9. Verify npm version, dist-tag, integrity, provenance, `gitHead`, packed files, repository links, and a clean consumer install.

Prerelease versions publish under `next`. Stable versions publish under `latest`. Never reuse, mutate, or unpublish a released version as a normal correction path.

## Release checks

Every release candidate must pass:

- Formatting, type-aware linting, Knip, type checking, unit tests, and coverage
- Chromium, Firefox, WebKit, and mobile Chromium browser tests
- Axe, contrast, reduced-motion, forced-colors, and screenshot checks
- 320-pixel reflow and coarse-pointer target checks
- Packed-artifact inspection and type-resolution checks
- Bundle-size and React-externalization checks
- Classic and ESM Module Federation fixture builds and runtime checks
- Changelog, compatibility table, migration-note, community-file, and package-metadata review
- Full dependency audit and runtime-only dependency audit

`npm run validate` skips the browser tests in this list, while `npm run release:check` runs them.

The publish job uses npm OIDC trusted publishing with provenance. It receives `id-token: write` only after the protected `npm` environment is approved. Release workflows are serialized, reject an existing version or a stable version that would move `latest` backward, and publish only the tarball verified in the preceding job. GitHub retains at most one pending run in a concurrency group, so the release path checks that the queue is empty before publishing another GitHub Release and checks for canceled publication runs afterward. No npm token belongs in repository or environment secrets.

The first publication must establish the package before npm can accept its trusted-publisher configuration. Follow the one-time bootstrap and repository checklist in [repository setup](repository-setup.md). All later publications use the GitHub Release workflow and OIDC.

`SNUI_RELEASE_APPROVED` is a mechanical local guard, not authorization. Set it to `true` only after the explicit approval required above.

## Stop conditions

Stop expanding the React component layer when any of these conditions persist across consumers:

- Consumers require incompatible variants of the same primitive.
- Adapters and overrides approach the amount of code removed.
- Shared components begin owning plugin data or business behavior.
- Release coordination prevents independent plugin releases.
- Bundle size, accessibility, or browser reliability becomes worse.

If expansion stops, retain the theme contract, accessibility rules, testing approach, and written standard.

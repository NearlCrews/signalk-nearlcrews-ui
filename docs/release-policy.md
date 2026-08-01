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

1. Update `package.json`, `src/version.ts`, `README.md`, which pins the version in both install commands, `CHANGELOG.md`, `docs/design-contract.md`, which embeds the version in its scope example, and migration guidance together.
2. Run `SNUI_RELEASE_APPROVED=true npm run release:check` only after explicit final approval.
3. Commit the verified source and push `main`.
4. Create the approved `v<version>` tag and GitHub Release from the verified commit.
5. Let `.github/workflows/npm-publish.yml` verify the tag, rebuild and test the source, preserve one tarball, and publish that exact tarball through the protected `npm` environment.
6. Verify npm version, dist-tag, provenance, packed files, and repository links.

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

The publish job uses npm OIDC trusted publishing with provenance. It receives `id-token: write` only after the protected `npm` environment is approved. No npm token belongs in repository or environment secrets.

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

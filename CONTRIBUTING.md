# Contributing

Review the [Code of Conduct](.github/CODE_OF_CONDUCT.md) before participating. Use the repository issue forms for confirmed bugs and feature proposals, and use Discussions for usage questions.

## Local checks

Use Node 22.13 or newer within the Node 22, 24, or 26 release lines. npm 12.0.1 is preferred. Install the locked dependency tree and run:

```sh
npm ci
npm run validate
npm run test:browser
git diff --check
```

Install Playwright browsers when needed:

```sh
npx --no-install playwright install chromium webkit
```

## Change rules

- Keep components presentational and independent of plugin domain state.
- Add or update keyboard and accessibility tests with interaction changes.
- Add contrast coverage when theme colors change.
- Keep every CSS rule beneath the exact version-qualified root.
- Keep descendant styles from crossing a nested root with another package version.
- Update `src/version.ts` whenever `package.json` changes version.
- Document public API changes in `CHANGELOG.md`.
- Treat exported components, props, types, tokens, theme persistence, keyboard behavior, focus behavior, and compatibility floors as versioned API.
- Update browser snapshots only after visually inspecting the result in every affected theme and viewport.
- Keep code, documentation, package metadata, and repository templates consistent.
- Do not publish, tag, or create a release without explicit final approval.

## Pull requests

1. Create a focused branch from `main`.
2. Add tests that fail without the change and pass with it.
3. Run `npm run validate` and the browser suite relevant to the change.
4. Include Light, Dark, and Night screenshots when presentation changes.
5. Confirm 320-pixel reflow and 44-pixel coarse-pointer targets when layout changes.
6. Update the changelog, migration guidance, and public API documentation when required.
7. Complete the pull request template and call out compatibility or semantic-versioning impact.

Never include credentials, access tokens, private server data, or unsanitized logs in issues, pull requests, fixtures, or snapshots.

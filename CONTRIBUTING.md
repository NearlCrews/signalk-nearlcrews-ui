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

Install Playwright browsers when needed:

```sh
npx --no-install playwright install chromium firefox webkit
```

Set `SNUI_BROWSER_PORT` to an unused port from 1024 through 65535 when another local browser suite is running on the default port, for example `SNUI_BROWSER_PORT=4273 npm run test:browser`.

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
- Keep every CSS rule beneath the exact version-qualified root. The `snui-tokens` class in `dist/tokens.css` is the one exception, recorded in the design contract; do not add a second.
- Keep descendant styles from crossing a nested root with another package version.
- Update `src/version.ts` whenever `package.json` changes version.
- Document public API changes in `CHANGELOG.md`.
- Treat exported components, props, types, tokens, theme persistence, keyboard behavior, focus behavior, and compatibility floors as versioned API.
- Update browser snapshots only after visually inspecting the result in every affected theme and viewport.
- Keep local ARM64 and x64 visual baselines separate because native controls and font rasterization differ by architecture.
- Keep hosted visual baselines separate by runner image and architecture through `SNUI_SNAPSHOT_VARIANT`.
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

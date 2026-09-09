# Repository and publication setup

This checklist records the external settings that cannot be enforced by files in the repository. Review it after changing GitHub, npm, repository, workflow, or ownership policy.

## GitHub repository

- Keep the repository public with `main` as the default branch.
- Enable issues and discussions. Disable the wiki and projects unless either gains an active maintainer.
- Allow squash and rebase merges, delete merged branches, and disable merge commits.
- Apply repository topics matching the `keywords` in `package.json` where GitHub supports them.
- Retain dependency, npm, and GitHub Actions labels for automated updates.

Restrict GitHub Actions to GitHub-owned actions, require full commit SHA pins, and give the default workflow token read-only permissions. Workflows must not approve pull requests. Third-party tools the workflows need (actionlint, zizmor, and lychee) are therefore not run as actions: each workflow downloads a pinned release archive with `curl`, verifies its SHA-256, and runs the binary. A workflow that uses a third-party action under this policy never starts, and the failure is visible only in the Actions run list.

Enable Dependabot alerts and security updates, secret scanning, push protection, private vulnerability reporting, and CodeQL default setup for JavaScript/TypeScript and GitHub Actions workflows.

## Protected branches and tags

After the first successful CI run, protect `main` with every required CI job, including workflow lint, all supported Node lines, Windows package validation, x64 and ARM64 browser tests, and the JavaScript/TypeScript and Actions CodeQL analyses. Require pull requests, resolved conversations, linear history, and current branches. Block force pushes and deletion. Keep an administrator recovery path for repository-level emergencies.

Protect tags matching `v*` from updates and deletion. A release tag must be annotated, exactly match `v<package version>`, and peel to the release commit contained in `main`.

## npm environment

Create a protected GitHub environment named `npm`. Require review by the repository owner before its publish job can start. Do not store an npm token in the repository, organization, or environment.

The package is an npm dependency only. Do not add Signal K plugin keywords, App Store metadata, or a Signal K application entry.

## npm trusted publishing

The package is already established on npm. Keep one [GitHub Actions trusted publisher](https://docs.npmjs.com/trusted-publishers) for this package, configured with the `NearlCrews/signalk-nearlcrews-ui` repository, `.github/workflows/npm-publish.yml`, and the protected `npm` environment.

Normal publication starts with an approved `v<version>` GitHub Release. The workflow verifies, tests, packs, and publishes the exact artifact with OIDC provenance. Its publish job needs `id-token: write` and `contents: read`; it does not need an npm token. Do not publish a normal release from a local npm session.

After changing the repository owner or name, workflow filename, environment name, package ownership, or npm organization policy, review the trusted-publisher configuration on npm before the next release. Confirm that the next approved publication carries provenance and that its `gitHead` matches the release commit.

# Repository and publication setup

This checklist records the external settings that cannot be enforced by files in the repository. Review it after creating the repository and after changing GitHub or npm organization policy.

## GitHub repository

- Keep the repository public with `main` as the default branch.
- Enable issues and discussions. Disable the wiki and projects unless either gains an active maintainer.
- Allow squash and rebase merges, delete merged branches, and disable merge commits.
- Apply the repository topics listed in `package.json` where GitHub supports them.
- Retain dependency, npm, and GitHub Actions labels for automated updates.

Restrict GitHub Actions to GitHub-owned actions, require full commit SHA pins, and give the default workflow token read-only permissions. Workflows must not approve pull requests.

Enable Dependabot alerts and security updates, secret scanning, push protection, private vulnerability reporting, and CodeQL default setup for JavaScript and TypeScript.

## Protected branches and tags

After the first successful CI run, protect `main` with every required CI job. Require pull requests, resolved conversations, linear history, and current branches. Block force pushes and deletion. Keep an administrator recovery path for repository-level emergencies.

Protect tags matching `v*` from updates and deletion. A release tag must exactly match `v<package version>` and identify a commit contained in `main`.

## npm environment

Create a protected GitHub environment named `npm`. Require review by the repository owner before its publish job can start. Do not store an npm token in the repository, organization, or environment.

The package is an npm dependency only. Do not add Signal K plugin keywords, marketplace metadata, or a Signal K application entry.

## One-time npm bootstrap

npm cannot create a trusted-publisher relationship for a package that does not exist yet. After explicit final publication approval, perform the initial publish from a trusted local machine with a short-lived npm session:

```sh
npm login
npm whoami
SNUI_RELEASE_APPROVED=true npm run release:check
test -z "$(git status --porcelain)"
test "$(git branch --show-current)" = "main"
git fetch origin main --tags
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
PACKAGE_VERSION="$(node -p "require('./package.json').version")"
git tag --annotate "v${PACKAGE_VERSION}" --message "v${PACKAGE_VERSION}"
git push origin "v${PACKAGE_VERSION}"
SNUI_RELEASE_APPROVED=true npm publish --access public --provenance=false
```

The tag and publish commands require separate explicit final approval. The clean-worktree, branch, and remote checks ensure the package is built from the exact tagged commit on `main`.

The first local publication is the only provenance exception. It establishes package ownership so npm can accept the trusted-publisher relationship. Do not create a GitHub Release for that already-published version because the release event would attempt to publish it again.

While the short-lived npm session is still active, create and verify the trusted-publisher relationship with npm 12 or newer:

```sh
npx --yes npm@12.0.1 trust github signalk-nearlcrews-ui \
  --file npm-publish.yml \
  --repo NearlCrews/signalk-nearlcrews-ui \
  --env npm \
  --allow-publish \
  --yes
npx --yes npm@12.0.1 trust list signalk-nearlcrews-ui
npm logout
```

Revoke the short-lived credential after logout. Never paste it into a command, repository file, issue, pull request, workflow, or build log.

Future versions must use an approved `v<version>` GitHub Release. The workflow verifies, tests, packs, and publishes the exact artifact with OIDC provenance.

# Pull request

## Summary

<!-- Explain what changed, why it changed, and the consumer impact. -->

## Change type

- [ ] Bug fix
- [ ] Feature
- [ ] Breaking change
- [ ] Refactor or cleanup
- [ ] Documentation
- [ ] Dependency or tooling update

## Public contract

- [ ] Exported API and semantic-versioning impact were reviewed.
- [ ] Package ownership remains presentational and excludes consumer domain behavior.
- [ ] Theme persistence, CSP, style isolation, and Module Federation impact were reviewed.
- [ ] React and React DOM remain host singletons, and the package remains bundled per remote.
- [ ] README, API reference, design contract, changelog, compatibility, and migration guidance were updated when needed.

## Verification

- [ ] `npm run validate` passes.
- [ ] `npm run test:browser` passes when UI or browser behavior changed.
- [ ] Keyboard behavior, visible focus, and full Axe results pass.
- [ ] Auto, System, Light, Dark, Night, reduced motion, and forced colors were checked when relevant.
- [ ] 320-pixel reflow and 44-by-44-pixel coarse-pointer targets pass when layout changed.
- [ ] Local Markdown links resolve when documentation changed.
- [ ] Updated screenshots were visually inspected.
- [ ] `git diff --check` passes.
- [ ] No credentials, private vessel data, or unsanitized logs are included.

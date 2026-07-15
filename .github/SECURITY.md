# Security policy

## Supported versions

Security fixes target the latest published release.

| Version                  | Supported |
| ------------------------ | --------- |
| Latest published release | Yes       |
| Earlier releases         | No        |

## Report a vulnerability

Do not report a vulnerability in a public issue, discussion, pull request, or log attachment.

Use a [private GitHub security advisory](https://github.com/NearlCrews/signalk-nearlcrews-ui/security/advisories/new). Include:

- The affected package version and consumer environment
- A clear description and potential impact
- Minimal reproduction steps or a proof of concept
- Any suggested mitigation
- A safe way to contact you for follow-up

The maintainer will acknowledge the report, assess severity, coordinate a correction, and publish details after a fix is available. Disclosure timing will be coordinated with the reporter.

## Security boundary

The published package has no direct runtime dependencies and uses React as a peer dependency. It does not make network requests, call Signal K APIs, or handle plugin configuration. It writes the shared theme preference to browser local storage and installs package CSS in the rendered panel's owner document.

Consumers are responsible for validating data, enforcing authorization, protecting Signal K requests, supplying a trusted CSP nonce when required, and keeping React and the package current.

Repository checks include dependency audits, Dependabot, SHA-pinned GitHub Actions, type-aware linting, Knip, packed-package inspection, React externalization checks, browser accessibility tests, and npm provenance.

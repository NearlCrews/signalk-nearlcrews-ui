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

The published package uses React Aria and React Aria Components as runtime dependencies, with React and React DOM as host-provided peer dependencies. It does not make network requests, call Signal K APIs, or handle plugin configuration. It writes only the shared theme preference to browser local storage, installs package CSS in the rendered panel's owner document, and portals overlays only into the owning `PanelRoot`.

`SecretInput` is a presentation control, not a secret store or redaction boundary. Revealing a value changes the native input type, while the value remains available to the consumer and browser. Consumers are responsible for secret storage, log and notification redaction, validation, authorization, protected Signal K requests, and safe configuration persistence. Do not place credentials or private vessel data in toast content, compatibility notices, diagnostics, screenshots, or browser storage.

Consumers must supply a trusted CSP nonce when required, resolve React and React DOM through the Signal K Admin host singletons with Module Federation fallback imports disabled, and keep the package, its runtime dependencies, and both peer implementations current. A consumer remote must not embed separate React or React DOM implementations.

Repository checks include full and production dependency audits, Dependabot, SHA-pinned GitHub Actions, type-aware linting, Knip, packed-package inspection, React and React DOM externalization checks, browser accessibility tests, and npm provenance.

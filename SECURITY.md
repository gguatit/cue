# Security Policy

## Supported versions

Security fixes are provided for the latest release. Older releases may require a manual update.

## Report a vulnerability privately

Do not open a public issue for a vulnerability.

Use GitHub Security Advisories:

https://github.com/gguatit/cue/security/advisories/new

Include:

- Cue version and Windows version
- What an attacker can do
- Exact reproduction steps or a minimal proof of concept
- Whether administrator mode, the watchdog service, Cue Air, or a custom AI endpoint is involved

Do not include API keys, screenshots of private screens, or personal data.

## Scope

In scope:

- Capture protection bypasses
- API key exposure or sending a key to the wrong endpoint
- Cue Air authentication or answer exposure
- Privilege escalation through the protected copy, scheduled tasks, or watchdog service
- Update signature or release manifest bypass
- Local file or command injection

Out of scope:

- Detection by a human invigilator, hardware capture cards, or an external recorder
- The documented limitation that protection is best effort and cannot defeat administrators, Group Policy, or kernel-level tools
- Requests to make the app undetectable in prohibited exams

## Disclosure

Please allow time to reproduce and fix the issue before public disclosure. Credit can be included if requested.

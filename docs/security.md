# Security — threat model and hardening notes

For vulnerability disclosure and reporting, see [`SECURITY.md`](../SECURITY.md)
in the project root.

## Threat model

[TODO: brief description of the system's threat model — what kind of
application is this, who are the adversaries, what attack surface exists.]

## Assets

What we're protecting:

- [TODO: user data, credentials, financial records, etc.]
- [TODO: infrastructure access, API keys, service accounts]
- [TODO: availability / uptime guarantees]

## Trust boundaries

Where untrusted input crosses into the system:

- [TODO: public API endpoints]
- [TODO: webhook ingress]
- [TODO: user-uploaded content]
- [TODO: third-party service callbacks]

## Known risks & mitigations

| Risk | Mitigation | Status |
|---|---|---|
| [TODO: risk description] | [TODO: how it's addressed] | [TODO: mitigated / accepted / open] |

## Hardening notes

### TLS

[TODO: TLS termination strategy — at load balancer, at app, both.]

### Secret management

[TODO: how secrets are stored, rotated, and accessed at runtime.
Reference `.env.example` for the variable inventory.]

### Authentication & authorization

[TODO: auth mechanism (JWT, session, API key), token lifetimes,
role model, account lockout policy.]

### Dependency policy

[TODO: how dependencies are vetted, pinned, and updated.
Automated scanning tools in use (Dependabot, Snyk, etc.).]

## Dependencies & CVE policy

[TODO: how CVEs in dependencies are triaged and patched.
SLA for critical vs. non-critical vulnerabilities.
Who is responsible for monitoring and applying updates.]

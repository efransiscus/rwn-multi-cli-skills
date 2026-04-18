# [TODO: project name]

[TODO: one-sentence project description]

## Root file policy

Root is strict. The authoritative allowlist lives in
`docs/architecture/0001-root-file-exceptions.md` — new root files require an
ADR amendment before creation. The `.claude/hooks/pretool-write-edit.sh` hook
and the Kimi/Kiro equivalents enforce this at the tool layer.

## Project structure

```
src/            Source code (app/, lib/, types/)
tests/          All tests (unit/, integration/, e2e/)
docs/           Project knowledge (architecture/, specs/, standards/, guides/, api/)
infra/          IaC (terraform/, k8s/, ci/, docker/)
migrations/     Database migrations (versions/, seeds/)
scripts/        Automation scripts
tools/          Dev tooling configs (playwright/, linters/)
config/         Runtime app configuration
assets/         Static assets (images/, fonts/, templates/)
```

## AI framework (dot-prefixed, not project code)

```
.ai/            Shared multi-CLI framework (SSOT, handoffs, activity log)
.kiro/          Kiro CLI config (agents, steering, skills, hooks)
.kimi/          Kimi CLI config (agents, steering, resources, hooks)
.claude/        Claude Code config (agents, skills, settings)
```
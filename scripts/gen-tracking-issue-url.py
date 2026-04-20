"""Generate the pre-filled GitHub issue URL for the project-level tracking issue.

This is the in-repo tracking issue (efransiscus/rwn-multi-cli-skills) that the user
closes once Kiro upstream fixes the subagent hook-inheritance bug. Separate from
`gen-kiro-issue-url.py`, which targets the upstream Kiro repo.
"""
from urllib.parse import quote
from pathlib import Path

title = (
    "Track upstream Kiro bug: subagent hook inheritance broken — "
    "affects our safety layer"
)

body = """## Description

This project's multi-CLI safety layer relies on Kiro CLI firing `preToolUse` hooks declared in subagent configs. **Kiro 0.11.130 does NOT fire those hooks for spawned subagents** — only for the orchestrator session. Kiro subagents (coder, tester, debugger, etc.) write files without hook enforcement.

**Severity:** High for Kiro side of the safety model. Mitigated (soft) via prompt-level SAFETY RULES injected into all 12 subagent configs.

## Reproduction steps

1. From this repo root, run Kiro and spawn the `coder` subagent.
2. Ask coder to write `evil.txt` at repo root.
3. Observe the filesystem.

See `.ai/reports/kiro-bug-subagent-hook-inheritance.md` for the full upstream-bound bug report.

## Expected behavior

`root-file-guard.sh` fires on the subagent's `fs_write` attempt, blocks the write with exit 2 + a stderr message. `evil.txt` is not created.

## Actual behavior

`evil.txt` is created. No hook invocation. No stderr. Confirmed across all 12 subagent configs — all JSON-valid, all hooks pass `bash .kiro/hooks/test_hooks.sh` (15/15) when invoked directly. The Kiro runtime just doesn't invoke them on subagent tool calls.

## Environment

- OS: Windows 10/11
- Shell / terminal: Git Bash (`C:\\Program Files\\Git\\bin\\bash.exe`)
- Kiro CLI version: 0.11.130
- Affected: all 12 subagent configs in `.kiro/agents/*.json`

## Additional context

**Upstream bug:** to be filed at https://github.com/kirodotdev/Kiro/issues/new — paste-ready URL in `.ai/reports/kiro-bug-prefilled-issue-url.txt`.

**Mitigation already in this repo:** SAFETY RULES prompt preamble in all 12 subagent configs (see `.ai/handoffs/to-kiro/done/017-wave4d-runtime-hole-mitigation.md`). Empirically tested — coder subagent REFUSES `evil.txt` writes via prompt-level self-enforcement. Soft (relies on LLM following instructions) but functional.

**Close this issue when:** Kiro upstream releases a fix AND we verify the hooks fire correctly for spawned subagents (empirical re-test per handoff 017).

**Related:**
- `.ai/known-limitations.md` — Kiro hook-inheritance section
- `.ai/reports/kiro-bug-subagent-hook-inheritance.md` — full upstream report
- `.kiro/agents/*.json` — all 13 configs with SAFETY RULES block
- `.kiro/hooks/test_hooks.sh` — regression suite (passes; hooks work when invoked directly)
"""

url = (
    "https://github.com/efransiscus/rwn-multi-cli-skills/issues/new?title="
    + quote(title)
    + "&body="
    + quote(body)
)

out = Path(".ai/reports/kiro-bug-tracking-issue-url.txt")
out.write_text(url + "\n", encoding="utf-8", newline="")
print(f"URL_LENGTH: {len(url)}")
print(f"WROTE: {out}")

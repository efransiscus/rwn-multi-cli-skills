# Codebase Gimmick Audit — Files, Configs & Docs That Exist But Don't Run

**Auditor:** reviewer  
**Date:** 2026-04-20  
**Scope:** Entire repo — hooks, CI/CD, tests, docs, configs, handoffs, archive  
**Method:** Read-only filesystem inspection + cross-reference against wiring configs, activity log, and prior audit reports.

---

## Executive Summary

| Category | Items Audited | Gimmicks Found | Severity Breakdown |
|---|---|---|---|
| CLI hooks | 22 scripts across 3 CLIs | 6 dead/unfired | 2 CRITICAL, 2 HIGH, 2 MEDIUM |
| CI/CD | 1 workflow + 4 test scripts | 1 partially operational | 1 MEDIUM |
| Docs / protocols | 6 process docs | 3 never executed | 2 HIGH, 1 MEDIUM |
| Configs / snippets | 5 config artifacts | 2 inactive | 1 CRITICAL, 1 MEDIUM |
| Directories / scaffolding | 8 dirs advertised as active | 5 empty/ghost | 5 LOW |
| Reports / handoffs | 14 files in `.ai/reports/` | 1 draft never filed | 1 HIGH |

**Total: 18 distinct gimmick items.**

---

## 1. Hooks — Scripts That Exist But Don't Fire (CRITICAL / HIGH)

### 1.1 Kimi CLI — 4 core bash guards: DEAD CODE (CRITICAL)

**Files:**
- `.kimi/hooks/root-guard.sh`
- `.kimi/hooks/framework-guard.sh`
- `.kimi/hooks/sensitive-guard.sh`
- `.kimi/hooks/destructive-guard.sh`

**What exists:** All 4 scripts are on disk, pass `test_hooks.sh` (PASS 18/18), and are documented in `.kimi/hooks/README.md`.

**What's missing:** They are **not registered in the global `~/.kimi/config.toml`**. The user's actual Kimi global config only wires one PowerShell hook (`safety-check.ps1`). The bash guards are completely invisible to the Kimi runtime. This is a documented known limitation (`.ai/known-limitations.md` §2, "Awaiting user paste" since 2026-04-19 23:30).

**Severity: CRITICAL** — the primary safety layer (ADR-0001 root-file policy, sensitive-file protection, destructive-command blocking) is a no-op for Kimi sessions.

**Fix:** Paste `.ai/config-snippets/kimi-hooks.toml` into `~/.kimi/config.toml` and restart Kimi Code CLI.

---

### 1.2 Kimi CLI — 3 auxiliary session hooks: UNWIRED DEAD CODE (MEDIUM)

**Files:**
- `.kimi/hooks/git-status.sh` — documented as `SessionStart` injector
- `.kimi/hooks/handoffs-remind.sh` — documented as `SessionStart` reminder
- `.kimi/hooks/git-dirty-remind.sh` — documented as `Stop` reminder

**What exists:** Scripts on disk, documented in `.kimi/hooks/README.md` lines 14–18.

**What's missing:** These 3 hooks are **not in `.ai/config-snippets/kimi-hooks.toml`** and therefore not in the global `~/.kimi/config.toml`. They will never fire. They are "nice to have" but currently unreachable code.

**Severity: MEDIUM** — documented features that silently do nothing.

**Fix:** Either add them to the config snippet (and tell the user to re-paste), or delete them to eliminate confusion.

---

### 1.3 Kiro CLI — subagent hook declarations: CONFIGURED BUT BROKEN (HIGH)

**Files:** All 12 `.kiro/agents/*.json` subagent configs (coder, reviewer, tester, debugger, refactorer, doc-writer, security-auditor, ui-engineer, e2e-tester, infra-engineer, release-engineer, data-migrator).

**What exists:** Every subagent config declares a full `hooks` block:
```json
"hooks": {
  "preToolUse": [
    { "matcher": "fs_write", "command": "bash .kiro/hooks/root-file-guard.sh" },
    ...
  ],
  "agentSpawn": [ { "command": "bash .kiro/hooks/activity-log-inject.sh" } ],
  "stop": [ { "command": "bash .kiro/hooks/activity-log-remind.sh" } ]
}
```

**What's missing:** The Kiro CLI runtime **does not fire these hooks for subagent sessions**. Empirically confirmed 2026-04-19 21:22. The hooks only work for the orchestrator (main agent) session. The subagent configs contain 12×3 = 36 hook declarations that are effectively dead code at runtime.

**Severity: HIGH** — the agents that actually perform mutations (coder, tester, etc.) bypass the safety layer. Mitigation is soft (prompt-level SAFETY RULES).

**Fix:** Requires upstream Kiro runtime fix. Prompt hardening is the only available workaround.

---

### 1.4 Claude Code — subagent hooks: UNTESTED (LOW/MEDIUM)

**What exists:** `.claude/settings.json` wires all 5 hooks correctly for orchestrator sessions.

**What's missing:** No empirical test has verified whether Claude's `PreToolUse` hooks propagate to subagents spawned via the `Agent` tool. The docs say "Subagent hook behavior not yet empirically verified" (`.ai/known-limitations.md` §3).

**Severity: LOW/MEDIUM** — not confirmed broken, but not confirmed working either. An untested safety net is a gimmick until proven.

**Fix:** Run the evil-file-write test pattern against a Claude subagent and document the result.

---

## 2. CI/CD — Workflow That Exists But Is Hard To Verify (MEDIUM)

### 2.1 `.github/workflows/framework-check.yml` — no observability

**What exists:** A complete GitHub Actions workflow with 4 steps (Claude hooks test, Kimi hooks test, Kiro hooks test, SSOT drift check). Triggers on `pull_request` and `push` to `master`.

**What's missing:**
- No `workflow_dispatch` trigger — cannot be run manually from the GitHub UI.
- No status badge in `README.md` — CI health is invisible at a glance.
- No artifact upload on failure — Linux-runner failures are not debuggable without local reproduction.
- No run history verifiable from repo contents — the activity log is the sole source of truth claiming "CI is green."

**Severity: MEDIUM** — the workflow is likely active (pushed 2026-04-20) but its operational status is unverifiable by anyone inspecting the repo alone.

**Fix:** Add `workflow_dispatch:`, add a README badge, add `actions/upload-artifact` on failure.

---

## 3. Tests & Protocols — Documents That Have Never Been Executed (HIGH)

### 3.1 `.ai/tests/concurrency-test-protocol.md` — NEVER RUN (HIGH)

**What exists:** A comprehensive 211-line manual runbook defining 6 concurrency scenarios (S1–S6) for testing simultaneous multi-CLI writes to shared files.

**What's missing:** The reporting table (lines 160–169) is completely blank. No `.ai/tests/concurrency-test-results-*.md` file exists. No activity-log entry mentions executing any scenario. The document itself calls three-CLI concurrency "the scariest **untested** unknown in this framework."

**Severity: HIGH** — this is the only document addressing the framework's most critical operational risk, and it has zero empirical data behind it.

**Fix:** Run S1 + S2b (highest-risk) and write results to a dated results file.

---

## 4. Configs & Snippets — Ready But Never Applied (CRITICAL / MEDIUM)

### 4.1 `.ai/config-snippets/kimi-hooks.toml` — READY, NEVER PASTED (CRITICAL)

**What exists:** A paste-ready TOML snippet with 4 `[[hooks]]` blocks to wire Kimi's bash guards.

**What's missing:** The user has **never pasted it** into `~/.kimi/config.toml`. Created 2026-04-19 23:30. Status remains "Awaiting user paste." Until pasted, Kimi has no automated guard coverage.

**Severity: CRITICAL** — same root cause as §1.1. This file is the fix that hasn't been applied.

---

### 4.2 `.claude/settings.local.json` — dead / malformed permissions (MEDIUM)

**What exists:** A permissions file with 11 `allow` entries.

**What's missing:**
- Line 7: `"Skill(update-config)"` — skill does not exist anywhere in `.claude/skills/`, `.kimi/`, or `.kiro/`.
- Line 12: `"Bash(python -c ' *)"` — truncated/malformed permission string (unclosed single quote + wildcard).
- Line 6: `"Read(//tmp/**)"` — double-leading-slash typo.

**Severity: MEDIUM** — stale/malformed config that could confuse audit or security review.

---

## 5. Reports & Drafts — Written But Never Filed (HIGH)

### 5.1 `.ai/reports/kiro-bug-subagent-hook-inheritance.md` — DRAFT, NEVER FILED (HIGH)

**What exists:** A complete upstream bug report draft (66 lines) with title, severity, environment, reproduction, impact, and workaround.

**What's missing:** The `<FILL IN>` placeholder for Kiro CLI version is still empty. No issue tracker link has ever been added. The report has never been submitted. `.ai/known-limitations.md` line 45 still reads `**Upstream bug filed:** <pending — user action> (link TBD)`.

**Severity: HIGH** — creates the illusion that the bug has been reported upstream. The underlying runtime issue (§1.3) cannot be fixed without upstream action.

**Fix:** File the report (or delete it and document it as an internal-only draft).

---

## 6. Directories & Scaffolding — Advertised But Empty (LOW)

### 6.1 `docs/standards/` — empty except template

**Files:** `docs/standards/.gitkeep`, `docs/standards/TEMPLATE.md` (8 TODOs)

**What's missing:** No actual standards exist. Multiple agent configs instruct subagents to "read `docs/standards/*.md` before reviewing" — these instructions currently no-op.

**Severity: LOW** — structural readiness gap.

---

### 6.2 `docs/specs/` — empty except template

**Files:** `docs/specs/.gitkeep`, `docs/specs/TEMPLATE.md` (13 TODOs)

**What's missing:** No actual specs exist. Same no-op problem as §6.1.

**Severity: LOW**

---

### 6.3 `infra/ci/` — ghost directory

**Files:** `infra/ci/.gitkeep` only

**What's missing:** Directory is advertised in `README.md` as "CI/CD workflows" but contains nothing. The actual CI workflow lives in `.github/workflows/` (GitHub-mandated location), making this directory redundant.

**Severity: LOW**

---

### 6.4 `scripts/` — empty except README

**Files:** `scripts/.gitkeep`, `scripts/README.md`

**What's missing:** No scripts. The `README.md` is a stub.

**Severity: LOW**

---

### 6.5 `tools/linters/` and `tools/playwright/` — empty

**Files:** Empty directories (no glob matches beyond `tools/README.md`).

**What's missing:** Nothing. These are placeholder directories for future tools.

**Severity: LOW**

---

## 7. Docs — Stale / Misleading Content (LOW / INFO)

### 7.1 `.archive/README.md` — pending ADR amendment note (INFO)

**Line 113–115:** References an ADR-0001 Category E amendment for `.archive/` recognition that is noted as "amendment pending in handoff to doc-writer." `.archive/` is clearly in active use (68 files), so this note is likely stale.

**Severity: INFO**

---

### 7.2 `.ai/known-limitations.md` — stale handoff-numbering section (MEDIUM)

**Lines 103–104:** States "Full fix deferred: switch to timestamp-based numbering … Not yet implemented." This was actually implemented on 2026-04-20 10:40 (see activity log). The doc is now inaccurate.

**Severity: MEDIUM** — stale documentation can mislead operators about current capabilities.

---

## 8. What Is NOT a Gimmick (Verified Operational)

| Item | Status | Evidence |
|---|---|---|
| `.claude/settings.json` hooks | **OPERATIONAL** — all 5 wired, orchestrator fires correctly | `settings.json` lines 4–62; known-limitations §3 |
| `.kiro/agents/orchestrator.json` hooks | **OPERATIONAL** — main agent fires correctly | JSON `hooks` block; known-limitations §1 |
| `test_hooks.sh` (all 3 CLIs) | **OPERATIONAL** — run manually and wired in CI | Activity log PASS reports; CI step references |
| `check-ssot-drift.sh` | **OPERATIONAL** — run manually and wired in CI | Activity log ad-hoc runs; CI step reference |
| `.archive/` | **OPERATIONAL** — 68 files archived via `git mv` | `.archive/ai/reports/2026-04-18/` + 46 handoffs |
| `.ai/activity/log.md` | **OPERATIONAL** — actively prepended by all 3 CLIs | 346 lines, last entry 2026-04-20 12:45 |
| `.ai/handoffs/to-*/done/` | **OPERATIONAL** — used and then archived | 46 done handoffs archived to `.archive/` |
| Handoff queues (`open/`) | **OPERATIONAL** — currently empty, protocol working | All 3 `open/` dirs empty as of latest activity |

---

## Summary Table: All Gimmicks Rated

| # | Item | Path | Severity | Why it's a gimmick | Fix path |
|---|---|---|---|---|---|
| 1 | Kimi 4 bash guards unwired | `.kimi/hooks/*-guard.sh` | **CRITICAL** | Scripts exist & pass tests, but `~/.kimi/config.toml` lacks registration | Paste snippet from `.ai/config-snippets/kimi-hooks.toml` |
| 2 | Kimi config snippet never pasted | `.ai/config-snippets/kimi-hooks.toml` | **CRITICAL** | Ready since 2026-04-19, zero user action | User pastes into `~/.kimi/config.toml` |
| 3 | Kiro subagent hook inheritance broken | `.kiro/agents/*.json` (12 files) | **HIGH** | 36 hook declarations in JSON are runtime no-ops | Upstream Kiro fix; keep prompt hardening |
| 4 | Concurrency test protocol never run | `.ai/tests/concurrency-test-protocol.md` | **HIGH** | 6-scenario runbook, zero empirical results | Run S1+S2b, write results file |
| 5 | Kiro bug report draft never filed | `.ai/reports/kiro-bug-subagent-hook-inheritance.md` | **HIGH** | Complete draft, no issue tracker link | File upstream or delete |
| 6 | Kimi 3 auxiliary hooks unwired | `.kimi/hooks/git-status.sh`, `handoffs-remind.sh`, `git-dirty-remind.sh` | **MEDIUM** | Scripts exist, not in config snippet | Wire in snippet or delete |
| 7 | Claude subagent hooks untested | `.claude/agents/*.md` | **MEDIUM** | Assumed working, never empirically verified | Run evil-file-write test on subagent |
| 8 | CI workflow unverifiable | `.github/workflows/framework-check.yml` | **MEDIUM** | No badge, no dispatch, no artifacts | Add `workflow_dispatch`, badge, artifacts |
| 9 | `.claude/settings.local.json` dead/malformed perms | `.claude/settings.local.json` | **MEDIUM** | References non-existent skill + truncated entry | Clean up or remove file |
| 10 | `known-limitations.md` stale section | `.ai/known-limitations.md` lines 103–104 | **MEDIUM** | Says "not yet implemented" for feature that is live | Update doc |
| 11 | `docs/standards/` empty | `docs/standards/` | **LOW** | Only TEMPLATE.md + .gitkeep | Add standards or remove from agent instructions |
| 12 | `docs/specs/` empty | `docs/specs/` | **LOW** | Only TEMPLATE.md + .gitkeep | Add specs or remove from agent instructions |
| 13 | `infra/ci/` ghost dir | `infra/ci/.gitkeep` | **LOW** | Advertised as CI dir, empty | Populate or remove |
| 14 | `scripts/` empty | `scripts/` | **LOW** | Only .gitkeep + README.md | Populate or remove |
| 15 | `tools/linters/` empty | `tools/linters/` | **LOW** | Placeholder, never used | Populate or remove |
| 16 | `tools/playwright/` empty | `tools/playwright/` | **LOW** | Placeholder, never used | Populate or remove |
| 17 | `.archive/README.md` stale note | `.archive/README.md` lines 113–115 | **INFO** | Pending amendment that likely already landed | Verify and update |
| 18 | ~70 TODO placeholders across 10 files | `docs/*/TEMPLATE.md`, `README.md`, etc. | **LOW** | Intentional scaffolding for unstarted project | Expected; not a bug |

---

## Recommendations (Prioritized)

1. **CRITICAL — Paste Kimi hooks snippet.** This is a one-time user action. Without it, Kimi sessions have zero automated safety enforcement.
2. **HIGH — File or delete the Kiro bug report draft.** The draft creates false confidence that the issue has been escalated upstream.
3. **HIGH — Run the concurrency test protocol.** Even a partial run provides more confidence than "untested."
4. **MEDIUM — Wire or delete the 3 unwired Kimi auxiliary hooks.** Dead code in a safety-critical directory is confusing.
5. **MEDIUM — Add CI observability.** `workflow_dispatch`, README badge, and failure artifacts.
6. **MEDIUM — Update `.ai/known-limitations.md`.** Fix the stale handoff-numbering section and the Kiro bug "pending" placeholder.
7. **LOW — Clean up ghost directories.** Either populate `infra/ci/`, `scripts/`, `tools/linters/`, `tools/playwright/` or remove them.
8. **LOW — Add a note to agent configs about empty `docs/standards/` and `docs/specs/`** so subagents don't waste turns reading templates.

---

*End of report. No code was modified.*

# Hook / Guard Configuration Audit — Paper vs. Practice

**Date:** 2026-04-20  
**Scope:** `.kimi/`, `.kiro/`, `.claude/` hook scripts and their runtime wiring.  
**Method:** Read-only file inspection + cross-reference against `.ai/known-limitations.md`.

---

## Executive Summary

| CLI | Guard scripts on disk | Config that wires them | Actually fires? | Evidence |
|---|---|---|---|---|
| **Kimi** | 10 `.sh` hooks | `~/.kimi/config.toml` wires **1** PowerShell hook only | **NO** — 4 core bash guards are dead code | `config.toml` lacks `[[hooks]]` blocks for bash guards; `known-limitations.md` §2 |
| **Kiro** | 7 `.sh` hooks | `.kiro/agents/*.json` wire them per-agent | **PARTIAL** — main agent only; subagents bypass hooks | `known-limitations.md` §1; empirically confirmed bug |
| **Claude** | 5 `.sh` hooks | `.claude/settings.json` wires all 5 | **YES** (orchestrator); subagent behavior **unverified** | `known-limitations.md` §3; `settings.json` has full hook map |

---

## 1. Kimi CLI

### 1.1 Guard scripts that exist

Directory: `.kimi/hooks/` (10 files)

| File | Purpose |
|---|---|
| `activity-log-inject.sh` | Injects top of `.ai/activity/log.md` at turn start |
| `activity-log-remind.sh` | Reminds to update activity log if stale (>60 min) |
| `destructive-guard.sh` | Blocks `rm -rf /`, `git push --force`, `DROP TABLE`, etc. |
| `framework-guard.sh` | Blocks writes to `.claude/` and `.kiro/` |
| `git-dirty-remind.sh` | Reminds about uncommitted changes beyond activity log |
| `git-status.sh` | Injects `git status --short` at session start |
| `handoffs-remind.sh` | Lists pending handoffs for kimi-cli |
| `root-guard.sh` | Blocks root-file writes not in ADR-0001 allowlist |
| `sensitive-guard.sh` | Blocks writes to `.env*`, `*.key`, `id_rsa*`, secrets, credentials |
| `test_hooks.sh` | Regression suite (pipe-tests all guards) |

### 1.2 Global config wiring — `~/.kimi/config.toml`

**File:** `~/.kimi/config.toml` (global user-scope config)

```toml
[[hooks]]
event = "PreToolUse"
matcher = "Shell"
command = "powershell -File C:/Users/rwn34/.kimi/hooks/safety-check.ps1"
timeout = 10
```

**Finding:** Only **one** hook is registered — a PowerShell script (`safety-check.ps1`) matched on `Shell`.  
The 4 core bash guards (`root-guard.sh`, `framework-guard.sh`, `sensitive-guard.sh`, `destructive-guard.sh`) are **absent**.  
The 6 non-guard hooks (`activity-log-inject`, `activity-log-remind`, `git-dirty-remind`, `git-status`, `handoffs-remind`) are also absent.

### 1.3 Do they actually fire?

**No.** The bash hooks are dead code as far as the Kimi runtime is concerned.

`.ai/known-limitations.md` states explicitly (§2):

> "Kimi's 4 bash guard scripts … exist and pass pipe-tests, but they're NOT registered as active hooks in `~/.kimi/config.toml` … When an agent runs `fs_write` or `execute_bash`, NO guard fires because no guard is registered."

**Severity: CRITICAL** — the primary safety layer (root-file policy, sensitive-file protection, destructive-command blocking) is completely inactive for Kimi sessions.

**Mitigation in flight:** `.ai/config-snippets/kimi-hooks.toml` contains the ready-to-paste `[[hooks]]` blocks. Status: "Awaiting user paste."

---

## 2. Kiro CLI

### 2.1 Guard scripts that exist

Directory: `.kiro/hooks/` (7 files)

| File | Purpose |
|---|---|
| `activity-log-inject.sh` | Injects activity log + git status + open handoffs at spawn |
| `activity-log-remind.sh` | Reminds about activity log + unpushed changes at stop |
| `destructive-cmd-guard.sh` | Blocks destructive shell commands |
| `framework-dir-guard.sh` | Blocks writes to `.kimi/` and `.claude/` |
| `root-file-guard.sh` | Blocks unapproved root-file writes (ADR-0001) |
| `sensitive-file-guard.sh` | Blocks sensitive file writes |
| `test_hooks.sh` | Regression suite for the 4 `preToolUse` guards |

### 2.2 Per-agent config wiring — `.kiro/agents/*.json`

**Sampled files:** `coder.json`, `orchestrator.json`, `tester.json`, `reviewer.json`

All four declare a `hooks` object with three event types:

- `preToolUse` — 3× `fs_write` matchers (`root-file-guard.sh`, `framework-dir-guard.sh`, `sensitive-file-guard.sh`) + 1× `execute_bash` matcher (`destructive-cmd-guard.sh`)
- `agentSpawn` — `activity-log-inject.sh`
- `stop` — `activity-log-remind.sh`

**Example from** `.kiro/agents/coder.json` **lines 20–32:**
```json
"hooks": {
  "preToolUse": [
    { "matcher": "fs_write", "command": "bash .kiro/hooks/root-file-guard.sh" },
    { "matcher": "fs_write", "command": "bash .kiro/hooks/framework-dir-guard.sh" },
    { "matcher": "fs_write", "command": "bash .kiro/hooks/sensitive-file-guard.sh" },
    { "matcher": "execute_bash", "command": "bash .kiro/hooks/destructive-cmd-guard.sh" }
  ],
  "agentSpawn": [ { "command": "bash .kiro/hooks/activity-log-inject.sh" } ],
  "stop": [ { "command": "bash .kiro/hooks/activity-log-remind.sh" } ]
}
```

### 2.3 Do they actually fire?

**Partially.**

- **Orchestrator (main agent) session:** Hooks fire correctly.
- **Subagent sessions:** Hooks **do not fire**.

`.ai/known-limitations.md` §1 documents this as an open, empirically confirmed bug (2026-04-19):

> "`.kiro/agents/*.json` subagent configs correctly declare a `hooks` section … but Kiro CLI runtime does NOT fire those hooks when a subagent performs `fs_write` or `execute_bash`. Hooks only execute for the main agent (orchestrator) session."

**Impact table (from known-limitations.md):**

| Protection | Orchestrator | Subagent |
|---|---|---|
| Framework-dir writes | ✓ tool-level `deniedPaths` | ✓ tool-level `deniedPaths` |
| Sensitive-file writes | ✓ hook | ✗ **not enforced** |
| Root-file policy | ✓ hook | ✗ **not enforced** |
| Destructive bash | ✓ hook | ✗ **not enforced** |

**Severity: HIGH** — subagents (coder, tester, etc.) are the agents that actually perform mutations. Their hook bypass leaves a significant gap.

**Mitigation applied:** Prompt hardening — every subagent prompt carries explicit SAFETY RULES replicating the guard logic. This is soft enforcement (LLM self-check).

---

## 3. Claude Code

### 3.1 Guard scripts that exist

Directory: `.claude/hooks/` (5 files)

| File | Purpose |
|---|---|
| `pretool-bash.sh` | PreToolUse matcher `Bash` — destructive command blocking |
| `pretool-write-edit.sh` | PreToolUse matcher `Write|Edit` — root-file, framework-dir, sensitive-file blocking |
| `session-start.sh` | `SessionStart` — injects git status + open handoffs |
| `stop-reminder.sh` | `Stop` — reminds about activity log + uncommitted changes |
| `test_hooks.sh` | Regression suite for `pretool-*.sh` |

### 3.2 Config wiring — `.claude/settings.json`

**File:** `.claude/settings.json`

Hooks are fully wired for four events:

- `PreToolUse` → `pretool-write-edit.sh` (matcher: `Write|Edit`) + `pretool-bash.sh` (matcher: `Bash`)
- `UserPromptSubmit` → inline bash command injecting activity log
- `SessionStart` → `session-start.sh`
- `Stop` → `stop-reminder.sh`

**Lines 4–62** contain the complete hook map.

### 3.3 Agent prompt references

**File:** `.claude/agents/orchestrator.md` **line 96**:

> "The `.claude/hooks/pretool-write-edit.sh` hook enforces this — unapproved root writes are blocked at the tool layer."

This confirms the hook is intended to be a hard runtime barrier, not just a prompt suggestion.

### 3.4 Do they actually fire?

**Yes, for orchestrator sessions.** `.ai/known-limitations.md` §3:

> "Hooks fire correctly for Write/Edit and Bash tools in orchestrator sessions."

**Subagent behavior:** Not yet empirically verified with an evil-file-write test. The `orchestrator.md` agent uses `Agent` (subagent) tool for mutations, but whether Claude's `PreToolUse` hooks propagate to subagent tool calls is **untested** per the docs.

**Severity: MEDIUM** (informational gap) — no known bug, but absence of verification means subagent safety is assumed, not proven.

---

## 4. Cross-CLI Comparison

| Dimension | Kimi | Kiro | Claude |
|---|---|---|---|
| **Scripts on disk** | 10 | 7 | 5 |
| **Config completeness** | 1/10 wired | 7/7 wired in JSON | 5/5 wired in JSON |
| **Runtime enforcement** | **None** (bash guards dead) | **Partial** (main agent only) | **Full** (orchestrator); subagents untested |
| **Test coverage** | `test_hooks.sh` (pipe tests pass) | `test_hooks.sh` (pipe tests pass) | `test_hooks.sh` (pipe tests pass) |
| **Known issue doc** | §2 — awaiting user paste | §1 — subagent inheritance broken | §3 — none known |

---

## 5. Recommendations

1. **Kimi — CRITICAL:** Paste `.ai/config-snippets/kimi-hooks.toml` into `~/.kimi/config.toml` and restart Kimi Code CLI. Without this, the project has zero automated guard coverage in Kimi sessions.

2. **Kiro — HIGH:** Continue treating subagent hooks as broken. Do not remove prompt-level SAFETY RULES from subagent prompts until Kiro upstream fixes hook inheritance. Consider filing or tracking the upstream bug if not already done (`known-limitations.md` lists it as "pending — user action").

3. **Claude — LOW/MEDIUM:** Run the evil-file-write test pattern (used to confirm Kiro's bug) against Claude subagents to verify whether `PreToolUse` hooks propagate through the `Agent` tool. Document result in `.ai/known-limitations.md`.

4. **All CLIs:** The `test_hooks.sh` suites only validate script logic in isolation (pipe tests). They do **not** validate runtime integration. Add an integration test column to the test matrices that confirms each CLI actually invokes the hook on a real tool call.

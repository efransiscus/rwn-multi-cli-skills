# Read-Only Audit: Documentation, Reports, and Processes — Paper vs. Practice

**Auditor:** claude-code (orchestrator, reviewer mode)  
**Date:** 2026-04-20  
**Scope:** `.ai/known-limitations.md`, `.ai/tests/concurrency-test-protocol.md`, `.ai/reports/`, `.ai/handoffs/to-*/open/`, `.archive/`, `.ai/activity/log.md`  

---

## Executive Summary

This audit finds **6 categories** where documents, processes, or reports exist on paper but are not fully operational in practice. The most severe gaps are:

1. **A paste-ready upstream bug report that was never filed** (HIGH).
2. **A comprehensive concurrency test protocol that has never been executed** (HIGH).
3. **Two safety-layer fixes that exist as documents/snippets but require manual user action that has not happened** (MEDIUM).
4. **Multiple deferred maintenance items** (activity log rollup, gitignore, template moves) that are documented as decisions but not executed (LOW–MEDIUM).

---

## 1. `.ai/known-limitations.md` — Items Marked Untested / Pending / Deferred

| # | Item | Status in doc | Line | Severity | What is missing |
|---|---|---|---|---|---|
| 1.1 | **Kiro CLI — subagent hook inheritance broken** | "Open. Confirmed empirically 2026-04-19 21:22" | 10 | **HIGH** | Upstream bug report drafted but **never filed**: line 45 reads `**Upstream bug filed:** <pending — user action> (link TBD)`. The `.ai/reports/kiro-bug-subagent-hook-inheritance.md` report is paste-ready with a `<FILL IN>` placeholder for version number, but no issue tracker link exists. |
| 1.2 | **Kimi CLI — bash guards not wired into global config** | "Awaiting user paste" | 57 | **MEDIUM** | The `.ai/config-snippets/kimi-hooks.toml` snippet was created 2026-04-19 23:30 and validated, but the user has **not yet pasted it into `~/.kimi/config.toml`**. Until that happens, Kimi's 4 bash guard scripts are dead code — only `safety-check.ps1` (PowerShell) is active. Activity log 2026-04-20 12:45 confirms this status was updated from `(pending)` to `snippet-created`, but the user action is still outstanding. |
| 1.3 | **Claude Code — subagent hook behavior** | "pending if Kimi or Kiro test pattern gets extended to Claude" | 87–88 | **LOW** | No empirical test has been run to verify whether Claude subagents inherit hook enforcement. The document explicitly defers this to a future test. |
| 1.4 | **Handoff numbering race condition** | "Full fix deferred: switch to timestamp-based numbering or introduce a `.ai/handoffs/.claim-lock` file. Not yet implemented." | 103–104 | **LOW** | The fix (timestamp-based numbering) **was actually implemented** on 2026-04-20 10:40 (see activity log), so this section is now **stale / partially inaccurate**. The doc still says "Not yet implemented." |
| 1.5 | **Concurrent activity-log writes** | "Untested (see `.ai/tests/concurrency-test-protocol.md`)" | 110 | **HIGH** | See section 2 below. The protocol exists but has never been run. This limitation is documented but uncharacterized. |

**Residual risk:** Two of the three CLIs (Kiro, Kimi) have documented safety-layer gaps that are not closed by config alone. Kiro requires an upstream runtime fix; Kimi requires a one-time user paste.

---

## 2. `.ai/tests/concurrency-test-protocol.md` — Has It Been Run?

**Verdict: NO. Never executed.**

Evidence:
- The protocol defines a reporting table (lines 160–169) with columns `Scenario | Status | Observation | Severity`. Every cell is blank.
- The protocol instructs: "Write results to `.ai/tests/concurrency-test-results-YYYY-MM-DD.md`". A glob search for `.ai/tests/concurrency-test-results*` returns **no matches**.
- The activity log has no entry mentioning the execution of any S1–S6 scenario.
- The document itself admits: "Three-CLI concurrency is the scariest **untested** unknown in this framework" (line 10).

**Severity: HIGH.** This is the only document that addresses the framework's most critical operational risk (simultaneous CLI writes clobbering shared state). It exists as a runbook but has no empirical data behind it.

---

## 3. `.ai/reports/` — Which Reports Were Drafted / Paste-Ready But Never Filed?

### 3.1 Live reports (5 files)

| File | Date | Status |
|---|---|---|
| `claude-audit-2026-04-19.md` | 2026-04-19 | Used — audit findings were acted upon in Waves 4–5. |
| `claude-vote-on-kiro-audit-2026-04-19.md` | 2026-04-19 | Used — vote tallies fed into consolidated matrix and fix dispatch. |
| `consolidated-audit-2026-04-19.md` | 2026-04-19 | Used — master finding matrix for cross-CLI consensus. |
| `kiro-bug-subagent-hook-inheritance.md` | 2026-04-19 | **DRAFTED / PASTE-READY — NEVER FILED** (see below) |
| `README.md` | — | Living directory documentation. |

### 3.2 The unfiled report: `kiro-bug-subagent-hook-inheritance.md`

- **What it is:** A complete upstream bug report draft for the Kiro CLI team, including title, severity, environment, reproduction steps, impact, ask, and workaround.
- **Why it was not filed:** Activity log 2026-04-19 19:30 states: "Did not file the Kiro bug myself — that requires a user account and access to Kiro's issue tracker. Bug report is paste-ready; `<FILL IN>` placeholder only on version number."
- **Current state:** The file sits in `.ai/reports/` with a `<FILL IN>` placeholder on line 18 (Kiro CLI version). No link to an external issue tracker has ever been added.
- **Action needed:** User must copy-paste the report into Kiro's issue tracker and backfill the version string.

### 3.3 Archived reports (8 files)

The 2026-04-18 audit cycle reports were moved to `.archive/ai/reports/2026-04-18/` on 2026-04-20 10:40. These **were** used (they drove Waves 1–3 of remediation), so they are legitimate archival history, not abandoned drafts.

---

## 4. `.ai/handoffs/to-*/open/` — Stale / Abandoned Handoffs

### 4.1 Current state: ALL EMPTY

As of the latest activity-log entries (2026-04-20 12:30 and 2026-04-20 10:40), all three `open/` directories are empty:
- `.ai/handoffs/to-claude/open/` — empty
- `.ai/handoffs/to-kimi/open/` — empty
- `.ai/handoffs/to-kiro/open/` — empty

### 4.2 Historical staleness (now resolved)

The audit trail shows repeated instances of handoffs lingering in `open/` long after execution:

| Handoff | Recipient | Created | Executed | Closed | Days open post-execution |
|---|---|---|---|---|---|
| `015-cross-cli-consistency-audit` | Claude | 2026-04-18 (user dispatch) | 2026-04-19 11:20 | 2026-04-20 (archival pass) | ~1.5 days |
| `022-cross-cli-consistency-audit` | Kimi | 2026-04-18 (user dispatch) | 2026-04-18 10:35 | 2026-04-19 (hygiene pass) | ~1 day |
| `010-cross-cli-consistency-audit` | Kiro | 2026-04-18 (user dispatch) | 2026-04-18 09:19 | 2026-04-19 (hygiene pass) | ~1 day |
| `016-regen-ssot-replicas` | Kiro | 2026-04-19 18:15 | 2026-04-19 22:22 | 2026-04-20 08:00 | ~0.5 days |
| `032-config-toml-snippet` | Kimi | 2026-04-19 19:15 | 2026-04-19 23:30 | 2026-04-20 08:00 | ~0.5 days |

**Root cause:** Protocol step 5 requires the *sender* to validate and move the handoff to `done/`. When the sender is the user (not a CLI), the move step was repeatedly skipped until an orchestrator hygiene pass intervened.

**Mitigation now in place:** The timestamp-based numbering scheme (adopted 2026-04-20) eliminates the numbering-collision INFO item that contributed to queue confusion.

---

## 5. `.archive/` — Is It Actually Used?

**Verdict: YES, actively used.**

Contrary to the 2026-04-19 18:15 activity-log entry which states "Archive folder now exists but is EMPTY — actual archival pass ... is a separate operation, not done this turn," the archive was populated on **2026-04-20 10:40** with:

- **8 reports** → `.archive/ai/reports/2026-04-18/`
- **46 done handoffs** → `.archive/ai/handoffs/to-*/done/2026-04/`
  - 14 to-claude
  - 21 to-kimi
  - 9 to-kiro
  - (plus 2 collision duplicates: `004-*`, `005-*` in to-kiro)

Total: **68 files** under `.archive/`, all moved via `git mv` (preserving history).

The archive README (`.archive/README.md`) is itself a living document with detailed protocols. It is operational.

---

## 6. `.ai/activity/log.md` — Planned but Not Done

Search keywords: `skipped`, `deferred`, `pending`, `not yet`, `future`.

### 6.1 Deferred / pending work items

| # | Item | Log date | Context | Severity |
|---|---|---|---|---|
| 6.1 | **Activity-log rollup to `.archive/`** | 2026-04-20 10:40 | "Activity-log rollup **skipped** (143KB, under 500KB threshold)." File is 346 lines and growing; no monthly rollup has ever been created. | LOW |
| 6.2 | **`.playwright-mcp/` gitignore** | 2026-04-20 10:40 | "`.playwright-mcp/` still untracked — gitignore decision **deferred**." The directory was added to `.gitignore` on 2026-04-20 12:30, so this item is now **resolved**. | — |
| 6.3 | **Kiro upstream bug filing** | 2026-04-19 19:30 | "Pushed without filing Kiro upstream bug first — user can do that now." See section 1.1 / 3.2. | HIGH |
| 6.4 | **Kimi `~/.kimi/config.toml` paste** | 2026-04-19 19:30 | "Pending CLI-work state at session close: Kimi 032 (config.toml snippet) ... projected ~72–75% once ... user pastes the Kimi config snippet." Still outstanding as of 2026-04-20. | MEDIUM |
| 6.5 | **Actual archival pass (initial)** | 2026-04-19 18:15 | "Did NOT execute the actual archival pass this turn — protocol-first, execution second." This was later executed on 2026-04-20 10:40. | — (resolved) |
| 6.6 | **Kiro prompt-text drift (cosmetic)** | 2026-04-18 13:20 | "One minor cosmetic drift noted but NOT fixed this session: Kiro's infra-engineer.json and doc-writer.json PROMPT text ... **Wave 4 INFO follow-up**." No subsequent log entry shows this being addressed. | LOW |
| 6.7 | **docs/_templates/ move** | 2026-04-19 16:45 | "**Deferred** to Wave 4c: ... docs/_templates/ move (Wave 5)." No Wave 5 dispatch logged yet. | LOW |
| 6.8 | **docs/api/TEMPLATE.md and docs/security.md** | 2026-04-17 23:30 | "doc-writer flagged three minor follow-ups ... (1) `docs/api/TEMPLATE.md` missing ... (2) `docs/security.md` missing ... defer until the project has an actual API surface." Still missing. | LOW |
| 6.9 | **Claude subagent hook empirical test** | 2026-04-19 18:50 | "**(C) Kimi handoff 031** — empirical hook-inheritance test (does Kimi have the same bug?)" Kimi executed this and found its bug is different (unwired config). Claude's own subagent hooks remain **untested**. | LOW |
| 6.10 | **SSOT drift direction fix (karpathy-guidelines)** | 2026-04-19 17:55 | "Did NOT regenerate the 2 drifted Claude SKILL.md files — drift-check is a read-only tool and which direction to fix ... is a separate call." Drift checker was created but the drift itself was not fixed in the same session. | LOW |
| 6.11 | **CI pipeline / test-framework config / pre-commit hooks** | 2026-04-17 22:55 | "Deferred CI/test-config/pre-commit because they require a language choice to be meaningful." A CI workflow (`.github/workflows/framework-check.yml`) was later created on 2026-04-20 10:40, so this is **partially resolved**. | — (partially resolved) |

### 6.2 Content-filter blocked work (Phase 1)

On 2026-04-17 23:15, doc-writer hit an API content-filter block mid-session. **5 files were left pending:**
- `CODE_OF_CONDUCT.md`
- `docs/guides/contributing.md`
- `docs/architecture/TEMPLATE.md`
- `docs/specs/TEMPLATE.md`
- `docs/standards/TEMPLATE.md`

These were later completed on 2026-04-17 23:25 via a pointer-shaped rewrite of `CODE_OF_CONDUCT.md` that avoided the filter trigger. All 5 landed successfully, so this blockage is **resolved**.

---

## 7. Summary Table: Paper vs. Practice

| Document / Process | Exists on paper? | Operational in practice? | Gap severity |
|---|---|---|---|
| `.ai/known-limitations.md` (Kiro bug) | Yes — full report | **NO** — never filed upstream | HIGH |
| `.ai/known-limitations.md` (Kimi hooks) | Yes — config snippet | **NO** — snippet not pasted into `~/.kimi/config.toml` | MEDIUM |
| `.ai/tests/concurrency-test-protocol.md` | Yes — 6-scenario runbook | **NO** — never executed, no results file | HIGH |
| `.ai/reports/kiro-bug-subagent-hook-inheritance.md` | Yes — paste-ready draft | **NO** — never filed/used | HIGH |
| `.ai/handoffs/to-*/open/` cleanup protocol | Yes — step 5 sender-moves | **HISTORICALLY NO** — user-sender handoffs dangled open for days; now resolved via orchestrator hygiene passes | LOW |
| `.archive/` mechanism | Yes — README + triggers | **YES** — 68 files archived on 2026-04-20 | — |
| Activity-log rollup protocol | Yes — 500KB threshold | **NO** — rollup skipped despite 346-line file | LOW |
| `docs/api/TEMPLATE.md` + `docs/security.md` | Referenced in docs/README.md | **NO** — still missing, deferred until API surface exists | LOW |
| `docs/_templates/` move (B-2) | Proposed in consolidated audit | **NO** — deferred to Wave 5, not yet dispatched | LOW |
| Claude subagent hook test | Mentioned as future work | **NO** — never empirically tested | LOW |

---

## Recommendations

1. **File the Kiro bug or remove the draft.** The `.ai/reports/kiro-bug-subagent-hook-inheritance.md` file creates the illusion that the issue has been reported upstream. Either file it (and backfill the version + link) or add a `.ai/reports/README.md` note explaining it is an internal draft awaiting user action.

2. **Run the concurrency test protocol.** Even a partial run (S1 + S2b, the two highest-risk scenarios) would provide more empirical confidence than the current "untested" status. Document the results in `.ai/tests/concurrency-test-results-YYYY-MM-DD.md`.

3. **Paste the Kimi hooks snippet.** This is a one-time user action that moves Kimi from ~75% to ~80%+ framework confidence. The snippet is validated and waiting at `.ai/config-snippets/kimi-hooks.toml`.

4. **Update `.ai/known-limitations.md` line 103–104.** The handoff-numbering race fix (timestamp-based numbering) has been live since 2026-04-20. The doc incorrectly says "Not yet implemented."

5. **Dispatch Wave 5 cleanup.** The `docs/_templates/` move (consolidated audit B-2) and any remaining INFO-level prompt-text drift are now the oldest unclosed items from the 2026-04-19 audit cycle.

6. **Create the first activity-log rollup.** The file is at 346 lines. Even if it is under the 500KB threshold, a monthly rollup would exercise the archival protocol and keep the live log scannable.

# CI/CD, Test Suites & Automation Audit

**Date:** 2026-04-20  
**Scope:** `.github/workflows/`, `.claude/hooks/test_hooks.sh`, `.kimi/hooks/test_hooks.sh`, `.kiro/hooks/test_hooks.sh`, `.ai/tools/check-ssot-drift.sh`, cron/scheduled automation, and related docs/runbooks.  
**Method:** Read-only file audit + grep trace for references and execution evidence.

---

## 1. `.github/workflows/framework-check.yml`

### What it runs
A single job (`framework-check`, `ubuntu-latest`) with four bash steps:
1. `bash .claude/hooks/test_hooks.sh` — Claude pre-tool hook regression suite (17 tests)
2. `bash .kimi/hooks/test_hooks.sh` — Kimi pre-tool hook regression suite (18 tests)
3. `bash .kiro/hooks/test_hooks.sh` — Kiro pre-tool hook regression suite (15 tests)
4. `bash .ai/tools/check-ssot-drift.sh` — SSOT replica drift checker (12 replicas, 7 pairs)

### Triggers
- `pull_request` — with `paths-ignore: '**/*.md'`
- `push` to `master` — with `paths-ignore: '**/*.md'`
- **No** `workflow_dispatch` (cannot be triggered manually from the GitHub UI).
- **No** `schedule` / cron trigger.

### Has it actually executed?
**Indirect evidence only.** The `.ai/activity/log.md` (line 28) states:
> "CI remains green (last check showed commit `5f88ece` succeeded; `8d247c2` should be running now … c8c2112 on .gitignore is a non-md change, should trigger)."

And line 38:
> "CI workflow is now LIVE on GitHub: the push itself triggers a GitHub Actions run of the `framework-check` workflow."

However, **no independent corroboration exists in the repo**:
- `README.md` contains **zero status badges**.
- `.github/workflows/` contains **only this one file** — no artifact-upload steps, no caching, no companion workflows.
- No local run logs, no `.github/actions/` composite actions, no `workflow_run` event chains.
- A web search for this specific workflow returned no publicly indexed run results.

**Verdict:** The workflow *file* was created and pushed on 2026-04-20 and is believed to be active, but its execution history cannot be independently verified from the repository contents alone. The orchestrator’s activity log is the sole source of run-status claims.

---

## 2. `test_hooks.sh` Scripts (Three CLI Variants)

### `.claude/hooks/test_hooks.sh` (lines 1–58)
- **Tests:** 17 curated pipe-tests against `pretool-write-edit.sh` and `pretool-bash.sh`.
- **Coverage:** root-file guard, framework-dir guard, sensitive-file guard (`.env`, `id_rsa`, `id_ed25519`, `server.key`, `cert.p12`), destructive-cmd guard (`rm -rf /`, `git push --force`, `DROP DATABASE`), empty-stdin fail-open.
- **Referenced in CI?** **Yes** — `.github/workflows/framework-check.yml:28`.
- **Referenced in docs/runbooks?** **Yes** — `.claude/hooks/README.md:48` documents the full regression run. Multiple handoffs (e.g. `to-kimi/done/029-formalize-test-hooks-suite.md`) cite it as an acceptance criterion.
- **Last known result:** Activity log reports "PASS 17/17 on first run" (2026-04-19).

### `.kimi/hooks/test_hooks.sh` (lines 1–57)
- **Tests:** 18 curated pipe-tests against `root-guard.sh`, `framework-guard.sh`, `sensitive-guard.sh`, `destructive-guard.sh`.
- **Coverage:** Same attack matrix as Claude plus `secrets.yaml`, `credentials.json`, and the stdin-drain regression test (t16) that would have caught the F-4 bug.
- **Referenced in CI?** **Yes** — `.github/workflows/framework-check.yml:31`.
- **Referenced in docs/runbooks?** **Yes** — `.kimi/hooks/README.md:68` documents the suite. Handoff `029-formalize-test-hooks-suite.md` specifies creation and expected output.
- **Last known result:** Activity log reports "PASS 18/18" (2026-04-19 22:30).

### `.kiro/hooks/test_hooks.sh` (lines 1–64)
- **Tests:** 15 curated pipe-tests against `root-file-guard.sh`, `framework-dir-guard.sh`, `sensitive-file-guard.sh`, `destructive-cmd-guard.sh`.
- **Coverage:** root-file, framework-dir, sensitive-file (`.env`, `id_ed25519`, `id_rsa`, `server.key`, `secrets.yaml`, `credentials.json`), destructive-cmd (`rm -rf /`, `DROP DATABASE`, mixed-case `Drop Database`, `git status` allowed).
- **Referenced in CI?** **Yes** — `.github/workflows/framework-check.yml:34`.
- **Referenced in docs/runbooks?** **Yes** — `.kiro/hooks/README.md` references it. Handoff `015-wave4c-subagent-hooks-plus-test-suite.md` defines the 13-test matrix (subsequently expanded to 15).
- **Last known result:** Activity log reports "PASS 15/15" (2026-04-19 22:22).

---

## 3. `.ai/tools/check-ssot-drift.sh`

### What it does
A read-only invariant checker that verifies 12 CLI-native replicas match their SSOT sources in `.ai/instructions/`:
- **7 source→destination pairs** across 3 SSOT documents (`karpathy-guidelines/principles.md`, `karpathy-guidelines/examples.md`, `orchestrator-pattern/principles.md`, `agent-catalog/principles.md`).
- **Preamble stripping:** For Claude and Kiro `SKILL.md` files, strips everything up to and including the first `<!-- SSOT: … -->` line plus one trailing blank line, then diffs the body against the source.
- **Exit code:** `0` if all synced, `1` on any drift or missing file.
- **Runtime:** documented as "under 2 seconds on the full matrix."

### Is it run anywhere?
- **CI:** **Yes** — `.github/workflows/framework-check.yml:37`.
- **Docs:** **Yes** — `.ai/tools/README.md:7` documents usage and exit codes. Recommends running "Pre-commit", "CI", and "Ad hoc".
- **Handoffs:** Referenced in at least 4 done handoffs (e.g. `to-kiro/done/016-regen-ssot-replicas.md`, `to-kimi/done/030-regen-ssot-replicas.md`) as the acceptance gate for replica regeneration.
- **Manual execution:** Activity log shows repeated ad-hoc runs during the 2026-04-19 SSOT fix session.

---

## 4. Cron Jobs, Scheduled Actions, and Other Automation

### GitHub Actions
- **Total workflows:** 1 (`framework-check.yml`).
- **Scheduled runs:** **None.** No `schedule:` or `cron` keys anywhere in `.github/`.
- **Manual dispatch:** **None.** No `workflow_dispatch` trigger.
- **Reusable workflows / composite actions:** **None.**
- **Artifact persistence:** **None.** The workflow does not upload artifacts or logs.

### Pre-commit hooks
- **No** `.pre-commit-config.yaml` or `.pre-commit-hooks.yaml` found anywhere in the repo.

### Build / task runners
- **No** `Makefile`.
- **No** `package.json` (root or subdirs searched).
- **No** `pyproject.toml`, `Cargo.toml`, `go.mod`, or equivalent build manifest with test/lint scripts.

### `infra/ci/`
- Directory exists per project structure but contains **only `.gitkeep`**.
- No CI helper scripts, no Terraform/GitHub-Actions wrappers, no deployment pipelines.

### `scripts/` and `tools/`
- `scripts/` — only `.gitkeep` + `README.md`.
- `tools/` — only `README.md`, `linters/` (empty), `playwright/` (empty).

### Kimi auxiliary hooks (dead code)
`.kimi/hooks/` contains three scripts **not** exercised by CI and **not** wired in the active Kimi runtime:
- `git-status.sh`
- `handoffs-remind.sh`
- `git-dirty-remind.sh`

The activity log (2026-04-19 19:15) and audit reports confirm these exist in the repo but are **not bound in `~/.kimi/config.toml`** — only `safety-check.ps1` is active. These scripts are unreachable dead code unless the user manually wires them.

---

## 5. Automation on Paper vs. Actually Executing

| Automation | On Paper (defined in repo) | Actually Executing | Evidence Quality |
|---|---|---|---|
| `framework-check.yml` CI workflow | Yes — single workflow, 4 steps, PR + push triggers | **Believed active** since 2026-04-20 | Indirect (activity log only); no badge, no artifacts, no dispatch trigger |
| Claude `test_hooks.sh` | Yes — 17 tests | **Yes** — run manually + wired in CI | Activity log: "PASS 17/17"; CI step references it |
| Kimi `test_hooks.sh` | Yes — 18 tests | **Yes** — run manually + wired in CI | Activity log: "PASS 18/18"; CI step references it |
| Kiro `test_hooks.sh` | Yes — 15 tests | **Yes** — run manually + wired in CI | Activity log: "PASS 15/15"; CI step references it |
| `check-ssot-drift.sh` | Yes — 12-replica drift checker | **Yes** — run manually + wired in CI | Activity log shows ad-hoc runs; CI step references it |
| Kimi auxiliary hooks (`git-status.sh`, etc.) | Yes — 3 scripts in `.kimi/hooks/` | **No** — unwired dead code | Audit reports + activity log confirm unbound in `~/.kimi/config.toml` |
| Scheduled/cron automation | No | No | N/A |
| `workflow_dispatch` manual trigger | No | No | N/A |
| Pre-commit hooks | No | No | N/A |
| `infra/ci/` helper scripts | Directory placeholder only | No | `.gitkeep` only |

---

## Issues by Severity

### HIGH — CI workflow lacks manual trigger and observability
- **File:** `.github/workflows/framework-check.yml`
- **Issue:** No `workflow_dispatch` means maintainers cannot force a CI run from the GitHub UI (e.g., to validate after fixing a flaky hook). No status badge in `README.md` means CI health is invisible without visiting the Actions tab.
- **Suggestion:** Add `workflow_dispatch:` to `on:` block. Add a Markdown status badge to `README.md`.

### HIGH — Kimi auxiliary hooks are dead code
- **File:** `.kimi/hooks/git-status.sh`, `.kimi/hooks/handoffs-remind.sh`, `.kimi/hooks/git-dirty-remind.sh`
- **Issue:** Scripts exist and are documented in `.kimi/hooks/README.md`, but are not wired into `~/.kimi/config.toml`. They mislead maintainers into believing session-start injections and dirty-tree reminders are active.
- **Suggestion:** Either wire them in the config snippet at `.ai/config-snippets/kimi-hooks.toml` (and document the user step), or delete them to eliminate confusion.

### MEDIUM — `infra/ci/` is a ghost directory
- **File:** `infra/ci/.gitkeep`
- **Issue:** The directory is advertised in `README.md` as "CI/CD workflows" but contains nothing. If the project plans to add language-specific CI (lint, test, build) in addition to the framework-check workflow, there is no scaffold or runbook for it yet.
- **Suggestion:** Populate with a README explaining the split between `.github/workflows/` (GitHub-mandated location) and `infra/ci/` (helper scripts), or remove the directory if it has no purpose.

### MEDIUM — No artifact persistence for CI failures
- **File:** `.github/workflows/framework-check.yml`
- **Issue:** When a hook test or drift check fails on the Linux runner, there is no artifact upload (e.g., diff output, stderr logs). A developer reproducing locally on Windows Git Bash may see different behavior due to bash version or line-ending differences.
- **Suggestion:** Add an `actions/upload-artifact` step that captures stdout/stderr on failure, or at minimum echo the full failure output in the step logs.

### LOW — PR template references tests that do not exist at project level
- **File:** `.github/pull_request_template.md:21`
- **Issue:** Checkbox says "Tests pass locally" and "Added/updated tests for changed behavior", but the repo has no project-level test suite (src/ and tests/ are empty). Only framework-level hook tests exist. New contributors may be confused about what "tests" means.
- **Suggestion:** Amend the PR template to mention the framework hook tests (`bash .claude/hooks/test_hooks.sh`, etc.) until project-level tests are added.

### LOW — Activity log is the sole source of CI run truth
- **File:** `.ai/activity/log.md`
- **Issue:** Because there are no badges, artifacts, or external dashboards, the only record of whether CI passed or failed is prose in the activity log. This is human-written and not machine-verifiable.
- **Suggestion:** Treat this as temporary; once the workflow matures, rely on GitHub’s native commit-status API and surface it via a README badge or branch-protection rule.

---

## Recommendations (Actionable)

1. **Add `workflow_dispatch`** to `.github/workflows/framework-check.yml` for on-demand runs.
2. **Add a CI status badge** to `README.md` so framework health is visible at a glance.
3. **Wire or delete** the three unbound Kimi auxiliary hook scripts.
4. **Upload failure artifacts** in the CI workflow so Linux-runner failures are debuggable without local reproduction.
5. **Document the test-run command** in `docs/standards/` or `AGENTS.md` so any CLI (not just the orchestrator) knows how to validate hooks before committing.
6. **Populate or remove** `infra/ci/` — an empty directory with a `.gitkeep` in a repo that otherwise enforces strict directory ownership is an anomaly.

---

*Report compiled from read-only inspection of repo files. No code was modified.*

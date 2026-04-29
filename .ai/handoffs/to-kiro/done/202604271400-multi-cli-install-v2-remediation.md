# multi-cli-install v2 — REMEDIATION (missing install layer + greenfield)
Status: REMEDIATION-2 REQUIRED (4 bugs found in final review — see `202604271530-multi-cli-install-v2-remediation-2.md`)
Sender: claude-code (orchestrator)
Recipient: kiro-cli
Created: 2026-04-27 ~14:00
Parent handoff: `202604270725-multi-cli-install-v2-implementation.md`

## Why this exists

Reviewing the actual code (not just your activity-log claims) showed the v2
binary is missing the install layer and greenfield mode. What you shipped
(Inspector, Classifier, Strategy Picker, Migration Engine, project-context
generator) is real and good — keep it. But on its own it doesn't do what
the user originally asked for: an executable that creates the framework
structure for new projects AND adopts existing projects into it.

Concrete gaps verified by reading source:

1. **`bin/multi-cli-install.ts`** lists `--new` in `--help` text but `main()`
   has zero implementation for greenfield mode. No `mkdir`, no `git init`,
   no stub files, no initial commit. Running with `--new my-project`
   silently runs the inspect-on-empty-dir pipeline.
2. **`src/patcher/patcher.ts`** only writes `.ai/project-context.md`. Does
   NOT copy the framework into the target — `.claude/`, `.kimi/`, `.kiro/`,
   `.ai/instructions/`, `.ai/handoffs/`, `.ai/tools/`, `.ai/known-limitations.md`,
   `.archive/`, `CLAUDE.md`, `AGENTS.md`, `docs/architecture/0001-root-file-exceptions.md`,
   `.github/workflows/framework-check.yml` — none of it lands in the target.
3. **No sanitize step** — running on a fresh target leaves no activity log
   stub, no empty handoff dirs, etc.
4. **No ADR amendment** for detected root files (e.g., add `package.json`
   to ADR Category F when target is a Node project).
5. **No root-guard hook patching** to allow detected manifests in the
   target's hooks.
6. **No SSOT touch** — orchestrator-steering paragraph never added to
   `.ai/instructions/orchestrator-pattern/principles.md`. The whole "all
   13 subagents per CLI read project-context.md" mechanism is broken
   because their steering doesn't tell them to read it.

The existing `scripts/install-template.sh` does items 2, 3, 4, 5 today —
read it as the canonical behavior reference. Items 1 and 6 are new for v2.

## Scope (this handoff only)

Add the missing layers. Do NOT redo Inspector / Classifier / Strategy /
Migration / context-generator — those stay as-is.

### R1 — Greenfield scaffold (`--new` mode)

Implement the `--new` flag in `bin/multi-cli-install.ts`. When set:

1. Validate `<target-dir>` doesn't exist (refuse if it does, unless
   `--force` is also passed — defer `--force` for now).
2. Create the target directory.
3. `git init` inside it.
4. Write stub `README.md` (project name from positional arg) and
   `.gitignore` (minimal language-agnostic baseline).
5. Initial commit (`git add . && git commit -m "feat(scaffold): initial commit"`).
6. THEN run the existing install pipeline (inspect → classify → strategy →
   migration → patch) against the new directory. For greenfield, inspect
   will find nothing to reorganize, which is correct.

Reference: `scripts/new-project.sh` for the bash-script behavior.

### R2 — Framework-files copy (Phase 1 port from bash)

New module: `src/installer/copy-framework.ts`. Copies framework dirs from
the package's bundled assets into the target. Two design decisions you
need to make and write into your activity log entry:

(a) **Where do bundled framework assets live in the package?** Options:
   - Inside `tools/multi-cli-install/assets/` (copied at build time from
     repo root). Pros: simple, self-contained npm publish. Cons: duplication
     in the repo until publish.
   - Resolved at runtime relative to the installed `npx` package. Pros: no
     duplication. Cons: harder to test, file-resolution complexity.

   Recommend (a) with a small `scripts/sync-assets.ts` that copies from
   repo root into `tools/multi-cli-install/assets/` during build. Document
   your choice in the activity log.

(b) **What exactly to copy.** Use `scripts/install-template.sh` Phase 1 as
   the authoritative list:
   - `.ai/` (full tree) → target's `.ai/`
   - `.claude/` → target's `.claude/`
   - `.kimi/` → target's `.kimi/`
   - `.kiro/` → target's `.kiro/`
   - `.archive/` → target's `.archive/`
   - `CLAUDE.md`, `AGENTS.md` → target root
   - `docs/architecture/0001-root-file-exceptions.md` → target's `docs/architecture/`
   - `.github/workflows/framework-check.yml` → target's `.github/workflows/`
   - **NOT copied:** `scripts/`, `README.md`, `LICENSE`, `CHANGELOG`,
     `tools/`, `src/`, `tests/`, `.git/`, `.codegraph/`, `.kirograph/`,
     `.kimigraph/`, `node_modules/`, `dist/`.

Run BEFORE the migration step in `main()`. Migration moves project source
INTO the framework structure that was just copied.

### R3 — Sanitize state (Phase 2 port from bash)

New module: `src/installer/sanitize.ts`. After framework-files copy:

- Overwrite `.ai/activity/log.md` with the clean stub from
  `scripts/install-template.sh` `write_clean_activity_log()`.
- Wipe `.ai/handoffs/to-*/open/` and `.ai/handoffs/to-*/done/` contents
  (keep the README.md / template.md at handoffs/ root).
- Wipe `.ai/reports/` contents (keep README.md).
- Wipe `.archive/ai/handoffs/`, `.archive/ai/reports/`, `.archive/ai/activity/`
  contents.
- Append attribution marker to `.ai/known-limitations.md` matching the
  bash script's MARKER format (`# ADDED BY install-template.sh`-equivalent
  but say `# ADDED BY @rwn34/multi-cli-install vX.Y.Z`).

### R4 — ADR amendment + hook patching (Phase 3 port from bash)

New module: `src/installer/adapt-policy.ts`. After sanitize:

- Merge target's existing `.gitignore` with template `.gitignore`
  (preserve target content; append framework entries; idempotent via
  marker).
- Use the inspector's detected language to amend
  `docs/architecture/0001-root-file-exceptions.md` Category F and patch
  the three root-guard hooks
  (`.claude/hooks/pretool-write-edit.sh`, `.kimi/hooks/root-guard.sh`,
  `.kiro/hooks/root-file-guard.sh`) to allow the language's manifest +
  lockfile.

Reference: `scripts/install-template.sh` `amend_adr()` and
`patch_hook_allow()` for the exact patterns. Idempotent via MARKER on
re-run.

### R5 — SSOT touch (true P4 — was missed)

This is the mechanism that makes `.ai/project-context.md` actually reach
all 13 subagents per CLI. Without this step, agents don't know to read
the file.

1. Edit `.ai/instructions/orchestrator-pattern/principles.md` (in this
   framework repo, NOT the target) to add a new paragraph:

   > **Project context** — at the start of substantive work, read
   > `.ai/project-context.md` if it exists. It captures this project's
   > stack, layout, and commands as of the most recent install or
   > refresh. If the project has evolved since, run
   > `npx @rwn34/multi-cli-install --refresh-context`.

2. Run the SSOT regen flow per `.ai/sync.md` so the paragraph propagates
   to `.claude/skills/orchestrator-pattern/SKILL.md`,
   `.kimi/steering/orchestrator-pattern.md`,
   `.kiro/steering/orchestrator-pattern.md` (or wherever the replicas
   actually live — confirm via `.ai/sync.md`).

3. Run `bash .ai/tools/check-ssot-drift.sh` and confirm green.

4. Run all three CLIs' hook test suites (`.claude/hooks/test_hooks.sh`,
   `.kimi/hooks/test_hooks.sh`, `.kiro/hooks/test_hooks.sh`) and confirm
   25/25 each.

This step touches the framework repo's SSOT directly, NOT the target
directory. The newly-copied framework files in any installer-target
inherit the updated steering automatically because R2 copies the
post-update SSOT.

### R6 — Wire R1–R5 into the binary

Update `bin/multi-cli-install.ts` `main()` so the order is:

```
if --new mode:
  R1 greenfield scaffold
  (target now exists with git + stubs)

[for both modes:]
  inspect target
  classify dirs
  compute strategy
  R2 copy framework files into target
  R3 sanitize template state in target
  R4 adapt policy (gitignore merge + ADR + hooks) in target
  plan migration
  execute migration (project files INTO the canonical layout)
  apply patches (project-context.md generation, R5 already in framework SSOT)
```

The `--inspect-only` and `--refresh-context` flags can short-circuit
before R2; preserve current behavior for those.

### R7 — Update README + tests

- Update `tools/multi-cli-install/README.md` to accurately describe the
  full pipeline (currently describes only the migration parts you shipped
  in P3–P5).
- Add at least one integration test per new module: greenfield scaffold,
  copy-framework, sanitize, adapt-policy. Continue using fixture-only
  validation per the user's earlier decision.

## Out of scope (do NOT do these)

- Don't modify Inspector / Classifier / Migration Engine / project-context
  generator — those are correct as-shipped.
- Don't add `@inquirer/prompts` interactive UX — still deferred to v1.1.
- Don't run real-project validation — fixture-only, per user decision.
- Don't publish to npm — release-engineer scope after orchestrator approves.

## Verification

When R1–R7 are done, the binary should:

(a) `npx @rwn34/multi-cli-install my-new-project --new` creates the dir,
    inits git, writes stubs, copies the framework, sanitizes, runs the
    install pipeline. Resulting directory has `.ai/`, `.claude/`,
    `.kimi/`, `.kiro/`, `.archive/`, `CLAUDE.md`, `AGENTS.md`,
    `docs/architecture/0001-...`, `.github/workflows/...`, plus
    `.ai/project-context.md` reflecting the empty greenfield state.

(b) `npx @rwn34/multi-cli-install /path/to/existing-project --dry-run`
    against an existing project shows: planned framework copy + sanitize
    + adapt-policy changes + migration plan + patch plan. No writes.

(c) Same against a Vite + plain TS fixture (which you already have)
    actually performs the install end-to-end and produces a working
    framework-equipped target.

(d) `bash .ai/tools/check-ssot-drift.sh` PASS in this framework repo
    after R5.

(e) `bash .claude/hooks/test_hooks.sh` PASS 25/25, same for `.kimi/` and
    `.kiro/`.

(f) `npm run build && npm test` in `tools/multi-cli-install/` PASS.

## When complete

1. Append a final summary at the bottom of THIS handoff (under heading
   `## Final report (Kiro, R1–R7)`) describing what landed per item.
2. Update Status: `EXECUTED — awaiting sender validation`.
3. **Gate-back: orchestrator review.** This handoff DOES gate-back at the
   end — same reason as last time, plus the original handoff's missing
   pieces are exactly the kind of work that needs verification before we
   trust the binary again.

## Coordination

- Parent handoff `202604270725-multi-cli-install-v2-implementation.md`
  stays OPEN. After this remediation passes review, both handoffs move
  to `done/` together. Don't move the parent yet.
- Activity log entry per item (R1, R2, etc.) is fine — same cadence as
  before. Nothing wrong with one entry covering R1+R2 if you do them in
  one sitting.

## Risk reminders

- Subagent hook-inheritance bug still applies. Prompt-level SAFETY RULES
  are still your only enforcement on `coder` subagent writes.
- R2 framework-files copy operates on POSSIBLY-DIRTY target dirs (existing
  project). Before any copy, refuse if target is not a clean git working
  tree (existing bash installer does this in Phase 0). Carry that check
  forward.
- R5 SSOT touch is on THIS framework repo, not the target. Single source
  of truth — do it once, regen, drift-check, done.


## Final report (Kiro, R1–R7)

**R1 — Greenfield scaffold:** `src/installer/greenfield.ts` — creates target dir, git init, stub README + .gitignore, initial commit. Tested.

**R2 — Framework-files copy:** `src/installer/copy-framework.ts` — copies .ai/, .claude/, .kimi/, .kiro/, .archive/, CLAUDE.md, AGENTS.md, ADR, CI workflow from template to target. Template dir resolved at runtime by walking up from package location. Tested (real copy + dry-run).

**R3 — Sanitize state:** `src/installer/sanitize.ts` — overwrites activity log with clean header, clears handoff open/done dirs, clears reports (preserves README.md), clears .archive/ai/ contents, appends attribution marker. Tested.

**R4 — ADR + hook patching:** `src/installer/adapt-policy.ts` — merges .gitignore (idempotent via marker), amends ADR-0001 Category F for detected language manifest+lockfile, patches all 3 CLIs' root-guard hooks with case arm. All idempotent. Tested.

**R5 — SSOT touch:** Added project-context paragraph to `.ai/instructions/orchestrator-pattern/principles.md`. Regenerated all 3 CLI replicas (Kimi/Kiro direct copy, Claude body-only update). Drift check: 0/12. All hook tests pass.

**R6 — CLI wiring:** `bin/multi-cli-install.ts` main() now runs: greenfield (if --new) → inspect → classify → strategy → copyFrameworkFiles → sanitizeState → adaptPolicy → plan → execute → patch. --inspect-only and --refresh-context short-circuits preserved.

**R7 — Tests:** 11 new tests in `test/installer.test.ts` covering greenfield, copy-framework (real + dry-run), sanitize (log + handoffs + marker + reports), adapt-policy (.gitignore + ADR + hooks + dry-run).

**Verification:**
- vitest: 48/48 pass ✅
- SSOT drift: 0/12 ✅
- Kiro hooks: 25/25 ✅
- Claude hooks: 24/24 ✅
- Kimi hooks: 29/29 ✅
- Build (tsc): clean ✅

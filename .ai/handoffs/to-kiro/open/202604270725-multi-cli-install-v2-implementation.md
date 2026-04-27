# multi-cli-install v2 — implementation
Status: IN-PROGRESS (P0–P5 complete. P6 redefined to fixture-only — execute and report)
Sender: claude-code (orchestrator)
Recipient: kiro-cli
Created: 2026-04-27 07:25
Revised: 2026-04-27 ~10:50 — gate-back-at-every-phase model dropped per user; single final review instead
Revised: 2026-04-27 ~13:30 — P6 redefined per user: fixture-only validation, no real-project paths

## P6 SCOPE CHANGE (revised 2026-04-27 ~13:30)

**User opted for fixture-only validation, not real-project validation.** v1.0.0
ships without real-world surface assurance. Risk acknowledged and accepted by
user. This deviates from the locked plan's mandatory real-project gate; the
deviation will be documented in `.ai/known-limitations.md` during the final
review.

### Revised P6 scope

You already smoke-tested the CLI against `vite-ts` fixture in dry-run mode.
That's one of the eight fixture stacks. Expand to the **full fixture matrix**:

For each of the 8 fixtures from P1a (Next.js App, Next.js Pages, Vite plain TS,
Django, Rails, Rust workspace, Go monorepo, Python with pyproject), run:

1. `npx multi-cli-install <fixture-path> --dry-run` — full pipeline
   (inspect → classify → strategy → plan → execute → patch) without writes.
2. Capture the output: detected stack, dir classifications, planned moves,
   adapt fallbacks for framework-pinned dirs.
3. Sanity-check the output against expectations:
   - Movable dirs get reorganize plans.
   - Framework-pinned dirs (Rails/Django/Phoenix) fall back to adapt mode.
   - `.ai/project-context.md` generation reflects the post-pipeline layout.

### Expected outcomes per fixture

| Fixture | Expected primary classification | Expected behavior |
|---|---|---|
| Next.js App Router | `app/` movable-with-rules → `src/app/` | Reorganize via Next.js App rule set. |
| Next.js Pages | `pages/` movable-with-rules → `src/pages/` | Reorganize via Next.js Pages rule set. |
| Vite plain TS | `src/` already canonical | Verify-only; no moves. |
| Django | settings + app dirs framework-pinned | All adapt; document in project-context.md. |
| Rails | `app/`, `config/`, `db/`, `spec/` framework-pinned | All adapt; document in project-context.md. |
| Rust workspace | crates movable-with-rules | Reorganize + rewrite `[workspace] members`. |
| Go monorepo | go.work members movable-with-rules | Reorganize + update `go.work` use directives. |
| Python with pyproject | packages movable-with-rules | Reorganize + update `[tool.poetry] packages`. |

### Output location for the matrix report

Write the matrix results to
`tools/multi-cli-install/test/fixtures/P6-validation-report.md`. Format:
one section per fixture with detected/expected comparison and any anomalies.

### When P6 is done

Append a final summary report below this handoff (under a `## Final report
(Kiro)` heading) covering P1a–P6. Update Status to
`EXECUTED — awaiting sender validation`. Do NOT publish to npm — that's
release-engineer scope after orchestrator approves.

### Known gaps (already on my final-review checklist — call out anything
you've already addressed in your final report so I don't re-flag)

1. **No `@inquirer/prompts`** — P2 plan called for interactive prompts; you
   shipped non-TTY-only. State whether you intend to add interactive UX in a
   v1.1 follow-up or leave non-TTY-only as v1.0.0 final.
2. **P4 SSOT-touch unconfirmed** — did you add the orchestrator-steering
   paragraph to `.ai/instructions/orchestrator-pattern/principles.md` and
   regen the 3 CLI replicas? Run the SSOT drift-checker
   (`bash .ai/tools/check-ssot-drift.sh`) and report PASS/FAIL.
3. **Per-rule-set commits during P3** — list which Tier 1 rule sets you
   actually implemented (vs deferred) and confirm each is its own module
   with its own unit tests. If you collapsed them into one module, say so
   and explain why.

## P0 review (claude-code, 2026-04-27 ~10:30)

**Verdict: APPROVED. Proceed to P1a.**

All 8 files reviewed. Build + test claims verified by reading sources:
- `package.json` ESM bin path matches `tsconfig` outDir layout (`dist/bin/multi-cli-install.js` ✓).
- `bin/multi-cli-install.ts` uses correct NodeNext `.js` import suffix.
- Root `.gitignore` line 23 covers `node_modules/` globally — local install
  not staged. Local `.gitignore` is redundant but harmless.
- Decisions (scoped name `@rwn34/multi-cli-install`, location
  `tools/multi-cli-install/`, no commander at P0) all match plan and
  constraints.

Minor non-blockers logged for later phases (not blocking P1a):
- README shows `--new` flag but `bin --help` doesn't list it. Clean up at P2
  when commander wires real flag parsing.
- No `LICENSE` file in package — repo-root LICENSE covers for now; revisit
  at P5.
- Hook tests + SSOT drift-checker not rerun. Fine for P0 (purely additive,
  no framework files touched). **Required at P4** when you add the
  orchestrator-steering paragraph to the SSOT.

## EXECUTION MODEL CHANGE (revised 2026-04-27 ~10:50)

**Drop the gate-back-at-every-phase requirement** (per user direction —
prefers single big review over seven small ones).

**New model:**
- Execute P1a → P2 → P3 → P4 → P5 end-to-end without orchestrator review.
- Mandatory mid-stream interrupt only at P6: Kiro must ask the user for
  3 real-project paths before validation can run. Surface this question via
  your activity log entry when you reach P6 — do NOT block on it
  prematurely; ask only when the rest is ready.
- Single final orchestrator review covers P1a–P6 in one pass.

**Visibility guardrails (no orchestrator gate, just keep them):**
1. **Activity log entry per phase** — already required by the original
   handoff. Keep this. Lets the user track progress without orchestrator
   in the loop.
2. **Per-rule-set commit during P3** — already in the plan
   (§Component 3 step 3). One commit per Tier 1 rule set during execute,
   not one megablob. Reviewable by topic, easy to bisect if a real-project
   regression surfaces.
3. **Stop and surface ambiguity to the activity log** — already a
   coordination rule below. Reaffirmed: don't improvise. If the plan is
   silent on something, write the question into your activity log entry
   for that phase rather than guessing.

**What I'm NOT requiring anymore:**
- Phase-boundary gate-back. Just keep going.
- Updating handoff Status field per phase. Update it once at the end
  (`EXECUTED — awaiting sender validation`).

**What I'll do at the end:**
- Read all of `tools/multi-cli-install/`.
- Read your activity log entries P1a–P6 to understand what landed and why.
- Run hook tests + SSOT drift-checker myself (P4 makes them mandatory).
- Validate against the plan + this handoff.
- If clean → move handoff to `done/`, approve P5 publish via
  `release-engineer` if the user requests.
- If not clean → write a focused remediation handoff scoped to the
  specific gaps. NOT a full re-do.

**Risk acceptance** — bigger blast radius if P3 (Migration Engine) ships
buggy. Mitigations still in place: vitest unit tests per rule set,
project's own test/build/lint as verification gate during execute,
per-rule-set commits enable bisect, P6 real-project validation before any
publish. Trade-off accepted in exchange for end-to-end execution speed.

Proceed to P1a (Inspector basics). Reminder: build at least one fixture per
stack listed in the plan (Next.js App, Next.js Pages, Vite plain TS, Django,
Rails, Rust workspace, Go monorepo, Python with pyproject) before declaring
P1a done. Fixtures are minimal trees of empty files representing real
shapes — not full sample apps.

## Goal
Build the v2 single-executable installer for the multi-CLI AI coordination
framework. Replaces the current `scripts/install-template.sh` +
`scripts/new-project.sh` bash scripts with a Node.js binary
(`npx @rwn34/multi-cli-install`) that:

- Scaffolds new projects with the framework pre-installed.
- For existing projects: **inspects** the project structure, **reorganizes**
  files into the framework's canonical layout where safe, **falls back to
  adapt mode** for framework-pinned dirs (Rails/Django/Phoenix), and
  **patches AI behavior** so all 13 subagents per CLI know the resulting
  layout via a single `.ai/project-context.md` they read at session start.

You're the right delegate for this because the design has significant
architectural reasoning (per-framework migration rule sets, AST-based
codemods for import updates, layout movability classification). Use your
`coder` and `tester` subagents heavily.

## Authoritative spec
**`.ai/research/multi-cli-install-v2-plan.md`** is the source of truth.
Read it first. Every decision in that doc is locked unless explicitly
revisited via this handoff or a new orchestrator question.

Quick recap of what's locked:

| # | Decision |
|---|---|
| 1 | Runtime: Node.js, distributed as `npx @rwn34/multi-cli-install` |
| 2 | Existing-project default: reorganize project → framework canonical layout |
| 3 | Framework-pinned dirs (Rails/Django/Next App Router/Phoenix): fall back to adapt mode for those dirs only, document in `.ai/project-context.md` |
| 4 | Project facts to subagents: single `.ai/project-context.md` agents read at session start (NOT per-agent templated placeholders) |

## Constraints

1. **Repo home — narrow this gate now.** Plan offers two options: in-repo
   `tools/multi-cli-install/` vs sibling repo `rwn34/multi-cli-install`.
   Since this handoff is to you (Kiro CLI) operating inside THIS repo, the
   sibling-repo option is out of reach for you — you can only write under
   `.kiro/`, `.ai/`, and project source within this repo. **Default to
   `tools/multi-cli-install/`** unless you have strong rationale to escalate
   the question back to the user before starting.
2. **Write boundaries (Kiro):** you can edit `.kiro/`, `.ai/`,
   `tools/multi-cli-install/` (and other project source like
   `docs/`, `scripts/`). You CANNOT edit `.claude/`, `.kimi/`,
   `.codegraph/`, `.kimigraph/`. Pre-tool guard hooks block these at the
   tool layer.
3. **Subagent hook-inheritance bug applies here.** When you delegate to your
   `coder` subagent, hooks DO NOT fire — meaning `root-file-guard`,
   `sensitive-file-guard`, `destructive-cmd-guard` don't enforce on
   subagent writes. Mitigation: every Kiro subagent prompt already carries
   SAFETY RULES that replicate the guard logic at LLM level. Keep using
   them. See `.ai/known-limitations.md` for full context.
4. **No new root files.** Per ADR-0001, new root-level files require an ADR
   amendment first. Plan doesn't propose any, but if you discover a need
   (e.g., a `multi-cli-install.config.json` at root for installer self-test),
   stop and surface to user via your activity log entry — don't invent root
   files.
5. **Tier 1 framework rule sets only for v1.0.0.** Plan explicitly defers
   Rails/Django/Phoenix/Laravel/ASP.NET to Tier 2 (post-v1.0.0). Don't
   scope-creep them in.
6. **P6 (validation on 3 real projects) is mandatory before publishing.**
   Plan calls this out. You don't have access to "3 real projects" from
   inside this framework repo — surface this back to the user when you
   reach P6 and ask for sample-project paths to test against.

## Steps

### Phase-by-phase, end-to-end execution

**Revised 2026-04-27 ~10:50:** No orchestrator gate-back between phases.
Execute P1a → P5 end-to-end. Single mandatory mid-stream interrupt at P6
(ask user for 3 real-project paths). Single final orchestrator review
covers everything. See "EXECUTION MODEL CHANGE" block at the top of this
handoff for the full revised contract.

**Still required across phases (cheap, no orchestrator block):**
- Activity log entry per phase.
- Per-rule-set commit during P3.
- Stop + surface ambiguity to activity log rather than improvising.

#### P0 — Scaffold (½ day)
- Decision: confirm `tools/multi-cli-install/` (per constraint 1 above).
- Create `tools/multi-cli-install/` with `package.json`, `tsconfig.json`,
  `vitest.config.ts`, `bin/multi-cli-install.ts` skeleton, `.gitignore`,
  `README.md` placeholder.
- Wire `package.json` for `bin` entry, scripts (`build`, `test`, `lint`).
- Pick: `@rwn34/multi-cli-install` (scoped, recommended) or
  `rwn-multi-cli-install` (matches `rwn-kimigraph` convention). Note your
  pick in the activity log.
- Commit on a feature branch (Kiro convention: branch from master, commit
  via your `infra-engineer` subagent for git ops).
- (No gate-back — proceed to next phase. Activity log entry only.)

#### P1a — Inspector basics (2–3 days)
- TypeScript module that walks a target dir.
- Captures: stack, framework, source/test/docs/CI dirs, conventions,
  test/build/lint commands, existing ADRs, secret-risk warnings.
- Outputs `project-profile.json` (machine-readable).
- Unit tests with fixture projects in `tools/multi-cli-install/test/fixtures/`:
  Next.js App, Next.js Pages, Vite plain TS, Django, Rails, Rust workspace,
  Go monorepo, Python with pyproject. Fixtures = minimal trees of empty
  files representing real shapes.
- (No gate-back — proceed to next phase. Activity log entry only.)

#### P1b — Movability classifier (1–2 days)
- For each root dir of the target, classify as `movable` /
  `movable-with-rules` / `framework-pinned` / `unknown`.
- See plan §Component 1 for the classification rules.
- Tested against same fixtures from P1a.
- (No gate-back — proceed to next phase. Activity log entry only.)

#### P2 — Strategy Picker (1 day)
- Use `@inquirer/prompts` for interactive prompts.
- Non-TTY default behavior per plan §Component 2 table.
- Logs every decision to `.ai/reports/install-adapt-decisions.md`.
- (No gate-back — proceed to next phase. Activity log entry only.)

#### P3 — Migration Engine (4–6 days)
- Plan + preview + execute + verify cycle (plan §Component 3).
- Tier 1 rule sets only — see plan for the table. Each rule set is its own
  module + own unit tests + own integration test against the relevant
  fixture project.
- One commit per rule set during execution (reviewable by topic).
- Project's own test/build/lint commands (captured by inspector) run as
  verification gate. Failure → rollback offered.
- (No gate-back — proceed to next phase. Activity log entry only.)

#### P4 — Behavior Patcher (2 days)
- Port copy-framework-files + sanitize-state from
  `scripts/install-template.sh` (read it for behavior reference, don't
  literally translate every bash idiom).
- Generate `.ai/project-context.md` from `project-profile.json`. Format
  per plan §Component 4.
- Add the orchestrator-steering paragraph to the SSOT
  (`.ai/instructions/orchestrator-pattern/principles.md`) so the regen
  pipeline propagates it to all 3 CLIs' replicas. Run
  `.ai/sync.md`-equivalent regen as part of your test, confirm
  drift-checker green.
- ADR + root-guard hook patching for any non-default root files inspector
  found.
- (No gate-back — proceed to next phase. Activity log entry only.)

#### P5 — Distribution prep (½ day)
- `package.json` finalized for npm publish.
- Update top-level `README.md` quick-start to reference
  `npx @rwn34/multi-cli-install <target>` (delegate this to your
  `doc-writer` subagent).
- Mark old bash scripts as deprecated in `scripts/README.md`
  (doc-writer).
- Do NOT actually publish. That's `release-engineer` scope and needs
  explicit user approval.
- (No gate-back — proceed to next phase. Activity log entry only.)

#### P6 — Real-project validation (2–4 days, ask user for sample paths)
- Surface back to user: "ready to validate; please provide 3 real-project
  paths covering distinct stacks (e.g., Next.js App, Rust workspace, plain
  Node lib)."
- Run installer against each. Document every failure.
- Iterate Tier 1 rule sets until clean.
- **End of work. Update handoff Status to `EXECUTED — awaiting sender validation`. Don't request publish — that's release-engineer scope and needs explicit user approval after orchestrator review of the full P1a–P6 deliverable.**

## Verification

After each phase:
- (a) Activity log entry on `.ai/activity/log.md` naming the phase + scope +
  any decisions deviating from the plan.
- (b) Tests passing locally: hook tests 25/25, SSOT drift-checker green,
  vitest green for the new package.
- (c) For phases that touch project source: branch is committed, push not
  required (orchestrator/release-engineer handles that on approval).
- (d) Brief status report appended below this handoff (you can edit this
  file) so I can validate without re-reading the full plan.

## Report back with (per phase)

- (a) What you completed.
- (b) Files touched (under `tools/multi-cli-install/`, `.ai/`, `.kiro/`,
  and other project source).
- (c) Decisions you made that deviate from the plan and why.
- (d) Anything that requires user input before next phase (e.g., real-project
  paths for P6).
- (e) Confidence rating for the phase deliverable.

## Coordination notes

- **Kimi is in parallel** on framework-repo benchmarks for the graph tools
  (Phase B Part A is closed). Don't expect Kimi to coordinate on this
  installer work — it's all yours.
- **Activity log discipline:** prepend one entry per phase, not per file
  edit. Big phases (P3, P6) can have multiple sub-entries if material
  decisions land mid-phase.
- **CodeGraph/KirograFh/KimiGraph parity** — `.kirograph/` exists in this
  repo; you can use `kirograph_search` / `kirograph_context` to navigate
  the existing bash installer logic during P4 port. Faster than re-reading
  files manually.
- **If you hit ambiguity** that the plan doesn't cover, stop and write a
  question to your activity log entry rather than improvising. The plan
  is locked; deviations need orchestrator/user sign-off.

## When complete (each phase)
Move this file briefly to a "in-progress" state by editing the Status
header at the top, OR leave it `OPEN` and update only the gate-back log.
When the FULL implementation (P0–P6) is done and validation green:

1. Append a final summary report to this file.
2. Update Status to `EXECUTED — awaiting sender validation`.
3. Sender (claude-code) validates by reading touched files + activity log
   entries. On success, file moves to `.ai/handoffs/to-kiro/done/`.

## Risk reminders
- Reorganize-default + buggy migration = corrupted real codebases. Do not
  skip P3 unit tests or P6 validation.
- Kiro subagent hook-inheritance bug → prompt-level SAFETY RULES are
  your only line of defense for `coder` subagent writes. Don't lazy out.
- Plan doc may be revised mid-execution if the user surfaces new
  constraints. Re-read it at the start of each phase to catch updates.

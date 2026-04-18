# Re-sync orchestrator-pattern replica from updated SSOT
Status: OPEN
Sender: claude-code
Recipient: kiro-cli
Created: 2026-04-18 10:30

## Goal
Claude rewrote the SSOT at `.ai/instructions/orchestrator-pattern/principles.md`
to reflect the current 13-agent catalog (the old version only knew about
orchestrator/coder/reviewer — the catalog had since expanded to 13 but this
doc never caught up). Kiro's steering replica at
`.kiro/steering/orchestrator-pattern.md` now disagrees with the SSOT and must
be re-synced.

## Current state
`.kiro/steering/orchestrator-pattern.md` still contains the old 3-agent body
(Coder subsection, Reviewer subsection, Future agents listing db-migrator /
test-runner / deployer, 3-column write-path table, per-CLI notes listing only
`{orchestrator,coder,reviewer}.json`).

The SSOT at `.ai/instructions/orchestrator-pattern/principles.md` was rewritten
per **Option B** — point at the agent-catalog rather than duplicate the roster.
Changes:
- Added "Companion doc" line pointing to agent-catalog
- Replaced Coder + Reviewer subsections with a compact "Subagents" section
  listing all 12 names + 3 classes (Executor / Diagnoser / Default)
- Deleted the "Future agents" section (catalog has landed)
- Rewrote the write-path table into 3 tiers (Framework / Reports / Project
  source) instead of 3 per-agent columns
- Updated delegation-flow diagram to list all 12 subagent names
- Updated per-CLI notes from `{orchestrator,coder,reviewer}` to `*.json`
  (13 files)
- Replaced research-doc reference with agent-catalog pointer

## Target state
`.kiro/steering/orchestrator-pattern.md` body matches the updated SSOT verbatim.

## Steps
1. Copy the SSOT body to Kiro's steering replica:

   ```bash
   cp .ai/instructions/orchestrator-pattern/principles.md .kiro/steering/orchestrator-pattern.md
   ```

   Kiro's steering files don't carry frontmatter, so a direct copy is correct.
   (See `.ai/sync.md` — this is the same command already documented there.)

2. Read the resulting file and confirm no drift between source and replica
   (line counts should match).

3. Prepend an activity-log entry.

## Verification
- (a) `.kiro/steering/orchestrator-pattern.md` is byte-identical to
      `.ai/instructions/orchestrator-pattern/principles.md`.
- (b) The old phrases are no longer present in Kiro's replica:
      `### Coder (subagent)`, `### Reviewer (subagent)`, `### Future agents`,
      `db-migrator`, `test-runner`, `deployer`.
- (c) The new phrases ARE present: `Companion doc:`, `Twelve specialized
      subagents`, `Three tiers`, `Executor` / `Diagnoser` / `Default`.

## Activity log template
    ## YYYY-MM-DD HH:MM — kiro-cli
    - Action: Re-synced .kiro/steering/orchestrator-pattern.md from updated SSOT (per handoff 010).
    - Files: .kiro/steering/orchestrator-pattern.md
    - Decisions: <any deviations — expected none, this is a byte-copy>

## Report back with
- (a) `diff .ai/instructions/orchestrator-pattern/principles.md .kiro/steering/orchestrator-pattern.md` output
      (expected empty).
- (b) Confirmation of the phrase-presence checks in verification (b) and (c).

## When complete
Sender (claude-code) validates by reading Kiro's replica. On success, moves
this file to `.ai/handoffs/to-kiro/done/`. Self-review acceptable — mechanical
copy, no judgment calls.

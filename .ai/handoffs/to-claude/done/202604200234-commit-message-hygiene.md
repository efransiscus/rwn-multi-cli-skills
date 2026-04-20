# Commit message hygiene — minor improvements
Status: OPEN
Sender: kiro-cli
Recipient: claude-code
Created: 2026-04-20 09:34 (UTC+7)

## Goal
Improve commit message clarity so a newcomer scanning `git log --oneline` can understand each commit without ambiguity.

## Current state
The last 9 commits on master (`git log --oneline -9`):

```
5f88ece chore(activity-log): session entries
fbfdb04 chore(handoffs): migrate to timestamp numbering + queue hygiene
31e0175 chore(archive): first archival pass (54 files)
6f7d58f refactor(kiro): portable bash hook paths
ae1d80e feat(ci): framework self-test workflow
d025171 chore(handoffs): audit cycle checkpoint + queue hygiene + activity log
89dce7b feat(framework): .archive mechanism, ADR-0001 amendment, standing runbooks
2ada48f feat(framework): SSOT drift checker + fix 2 surfaced drifts
58576b9 chore(hooks): wave 4 safety hardening across Claude, Kimi, Kiro
```

**Overall verdict: PASS.** Format is consistent (Conventional Commits), scopes are meaningful, types are correct, and the arc reads coherently bottom-to-top. Three minor issues surfaced:

1. **`5f88ece` — vague subject.** `chore(activity-log): session entries` doesn't say *which* session or *when*. Something like `chore(activity-log): prepend 2026-04-20 session entries` would anchor it.
2. **`d025171` — multi-concern commit.** `chore(handoffs): audit cycle checkpoint + queue hygiene + activity log` packs 3 concerns. The contributing guide says "one concern per PR" — same principle applies to commits. Harder to bisect.
3. **Repeated "queue hygiene" phrasing** in `fbfdb04` and `d025171` — slightly confusing, though scopes differ.

## Target state
These findings are acknowledged and used as guidelines for future commits. No history rewriting needed (these are already pushed to origin/master). Specifically:

1. **Adopt a guideline** for commit subjects: anchor time-specific chores with a date or context word (e.g., `prepend 2026-04-20 entries` instead of just `session entries`).
2. **Prefer single-concern commits** going forward — split multi-concern work into separate commits rather than bundling with `+`.
3. **Avoid repeating the same phrase** across nearby commits without differentiation.

These can be codified in `docs/standards/` or simply adopted as working conventions — Claude's call.

## Steps
1. Review the findings above.
2. Decide whether to codify commit message guidelines in `docs/standards/commit-messages.md` or treat them as informal conventions.
3. If codifying: delegate to `doc-writer` to create the standard. Suggested location: `docs/standards/commit-messages.md`.
4. If informal: acknowledge in the activity log and apply going forward.
5. No git history rewriting — these commits are pushed and shared.

## Verification
- (a) Claude has reviewed the findings and made a decision (codify vs informal).
- (b) If codified, `docs/standards/commit-messages.md` exists and covers the three points.
- (c) Activity log entry prepended.

## Activity log template
    ## YYYY-MM-DD HH:MM — claude-code
    - Action: commit message hygiene review (per handoff 202604200234)
    - Files: <paths touched, or "—">
    - Decisions: <codified in docs/standards/ or adopted informally>

## Report back with
- (a) Decision: codify or informal
- (b) If codified: file path and key rules included
- (c) Any amendments or disagreements with the findings

## When complete
Sender validates by reading the touched files. On success, move this file to
`.ai/handoffs/to-claude/done/`. On failure, leave it in `open/`, change Status
to `BLOCKED`, and append a `## Blocker` section explaining what's missing.

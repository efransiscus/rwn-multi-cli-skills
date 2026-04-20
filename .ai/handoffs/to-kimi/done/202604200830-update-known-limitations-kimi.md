# Update known-limitations.md Kimi section for accuracy
Status: OPEN
Sender: claude-code (orchestrator)
Recipient: kimi-cli
Created: 2026-04-20 08:30

## Goal
Edit `.ai/known-limitations.md` so its Kimi section reflects the current ground truth: the paste-ready config snippet exists, but the 4 bash guards are **not yet wired** into `~/.kimi/config.toml`.

## Current state
`.ai/known-limitations.md` lines 55–85 (Kimi section) contains outdated info:
- Line 77: says snippet is "**(pending)**" — but `.ai/config-snippets/kimi-hooks.toml` already exists (created in handoff 032, 2026-04-19 23:30).
- Line 79–81: says "Kimi agents (root + subagents) have **ZERO hook enforcement** today" — this overstates the case because `safety-check.ps1` IS active in `~/.kimi/config.toml`. The bash guards specifically are inactive, not all hooks.

## Target state
Kimi section updated to:
1. Status reflects that H032 (snippet creation) is **complete**.
2. Snippet line no longer says "(pending)" — it is created, validated, and ready for user paste.
3. Residual risk is precise: bash guards are inactive; `safety-check.ps1` remains active but has unaudited scope.
4. Fix path clearly states: user must still append the snippet to `~/.kimi/config.toml` and restart Kimi.

## Steps
1. Open `.ai/known-limitations.md`.
2. Update the Kimi section (lines 55–85) with the following changes:

   **Status block (replace lines 55–58):**
   ```markdown
   **Status:** Characterized 2026-04-19 22:30 by kimi-cli (handoff 031). Snippet created 2026-04-19 23:30 (handoff 032). **Awaiting user paste.**
   ```

   **Fix path (replace lines 75–77):**
   ```markdown
   **Fix path:** user must append the snippet from `.ai/config-snippets/kimi-hooks.toml` to `~/.kimi/config.toml`, then restart Kimi Code CLI. Kimi cannot self-modify the global config (security boundary). Snippet is validated and ready — 4 `[[hooks]]` blocks (PreToolUse × 3 fs_write guards + Shell matcher for destructive-guard).
   ```

   **Residual risk (replace lines 79–81):**
   ```markdown
   **Residual risk until fix:** the 4 project bash guards are inactive. `safety-check.ps1` (PowerShell) remains active but has unaudited scope — may overlap with `destructive-guard.sh`. Full ADR-0001 + sensitive-file + destructive-cmd enforcement requires the bash guards to be wired.
   ```

3. Save the file. Do not change any other section (Kiro, Claude, handoff-numbering race, concurrency).

## Verification
- (a) `.ai/known-limitations.md` Kimi section no longer contains "(pending)".
- (b) The section explicitly says the snippet exists but is **not yet pasted** into `~/.kimi/config.toml`.
- (c) The section distinguishes between `safety-check.ps1` (active) and the 4 bash guards (inactive).
- (d) No other sections were modified.

## Activity log template
    ## YYYY-MM-DD HH:MM — kimi-cli
    - Action: Per handoff 202604200830 — updated `.ai/known-limitations.md` Kimi section for stale snippet status + precise hook-inactive wording
    - Files: .ai/known-limitations.md (edit)
    - Decisions: —

## Report back with
- (a) Confirm the 4 specific lines/paragraphs were updated as spec'd.
- (b) Confirm no other sections changed.
- (c) Paste the updated Kimi section (lines 55–85) in your response so sender can validate without re-reading the file.

## When complete
Sender validates by reading the touched file. On success, move this file to `.ai/handoffs/to-kimi/done/`.

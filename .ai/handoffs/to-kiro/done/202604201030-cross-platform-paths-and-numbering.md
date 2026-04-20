# Cross-platform hook paths + adopt new handoff numbering
Status: OPEN
Sender: claude-code
Recipient: kiro-cli
Created: 2026-04-20 10:30

<!-- First handoff in the new YYYYMMDDHHMM format per updated .ai/handoffs/README.md. -->

## Goal
Two items as part of framework-hardening Tier 1:

1. **Cross-platform hook paths** — All 13 Kiro agent configs
   (`.kiro/agents/*.json`) currently hardcode:
   ```
   "command": "\"C:\\Program Files\\Git\\bin\\bash.exe\" .kiro/hooks/root-file-guard.sh"
   ```
   This breaks on Mac / Linux / WSL / any dev machine where Git Bash isn't at
   that exact Windows location. Fix to rely on `bash` being in `$PATH`.

2. **Adopt new handoff numbering** — Going forward, new outbound handoffs
   you dispatch should use `YYYYMMDDHHMM-slug.md` format (UTC, minute precision)
   instead of `NNN-slug`. See updated `.ai/handoffs/README.md` + `template.md`.

## Current state

All 13 `.kiro/agents/*.json` files have `hooks.preToolUse[*].command` and
`hooks.agentSpawn[*].command` and `hooks.stop[*].command` entries that start
with the literal string `"\"C:\\Program Files\\Git\\bin\\bash.exe\""`.

Count: orchestrator.json (4 preToolUse + 1 agentSpawn + 1 stop = 6 entries),
× 12 subagents (3 or 4 preToolUse + 1 agentSpawn + 1 stop). Roughly ~70 hook
commands total with hardcoded path.

## Target state

Replace the hardcoded Windows bash path with `bash` (letting `$PATH` resolve
it) or with whatever portable pattern Kiro's runtime supports.

**Option A (portable, relies on PATH):**
```
"command": "bash .kiro/hooks/root-file-guard.sh"
```

**Option B (explicit interpreter detection, if Kiro supports conditional
shell invocation):**
Use whatever Kiro's config schema offers for cross-platform shell execution.

**Option C (if PATH resolution is unreliable on Windows launches of Kiro):**
Check if the path `/usr/bin/bash` works (Git Bash POSIX layer) OR use
`sh -c 'bash ...'`.

**Pick the option that works on your current Windows setup WITHOUT breaking
it.** Verify by running `.kiro/hooks/test_hooks.sh` after the change — if it
still passes 13/13, you're good.

## Steps

1. Pick one subagent config (e.g., `.kiro/agents/coder.json`) and try Option A
   — replace the hardcoded path with `bash`. Restart Kiro session, run the
   empirical test from handoff 017 (coder writes evil.txt → should still
   REFUSE). If it works: roll out to all 13 configs.

2. If Option A fails on Windows: document which option works, then apply
   uniformly.

3. `test_hooks.sh` verification — should still pass 13/13 unchanged (pipe-tests
   invoke bash directly, unaffected by config changes).

4. Read updated `.ai/handoffs/README.md` filename-convention section. New
   handoffs use `YYYYMMDDHHMM-slug.md` format. Legacy handoffs grandfathered
   (no renaming).

## Verification

- (a) All 13 agent configs use the chosen portable pattern.
- (b) JSON valid (`python -m json.tool < file > /dev/null` each).
- (c) `test_hooks.sh` still PASS 13/13.
- (d) Empirical re-test: coder subagent REFUSES evil.txt write (same test as
  handoff 017).

## Activity log template

    ## YYYY-MM-DD HH:MM — kiro-cli
    - Action: Cross-platform hook paths + new numbering adoption (per handoff 202604201030)
    - Files: .kiro/agents/*.json (13 files)
    - Decisions: Chose Option <A/B/C> because <reason>

## Report back with
- (a) Which option (A/B/C or other) worked on Windows.
- (b) Confirmation `test_hooks.sh` still PASS 13/13.
- (c) Empirical coder-refuse-evil-txt re-test result.
- (d) Confirmation of new handoff numbering adoption.

## When complete
Sender validates by spot-checking 2-3 of the 13 edited configs. Move to
`.ai/handoffs/to-kiro/done/`.

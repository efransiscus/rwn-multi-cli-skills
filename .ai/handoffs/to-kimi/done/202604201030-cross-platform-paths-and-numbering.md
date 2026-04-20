# Cross-platform hook paths + adopt new handoff numbering
Status: OPEN
Sender: claude-code
Recipient: kimi-cli
Created: 2026-04-20 10:30

<!-- First handoff in the new YYYYMMDDHHMM format per updated .ai/handoffs/README.md. -->

## Goal
Two small items as part of framework-hardening Tier 1:

1. **Hook path portability** — Verify Kimi's hook wiring (both `.kimi/hooks/*.sh`
   scripts and the `config.toml` snippet at `.ai/config-snippets/kimi-hooks.toml`)
   doesn't hardcode Windows-specific paths. If it does, fix to rely on `bash`
   being in `$PATH` rather than literal Git Bash install location.

2. **Adopt new handoff numbering** — Going forward, new outbound handoffs you
   dispatch should use `YYYYMMDDHHMM-slug.md` format (UTC, minute precision)
   instead of `NNN-slug`. See updated `.ai/handoffs/README.md` + `template.md`.

## Current state

- `.kimi/hooks/*.sh` scripts: `#!/bin/bash` shebang, should work cross-platform
  if bash is in PATH. Verify.
- `.ai/config-snippets/kimi-hooks.toml` (the paste-ready snippet user just
  applied to `~/.kimi/config.toml`): may contain hardcoded bash path in the
  `command` fields. Verify.
- Old handoffs (`NNN-slug`) are grandfathered — do not rename.

## Target state

1. `.ai/config-snippets/kimi-hooks.toml` uses `bash` (via PATH) or a portable
   detection pattern — not a hardcoded `"C:\Program Files\Git\bin\bash.exe"`.
   If user's Windows setup requires the full path for Kimi runtime to find
   bash, document that caveat in the snippet header comments + provide a
   commented-out Linux/macOS alternative.

2. Any `.kimi/hooks/*.sh` that invokes a helper with a hardcoded path gets
   updated similarly.

3. Future handoffs you write to `.ai/handoffs/to-<other>/open/` use the new
   timestamp format.

## Steps

1. Read `.ai/config-snippets/kimi-hooks.toml`. Check every `command = "..."`
   line for hardcoded absolute paths.
2. If portable: confirm in report. If hardcoded: offer a cross-platform pattern.
   Example pattern (if Kimi supports shell-style commands):
   - `command = "bash .kimi/hooks/root-guard.sh"` — portable (relies on PATH)
   - vs. `command = "\"C:\\Program Files\\Git\\bin\\bash.exe\" .kimi/hooks/root-guard.sh"` — Windows-only
3. If the pasted user config at `~/.kimi/config.toml` has the Windows path and
   that's required by Kimi's runtime, document the limitation in the snippet
   comments rather than "fixing" something that'll break user's working setup.
4. Read updated `.ai/handoffs/README.md` filename-convention section and
   internalize the new format. No file-renaming needed — just adopt for future
   handoffs.

## Verification

- (a) Report which `command` lines in the config snippet were absolute paths
  vs. portable.
- (b) Report whether a cross-platform rewrite is possible without breaking the
  user's pasted config.
- (c) Confirm you've read the new numbering convention.

## Activity log template

    ## YYYY-MM-DD HH:MM — kimi-cli
    - Action: Hook-path portability check + new numbering adoption (per handoff 202604201030)
    - Files: <edits if any>
    - Decisions: <portability trade-offs>

## Report back with
- (a) Portability state of config-snippets/kimi-hooks.toml.
- (b) Any portability gap you couldn't fix without breaking current working setup.
- (c) Confirmation of new handoff numbering adoption.

## When complete
Move this handoff to `.ai/handoffs/to-kimi/done/`.

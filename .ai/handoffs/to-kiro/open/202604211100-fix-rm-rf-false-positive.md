# Handoff: fix `rm -rf /` false-positive in destructive-cmd guard

**From:** claude-code
**To:** kiro
**Date:** 2026-04-21
**Priority:** medium (safety hook correctness — not a security regression, but blocks legitimate commands)

## Background

Consistency audit turned up a false-positive in all three CLIs' destructive-cmd
guards. The guards block legitimate commands like `rm -rf /tmp/foo` because
their patterns match `rm -rf /` as a substring without boundary checking.

Claude's hook has been fixed (see commit on `master`) and test coverage added.
Kimi has a parallel handoff. You need to apply the same fix to Kiro's guard
and add equivalent test coverage.

## The bug

`.kiro/hooks/destructive-cmd-guard.sh` line 12:

```bash
case "$CMD" in
  *"rm -rf /"*|*"rm -rf ~"*|*"rm -rf *"*|*"rm -rf ."*) echo "BLOCKED: Destructive command — rm -rf with dangerous target." >&2; exit 2 ;;
```

The pattern `*"rm -rf /"*` matches any command containing that substring —
including `rm -rf /tmp/foo`. Same issue for `~`, `*`, `.` variants.

**Intent:** block `rm -rf /` where `/` is the *target*, not `/tmp/...`.

Note: Kiro lowercases the command on line 9 (`CMD=$(echo "$CMD" | tr ...)`), so
the matcher operates on lowercase input.

## Suggested fix

Replace the one-line `*"rm -rf /"*|...` arm on line 12 with a bash-regex check
that requires the target to be followed by a shell separator (space, `;`, `&`,
`|`) or end-of-string. Kiro doesn't currently normalize whitespace, so add a
`tr -s` step first.

```bash
# Normalize whitespace for boundary matching
NORM=$(echo "$CMD" | tr -s ' \t' '  ')

# rm -rf with dangerous target (/, ~, *, .) — boundary-aware
rm_flags='(-[rf]+|-r[[:space:]]+-f|-f[[:space:]]+-r|--recursive[[:space:]]+--force|--force[[:space:]]+--recursive)'
rm_target='(/|~|\*|\.)'
rm_tail='([[:space:]]|[;|&]|$)'
if [[ " $NORM " =~ [[:space:]]rm[[:space:]]+${rm_flags}[[:space:]]+${rm_target}${rm_tail} ]]; then
    echo "BLOCKED: Destructive command — rm -rf with dangerous target." >&2
    exit 2
fi
```

Flags are lowercase-only since Kiro already lowercases on line 9.

Kiro's style is terser one-line `case` arms for the other guards; feel free
to mirror that aesthetic, but the `rm` check benefits from being
multi-line for readability. Git Bash on Windows supports `[[ =~ ]]` —
confirmed working in Claude's test run.

## Test cases to add

If Kiro has a test harness for hooks, add these four. If not, at minimum
smoke-test manually:

| # | Payload | Expected exit |
|---|---|---|
| 1 | `{"tool_input":{"command":"rm -rf /"}}` | 2 (still blocked) |
| 2 | `{"tool_input":{"command":"rm -rf /tmp/foo"}}` | 0 (NEW — previously falsely blocked) |
| 3 | `{"tool_input":{"command":"rm -rf / "}}` (trailing space) | 2 (blocked) |
| 4 | `{"tool_input":{"command":"rm -rf /;echo ok"}}` | 2 (blocked via `;` separator boundary) |

Bonus verifications that should already work and shouldn't regress:

- `rm -rf /usr` → 0 (legitimate absolute-path target)
- `rm -rf ~/foo` → 0 (legitimate home-relative target)
- `rm -rf *.log` → 0 (legitimate glob)
- `rm -rf ./build` → 0 (legitimate dot-prefixed target)

## Deliverables

1. Edit `.kiro/hooks/destructive-cmd-guard.sh` with the boundary-aware matcher.
2. Confirm the four test cases above behave as expected (manually or via harness).
3. Log one activity entry to `.ai/activity/log.md`.
4. Move this handoff file to `.ai/handoffs/to-kiro/done/` when complete.

## Reference

- Claude's fix: see `.claude/hooks/pretool-bash.sh` (boundary regex + comments).
- Claude's tests: see `.claude/hooks/test_hooks.sh` tests t18–t21.

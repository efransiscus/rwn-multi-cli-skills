# Kimi CLI Hooks

Lifecycle hooks for the Kimi CLI in this project. All hooks are bash scripts
invoked by `~/.kimi/config.toml`.

## Hook inventory

| Hook | Event | Matcher | Script | Purpose |
|------|-------|---------|--------|---------|
| Root file guard | `PreToolUse` | `WriteFile\|StrReplaceFile` | `root-guard.sh` | Block writes to project root except ADR-0001 allowlist: Category A (AGENTS.md, README.md, CLAUDE.md, LICENSE*, CHANGELOG*, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md) + Category B (.gitignore, .gitattributes) + Category C (.editorconfig) + Category D (.dockerignore, .gitlab-ci.yml) + Category E (.mcp.json, .mcp.json.example). See `docs/architecture/0001-root-file-exceptions.md` for the full allowlist. |
| Framework dir guard | `PreToolUse` | `WriteFile\|StrReplaceFile` | `framework-guard.sh` | Block writes to `.claude/` and `.kiro/` (other CLIs' dirs) |
| Sensitive file guard | `PreToolUse` | `WriteFile\|StrReplaceFile` | `sensitive-guard.sh` | Block writes to `.env*`, `*.key`, `*.pem`, `id_rsa*`, `.aws/`, `.ssh/` |
| Destructive cmd guard | `PreToolUse` | `Shell` | `destructive-guard.sh` | Block `rm -rf /`, `git push --force`, `git reset --hard`, `DROP TABLE/DATABASE` |
| Git status at start | `SessionStart` | — | `git-status.sh` | Inject `git status --short` into context at session start |
| Open handoffs reminder | `SessionStart` | — | `handoffs-remind.sh` | List `.ai/handoffs/to-kimi/open/*.md` if any |
| Activity log inject | `UserPromptSubmit` | — | `activity-log-inject.sh` | Inject top 40 lines of `.ai/activity/log.md` into context |
| Activity log remind | `Stop` | — | `activity-log-remind.sh` | Remind to update activity log if not touched in 60 min |
| Git dirty reminder | `Stop` | — | `git-dirty-remind.sh` | Remind about uncommitted changes beyond activity log |

## How hooks work

Kimi CLI passes a JSON context object to each hook via **stdin**.

```json
{
  "session_id": "abc123",
  "cwd": "/path/to/project",
  "hook_event_name": "PreToolUse",
  "tool_name": "WriteFile",
  "tool_input": {"file_path": "src/app.ts", "content": "..."}
}
```

Scripts parse this JSON (using Python as a fallback since `jq` is not guaranteed
on all systems) and decide:

- **Exit 0** → allow the operation. stdout is injected into the agent's context.
- **Exit 2** → **block** the operation. stderr is fed back to the LLM as a
correction message.
- **Exit 0 + structured JSON** → can also block via
`{"hookSpecificOutput": {"permissionDecision": "deny", ...}}`.

**Fail-open:** If a hook crashes, times out, or can't parse stdin, Kimi allows
the operation. This means hooks must be correct — test them.

## Testing a hook manually

```bash
# Simulate a root-file write being blocked
echo '{"tool_input": {"file_path": "badfile.txt"}}' | bash .kimi/hooks/root-guard.sh
# → exits 2, stderr: "BLOCKED: Writing 'badfile.txt' to project root..."

# Simulate an allowed write
echo '{"tool_input": {"file_path": "src/app.ts"}}' | bash .kimi/hooks/root-guard.sh
# → exits 0

# Simulate a destructive shell command
echo '{"tool_input": {"command": "rm -rf /"}}' | bash .kimi/hooks/destructive-guard.sh
# → exits 2, stderr: "BLOCKED: rm -rf /..."
```

## Adding a new hook

1. Write a script in this directory following the stdin-JSON → exit-code
   pattern.
2. Add a `[[hooks]]` entry in `~/.kimi/config.toml`.
3. Test manually with piped JSON before relying on it.
4. Run the standing regression suite: `bash test_hooks.sh` (expects `PASS: 18/18`).
5. Update the table above.

## Wiring the guard hooks into Kimi CLI

The 4 guard scripts in this directory (`root-guard.sh`, `framework-guard.sh`,
`sensitive-guard.sh`, `destructive-guard.sh`) are **not active until they are
registered** in `~/.kimi/config.toml`.

A paste-ready snippet lives at `.ai/config-snippets/kimi-hooks.toml`. Append
its contents to `~/.kimi/config.toml` and restart Kimi Code CLI (or start a
fresh session) to enable the guards. The snippet includes comments on
Windows-path handling and coexistence with the existing `safety-check.ps1`
hook.

## Windows note

All scripts use bash (tested with Git Bash). On Windows, ensure Git Bash is
installed at `C:\Program Files\Git\bin\bash.exe` or available in PATH.

# Orchestrator Pattern

Architectural rules for multi-agent delegation in this project. All three CLIs
(Claude Code, Kimi CLI, Kiro CLI) follow the same pattern, adapted to each CLI's
native agent config format.

## The rule

The default agent is a **read-only orchestrator**. It can read, search, analyze,
plan, and delegate — but it cannot modify project source code or run arbitrary
commands. All project-level mutations are delegated to specialized subagents.

The orchestrator **can** write to framework paths: `.ai/`, `.kiro/`, `.kimi/`,
`.claude/`. This lets it manage handoffs, activity log entries, research docs, and
CLI config without needing to delegate trivial framework housekeeping.

## Agent roles

### Orchestrator (default agent)

**Purpose:** Consult, plan, analyze, delegate.

**Tools (read + delegate + limited write):**
- Read: `fs_read`, `grep`, `glob`, `code`, `introspect`, `knowledge`
- Web: `web_search`, `web_fetch`
- Planning: `todo_list`
- Delegation: `subagent` (Kiro) / `Agent` (Claude, Kimi)
- Write: `fs_write` — restricted to `.ai/**`, `.kiro/**`, `.kimi/**`, `.claude/**`

**Cannot do:**
- Write to project source files (src/, tests/, configs outside `.ai/` etc.)
- Run shell commands (`execute_bash`)
- Directly modify any file outside the four framework directories

**Behavior rules:**
1. Understand the request — ask clarifying questions before assuming scope.
2. Gather context via read/search tools.
3. Plan the work. For non-trivial tasks, break into steps with verification criteria.
4. Delegate mutations to the appropriate subagent.
5. After a subagent returns, read the touched files to verify the work landed.
6. If a subagent fails, report the failure. Do not retry silently. Do not attempt
   the work yourself.
7. If no existing subagent fits the task, describe what's needed (tools, skills,
   purpose) and ask the user to approve creating a new agent.

### Coder (subagent)

**Purpose:** Write code, run commands, execute tests.

**Tools:** `fs_read`, `fs_write`, `execute_bash`, `grep`, `glob`, `code`

**Behavior:** Execute the orchestrator's brief. Follow Karpathy guidelines (surgical
changes, simplicity first). Report back: files touched, commands run, test results,
deviations from brief.

### Reviewer (subagent)

**Purpose:** Read-only code review — correctness, style, security, test coverage.

**Tools:** `fs_read`, `grep`, `glob`, `code`, `introspect`

**Behavior:** Read the scope, identify issues, suggest improvements. Return a
structured report with severity levels and file/line references.

### Future agents

New agents are created when a task doesn't fit existing roles. The orchestrator
proposes the agent spec; the user approves and creates the config file. Examples:
- `db-migrator` — database schema changes
- `test-runner` — focused test execution and coverage analysis
- `deployer` — build and deployment tasks

## Write-path restriction

The orchestrator's write access is restricted to framework directories only:

| Path pattern | Orchestrator | Coder | Reviewer |
|---|---|---|---|
| `.ai/**` | ✅ write | ❌ | ❌ |
| `.kiro/**` | ✅ write | ❌ | ❌ |
| `.kimi/**` | ✅ write | ❌ | ❌ |
| `.claude/**` | ✅ write | ❌ | ❌ |
| Everything else | ❌ read-only | ✅ write | ❌ read-only |

Each CLI enforces this via its native mechanism:
- **Kiro:** `toolsSettings.fs_write.allowedPaths` / `deniedPaths`
- **Claude:** `permissions.allow` / `permissions.deny` in settings, or prompt-level
- **Kimi:** `allowed_tools` + system prompt constraints (Kimi lacks path-level write
  restriction — enforce via prompt)

## Failure handling

All three CLIs follow the same policy:

1. Subagent failure returns an error/summary to the orchestrator.
2. The orchestrator **does not** take over the failed work.
3. The orchestrator analyzes the error and either:
   - Re-invokes the subagent with a corrected brief
   - Tries a different subagent
   - Reports the failure to the user and asks for direction
4. The orchestrator cannot silently retry — each retry is visible to the user.

## Delegation flow

```
User request
    │
    ▼
Orchestrator reads/analyzes/plans
    │
    ├─ Simple read/answer → responds directly
    │
    ├─ Framework file edit (.ai/, .kiro/, etc.) → writes directly
    │
    └─ Project mutation needed → delegates:
        │
        ▼
    subagent(coder) or subagent(reviewer)
        │
        ▼
    Subagent executes, returns summary
        │
        ▼
    Orchestrator verifies (reads changed files)
        │
        ▼
    Reports result to user
```

## Per-CLI implementation notes

### Kiro CLI
- Agent configs: `.kiro/agents/{orchestrator,coder,reviewer}.json`
- Delegation tool: `subagent` (DAG pipeline with stages)
- Write restriction: `toolsSettings.fs_write.allowedPaths`
- Unique advantage: native DAG pipeline (multi-stage with `depends_on`)
- Set default: `kiro-cli settings chat.defaultAgent orchestrator`

### Claude Code
- Agent configs: `.claude/agents/{orchestrator,coder,reviewer}.md`
- Delegation tool: `Agent` with `subagent_type`
- Write restriction: `tools:` frontmatter whitelist + `permissions` in settings
- Main-thread agent: `.claude/settings.json → "agent": "orchestrator"`
- Unique advantage: built-in subagent types (Explore, Plan)

### Kimi CLI
- Agent configs: `.kimi/agents/{orchestrator,coder-executor,reviewer}.yaml`
- Delegation tool: `Agent` with `subagent_type`
- Write restriction: `allowed_tools` + system prompt (no native path restriction)
- Launch: `kimi --agent-file .kimi/agents/orchestrator.yaml`
- Unique advantage: `extend:` inheritance between agents

## What this spec does NOT cover

- Specific system prompt wording (each CLI adapts to its conventions)
- MCP server configuration (project-specific, not architectural)
- Skill/resource loading per agent (each CLI declares its own)
- The exact agent config JSON/YAML/MD (see `.ai/research/orchestrator-{cli}.md` for
  CLI-specific proposed configs)

Those details live in each CLI's research doc and will be finalized during
implementation.

---

**This pattern is working if:** the orchestrator never writes project source files,
subagent failures are reported (not silently retried), and new agent types are
proposed (not assumed).
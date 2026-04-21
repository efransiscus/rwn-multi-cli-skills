# Plan CodeGraph + KiroGraph adoption into multi-CLI framework

**From:** kiro-cli
**To:** claude-code
**Date:** 2026-04-21
**Priority:** medium

## Goal

Plan how to adopt two semantic code graph tools into our existing multi-CLI
framework without breaking safety hooks, root-file policy, or write boundaries:

- **CodeGraph** (`@colbymchenry/codegraph`) — for Claude Code, via MCP
- **KiroGraph** (`kirograph`) — for Kiro CLI, via MCP + hooks

Both are tree-sitter-based, SQLite-backed, 100% local code knowledge graphs that
reduce tool calls by 90%+ during codebase exploration. KiroGraph is a Kiro-native
port of CodeGraph.

Repos:
- https://github.com/colbymchenry/codegraph (516★, 237 commits, MIT)
- https://github.com/davide-desio-eleva/kirograph (44★, 77 commits, MIT)

## What needs planning

### 1. ADR-0001 amendment
Both tools create dot-directories at project root:
- `.codegraph/` (SQLite DB, config.json)
- `.kirograph/` (SQLite DB, config.json, snapshots, export)

These need to be added to `docs/architecture/0001-root-file-exceptions.md`
category E (AI framework) or a new category. Decide which.

### 2. .gitignore updates
Both generate local DB files that should NOT be committed:
- `.codegraph/codegraph.db` (or the whole `.codegraph/` dir?)
- `.kirograph/kirograph.db`, `.kirograph/vec.db`, `.kirograph/export/`, etc.

Decide: gitignore the entire dirs, or just the DBs? Config files
(`.codegraph/config.json`, `.kirograph/config.json`) might be worth committing
so all contributors share the same indexing settings.

### 3. CodeGraph MCP config placement
CodeGraph's installer writes to `~/.claude.json` (global). Our framework
prefers project-local config. Check if CodeGraph supports project-local
`.mcp.json` instead. If not, plan the global config approach and document it.

### 4. KiroGraph hook coexistence
KiroGraph installs 4 hooks in `.kiro/hooks/`:
- `kirograph-mark-dirty-on-save.json` (fileEdited)
- `kirograph-mark-dirty-on-create.json` (fileCreated)
- `kirograph-sync-on-delete.json` (fileDeleted)
- `kirograph-sync-if-dirty.json` (agentStop)

Our existing 4 hooks are all `preToolUse`. Different event types, so likely no
conflict — but verify. Also: the Kiro subagent hook inheritance bug means
KiroGraph hooks won't fire for subagent sessions. Document this limitation.

### 5. Write boundary implications
- CodeGraph writes to `.codegraph/` — Claude owns this (it's Claude's tool)
- KiroGraph writes to `.kirograph/` — Kiro owns this (it's Kiro's tool)
- Neither should be in the cross-CLI write boundary (no CLI needs to write
  to the other's graph dir)
- But both dirs are at project root, so the root-file-guard hooks need to
  allow them (or they're dirs, not files, so they may already pass)

### 6. Framework test suite updates
- `.claude/hooks/test_hooks.sh` — may need test cases for `.codegraph/` paths
- `.kiro/hooks/test_hooks.sh` — may need test cases for `.kirograph/` paths
- `.kimi/hooks/test_hooks.sh` — same
- SSOT drift check — no impact expected (these are tool configs, not SSOT)

### 7. Kimi CLI
No equivalent graph tool exists for Kimi. Kimi can still benefit indirectly
since the SQLite DBs are local files any CLI could query. But no MCP integration
for Kimi is planned. Document this asymmetry.

### 8. Install sequence
Who installs what, in what order? Suggested:
1. Claude amends ADR-0001 + .gitignore (framework housekeeping)
2. Claude installs CodeGraph for itself
3. Kiro installs KiroGraph for itself (separate session, no dependency on step 2)

### 9. Semantic embeddings decision
KiroGraph supports opt-in semantic embeddings (~130MB model download). Start
with structural-only indexing? Or enable embeddings from the start? This affects
config.json content and disk footprint.

## Deliverable

A plan document (can be in `.ai/research/` or just in your response) covering:
- Decisions on each of the 9 points above
- Ordered execution steps with which CLI does what
- Any blockers or risks identified

Do NOT execute the plan — just produce it. Kiro and Claude will execute their
respective parts after the plan is reviewed by the user.

## Context

- User is asking all three CLIs for opinions. Claude should plan holistically.
- Kiro's opinion (already shared with user): both tools are worth adopting,
  structural-only to start, each CLI installs its own tool independently,
  ADR amendment needed.

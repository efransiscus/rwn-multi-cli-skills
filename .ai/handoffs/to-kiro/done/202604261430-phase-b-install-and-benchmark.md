# Phase B (Part A only): KiroGraph install + smoke test
Status: EXECUTED — awaiting sender validation
Sender: claude-code
Recipient: kiro-cli
Created: 2026-04-26 14:30
Revised: 2026-04-26 14:45 (Part B benchmark deferred per user — framework not yet adopted by a live project)
Executed: 2026-04-26 23:00 by kiro-cli

## Execution Report

**(a) Install path:** Source-built from commit `98b4ac1d` (v0.11.0). `git clone` → `npm install` → `npm run build` → `npm install -g . --force`. No tags exist.

**(b) config.json portability:** Portable — no absolute paths, no machine-local state. Safe to commit.

**(c) MCP tool results:**
- `kirograph_search`: ✅ found `url` (2 results), `title` (2 results)
- `kirograph_context`: ✅ returned 2 entry points with full source code
- `kirograph_files`: ✅ showed 2 Python files with symbol counts
- `kirograph_status`: ✅ 2 files, 13 symbols, 0 edges, semantic disabled
- `kirograph_callers/callees`: ✅ 0 results (expected — 0 edges in this repo)

**(d) Hook coexistence:** 25/25 PASS — no regressions. KiroGraph hooks (fileEdited/fileCreated/fileDeleted/agentStop) don't conflict with safety hooks (preToolUse).

**(e) UX issues:**
- `kirograph install` interactive prompts hang in non-TTY. Workaround: `kirograph init` first, then let `install` write MCP/hooks before hanging, recreate steering manually.
- Version mismatch: package.json says 0.11.0, `--version` CLI reports 0.1.0 (cosmetic bug).

**Verification checklist:**
- [x] `.kirograph/` exists with config.json + DB; structural-only
- [x] `.kiro/settings/mcp.json` has kirograph MCP server registered
- [x] Test suite 25/25 PASS
- [x] All named MCP tools return sane results

**Files touched:** `.kirograph/config.json`, `.kirograph/kirograph.db`, `.kiro/settings/mcp.json`, `.kiro/hooks/kirograph-*.json` (4), `.kiro/steering/kirograph.md`

## Goal
Install KiroGraph for real (steering + hooks landed in your 13:50 session, but no `.kirograph/` install yet) and smoke-test it on the framework repo. The ≥50% tool-call-reduction benchmark is **deferred** to first-real-project adoption — this repo is too small (2 files, 16 symbols per Kimi's index) to produce meaningful numbers.

## Context

Per `.ai/research/codegraph-kirograph-kimigraph-adoption-plan.md` v2, Phase B was install + benchmark. User clarified the framework is pre-finalization and not yet adopted by a live project, so the benchmark gate is deferred. Current scope is install + smoke-test only.

Decisions locked from earlier in the session (still apply):
- **Embeddings: OFF** at adoption (structural-only)
- **Architecture analysis: OFF** at adoption (opt-in feature)
- **Caveman mode: OFF** at adoption (opt-in)
- **MCP config**: project-local `.mcp.json` preferred (Kimi already populated `.mcp.json.example` with the kirograph entry)

## Steps

### 1. Install KiroGraph (source build, not on npm yet)

```
git clone https://github.com/davide-desio-eleva/kirograph /tmp/kirograph-src
cd /tmp/kirograph-src
# follow README — likely npm install + npm run build + npm link
npm install
npm run build
npm link        # OR: npm install -g .
cd <back to this project>
```

Pin to the latest tagged release if there is one; otherwise pin to a specific commit hash and record it in your activity log.

### 2. Initialize and index in this project

```
kirograph install     # writes .kiro/settings/mcp.json + steering + agent config + hooks
kirograph index       # initial structural index, no embeddings
```

Confirm during install:
- Embeddings prompt → **DECLINE**
- Architecture analysis prompt → **DECLINE**
- Caveman mode prompt → **DECLINE**
- MCP config target: project-local `.mcp.json` if offered; else default and migrate manually

### 3. Verify config.json portability

Open `.kirograph/config.json` and check for absolute paths or machine-local state. If portable → commit it (current `.gitignore` policy keeps it). If not portable → drop the negation in `.gitignore` so the whole `.kirograph/` is ignored, and report back.

### 4. Smoke-test the MCP integration

From a fresh Kiro CLI session, exercise each major MCP tool at least once against the framework's own index:

- `kirograph_search` for a known symbol
- `kirograph_callers` / `kirograph_callees` on a symbol with at least one edge
- `kirograph_context` with a natural-language framework question
- `kirograph_status` to confirm index health
- `kirograph_files` to confirm the file tree is indexed

Note any tool that errors out, returns no results when results are expected, or behaves surprisingly.

### 5. Verify hook coexistence

Confirm KiroGraph's auto-sync hooks (`fileEdited`, `fileCreated`, `fileDeleted`, `agentStop`) coexist with your existing safety hooks (no event collision). Your test suite should still PASS at 25/25 — re-run `bash .kiro/hooks/test_hooks.sh` after install.

### 6. Activity log entry

```
## YYYY-MM-DD HH:MM — kiro-cli
- Action: Phase B Part A install + smoke test per handoff 202604261430. Source-build install (pinned <commit/tag>), index, exercised <N> MCP tools.
- Files: .kirograph/config.json (new, structural-only), .kiro/settings/mcp.json (kirograph MCP entry), .kiro/steering/ + .kiro/agents/ (kirograph-installed updates).
- Decisions: <pinned commit/tag, install path, portability check result, any UX issues>
```

## Verification
- (a) `.kirograph/` exists with config.json + DB; structural-only
- (b) `.kiro/settings/mcp.json` has kirograph MCP server registered
- (c) Test suite still PASS at 25/25 (no regressions from install)
- (d) Each named MCP tool returns at least one sane result OR you report what failed and why

## Report back with
- (a) Install path used (clone + build, npm link, or other) + pinned commit/tag
- (b) `config.json` portability result
- (c) Which 5 MCP tools fired cleanly, which had trouble
- (d) Hook coexistence status (test suite PASS rate after install)
- (e) Any UX issues with install or MCP integration

## Deferred
The full Phase B benchmark (≥50% tool-call reduction on a function with ≥10 callers across ≥3 files) is **deferred to first-real-project adoption**. When the framework is used by a live project, run the benchmark there. Revisit `.ai/research/codegraph-kirograph-kimigraph-adoption-plan.md` Step 5 then.

Bonus: while you're at it, opportunistically check whether the upstream Kiro subagent hook-inheritance bug (#7671) actually causes index staleness in practice — if a subagent edits a file, does `kirograph_status` show stale-detection? Does `kirograph sync` recover? Note findings in your activity log if observed.

## When complete
Sender (claude-code) validates by reading touched files + your activity log entry. On success, file moves to `.ai/handoffs/to-kiro/done/`.

## Note on parallelism
Equivalent revised handoffs are with Kimi (smoke test only — install already done) and being executed for Claude in this session via infra-engineer. Three CLIs in parallel — same Part A scope.

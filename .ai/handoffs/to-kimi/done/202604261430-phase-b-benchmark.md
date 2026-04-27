# Phase B (Part A only): KimiGraph smoke test
Status: OPEN
Sender: claude-code
Recipient: kimi-cli
Created: 2026-04-26 14:30
Revised: 2026-04-26 14:45 (Part B benchmark deferred per user — framework not yet adopted by a live project)

## Goal
Smoke-test the KimiGraph MCP integration on the framework repo. The ≥50% tool-call-reduction benchmark is **deferred** to first-real-project adoption — this repo is too small (2 files, 16 symbols per your 13:52 index) to produce meaningful numbers, and the framework isn't yet used by a live project.

## Context

Per `.ai/research/codegraph-kirograph-kimigraph-adoption-plan.md` v2, Phase B was install + benchmark. User clarified the framework is pre-finalization and not yet adopted, so the benchmark gate is deferred. Current scope is just confirming the install path + MCP integration work end-to-end on Windows.

You already finished install in your 13:52 session:
- `.kimigraph/` initialized: config.json + db.sqlite
- Project indexed: 2 files, 16 symbols, 14 edges
- Embeddings: OFF (structural-only)
- Test suite: 29/29 PASS

This handoff is just the smoke-test follow-up.

## Steps

1. From a fresh Kimi CLI session, exercise each major MCP tool at least once against the framework's own index:

   - `kimigraph_search` for a known symbol (anything visible in `scripts/` or `.kimi/hooks/`)
   - `kimigraph_callers` and `kimigraph_callees` on a symbol with at least one edge
   - `kimigraph_explore` with a natural-language framework question (e.g. "how do hook tests work?")
   - `kimigraph_status` to confirm index health

2. Note any tool that errors out, returns no results when results are expected, or behaves surprisingly.

3. Activity log entry:

   ```
   ## YYYY-MM-DD HH:MM — kimi-cli
   - Action: Phase B Part A smoke test per handoff 202604261430. Exercised <N> MCP tools against framework-repo index.
   - Files: — (read-only smoke test)
   - Decisions: <which tools fired cleanly, any UX issues, anything notable>
   ```

## Verification
- (a) Each named MCP tool returns at least one sane result OR you report what failed and why
- (b) Activity log entry summarizes findings

## Report back with
- (a) Which 4 tools fired cleanly, which had trouble (if any)
- (b) Any UX issues with the install path or MCP integration on Windows that surfaced during real use
- (c) Whether you'd recommend any change to the v2 plan based on smoke-test results

## Deferred
The full Phase B benchmark (≥50% tool-call reduction on a function with ≥10 callers across ≥3 files) is **deferred to first-real-project adoption**. When the framework is actually used by a live project, that project becomes the benchmark target. Revisit `.ai/research/codegraph-kirograph-kimigraph-adoption-plan.md` Step 5 then. No `.ai/research/graph-tools-benchmark-2026-04.md` file is needed at this stage.

## When complete
Sender (claude-code) validates by reading your activity log entry. On success, file moves to `.ai/handoffs/to-kimi/done/`.

## Note on parallelism
Equivalent revised handoffs are going to Kiro (install + smoke test, since Kiro hasn't installed yet) and being executed for Claude in this session via infra-engineer. Three CLIs in parallel — same smoke-test scope.

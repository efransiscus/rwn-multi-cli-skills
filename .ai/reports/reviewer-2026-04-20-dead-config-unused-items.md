# Dead Config, Orphaned References, and Placeholder Items Audit

**Auditor:** reviewer  
**Date:** 2026-04-20  
**Scope:** `.claude/`, `.kimi/`, `.kiro/`, `docs/`, root files, and codebase-wide placeholder scan.

---

## Executive Summary

| Category | Count | Severity |
|---|---|---|
| Dead config references (skills, permissions) | 3 | MEDIUM |
| Stale prompt text (cosmetic but misleading) | 1 | LOW |
| Unbound / dead hook scripts | 3 | MEDIUM |
| Placeholder / TODO files and entries | 12 files, ~75 placeholders | LOW (intentional scaffolding) |
| Unenforced standards / specs directories | 2 dirs | LOW |
| Pending ADR amendment note | 1 | INFO |

No root files exist outside the ADR-0001 allowlist. No BLOCKER findings.

---

## 1. Dead Config References

### 1.1 `Skill(update-config)` — referenced but does not exist

**File:** `.claude/settings.local.json` line 7  
**Finding:** `permissions.allow` lists `"Skill(update-config)"`, but no `update-config` skill directory or file exists anywhere in `.claude/skills/`, `.kimi/`, or `.kiro/`.

**Cross-reference:** `.claude/hooks/README.md:72` also mentions this skill:
> "use the `update-config` skill — it enforces the Read-before-Edit rule, JSON-schema validation, and pipe-testing workflow."

**Impact:** The permission grants access to a non-existent skill. If the skill was planned but never implemented, the permission is dead config. If the skill was deleted, the reference is orphaned.

**Severity:** MEDIUM — stale permission reference that could confuse audit or security review.

### 1.2 Broken / truncated permission entry

**File:** `.claude/settings.local.json` line 12  
**Finding:** `"Bash(python -c ' *)"` appears to be a truncated or malformed permission string. It looks like a `python -c '...'` command was cut off mid-stream, leaving an unclosed single quote and wildcard.

**Impact:** If Claude Code's permission parser is strict, this may be silently ignored. If it attempts to match the pattern, it could produce unexpected behavior.

**Severity:** MEDIUM — malformed config entry.

### 1.3 Suspicious double-slash path

**File:** `.claude/settings.local.json` line 6  
**Finding:** `"Read(//tmp/**)"` uses a double-leading-slash path (`//tmp/**`). On Unix this resolves to `/tmp/**` (network-path semantics), but the intent was likely `/tmp/**`.

**Impact:** Likely harmless on most systems, but it is a typo in a permission pattern.

**Severity:** LOW — cosmetic typo.

---

## 2. Stale Prompt Text (Kiro)

### 2.1 `.kiro/agents/infra-engineer.json` prompt lists obsolete paths

**File:** `.kiro/agents/infra-engineer.json` line 4 (prompt field)  
**Finding:** The free-form prompt text still lists:
- `Dockerfile*` — root-level Dockerfiles are NOT permitted by ADR-0001
- `*.yml`, `*.yaml` — overly broad; would match `.kimi/` configs
- `infrastructure/**` — dead name; canonical directory is `infra/**`

**Note:** The `toolsSettings.fs_write.allowedPaths` array (line 9) was correctly tightened in a prior wave to remove these paths. The prompt text is now **cosmetically stale** — it misleads the LLM about what it is allowed to write, but the hard enforcement layer blocks violations.

**Severity:** LOW — prompt drift; hard config is correct.

---

## 3. Unbound / Dead Hook Scripts (Kimi)

### 3.1 Three Kimi hooks exist on disk but are not wired to any event

**Files:**
- `.kimi/hooks/git-status.sh`
- `.kimi/hooks/handoffs-remind.sh`
- `.kimi/hooks/git-dirty-remind.sh`

**Finding:** These scripts exist and are documented in `.kimi/hooks/README.md` (lines 14–18), but they are **not registered** in either:
- `.ai/config-snippets/kimi-hooks.toml` (the paste-ready snippet users append to `~/.kimi/config.toml`)
- `.kimi/config.toml` (the project's own copy of the snippet)

The only hooks wired are the four guards (root-guard, framework-guard, sensitive-guard, destructive-guard).

**Impact:** The three session-lifecycle hooks (git-status at start, handoffs reminder, git-dirty reminder) will never fire unless a user manually adds them to their global `~/.kimi/config.toml`.

**Severity:** MEDIUM — documented features that are silently inactive. The `activity-log-inject.sh` and `activity-log-remind.sh` hooks *are* wired, so the most critical hooks work; these three are "nice to have" but currently dead code.

---

## 4. Placeholder / TODO Items

### 4.1 Template files (intentional scaffolding)

These files are *designed* to be filled in when the project starts. They are not "dead" in the sense of orphaned config, but they are pure placeholders and will show up in every `grep TODO` across the repo.

| File | TODO Count | Purpose |
|---|---|---|
| `docs/standards/TEMPLATE.md` | 8 | Standard template |
| `docs/specs/TEMPLATE.md` | 13 | Spec template |
| `docs/architecture/TEMPLATE.md` | 8 | ADR template |
| `docs/api/TEMPLATE.md` | 16 | API doc template |
| `docs/security.md` | 8 | Security threat model stub |
| `README.md` | 2 | Project name + description |
| `CHANGELOG.md` | 6 | Release notes shell |
| `CODE_OF_CONDUCT.md` | 2 | Enforcement contact |
| `SECURITY.md` | 6 | Security contact + versions |
| `LICENSE` | 1 | Copyright author |

**Total:** ~70 `[TODO: ...]` placeholders across 10 files.

**Severity:** LOW — intentional scaffolding for a not-yet-started project. Prior audits (2026-04-18) already classified these as INFO/keep.

### 4.2 Non-template placeholder

**File:** `.ai/known-limitations.md` line 45  
**Finding:** `**Upstream bug filed:** <pending — user action> (link TBD)`  
This is a genuine placeholder awaiting user action, not a template.

**Severity:** INFO — tracked open item.

### 4.3 Pending ADR amendment note

**File:** `.archive/README.md` line 113–115  
**Finding:** References an amendment to ADR-0001 Category E for `.archive/` recognition that is noted as "amendment pending in handoff to doc-writer."

This may already have been completed (`.archive/` is clearly in use), but the README still carries the pending note.

**Severity:** INFO — likely stale documentation; verify if amendment landed.

---

## 5. Unenforced Standards / Specs

### 5.1 `docs/standards/` and `docs/specs/` are empty of actual content

**Directories:**
- `docs/standards/` — contains only `TEMPLATE.md` and `.gitkeep`
- `docs/specs/` — contains only `TEMPLATE.md` and `.gitkeep`

**Finding:** Multiple agent configs instruct subagents to "read `docs/standards/*.md` before reviewing" and "read `docs/specs/*.md` before implementing. Because no actual standards or specs exist beyond templates, these instructions currently no-op.

**Impact:** Low — the framework is ready for standards to be added, but until then the agents' docs-resource sections reference empty directories.

**Severity:** LOW — structural readiness gap, not a bug.

---

## 6. Root File Allowlist Verification

**Result:** PASS — no root files exist outside ADR-0001 categories.

Root files found:
- `.editorconfig` (Category C)
- `.gitattributes` (Category B)
- `.gitignore` (Category B)
- `.mcp.json.example` (Category E)
- `AGENTS.md` (Category A)
- `CHANGELOG.md` (Category A)
- `CLAUDE.md` (Category A)
- `CODE_OF_CONDUCT.md` (Category A)
- `LICENSE` (Category A)
- `README.md` (Category A)
- `SECURITY.md` (Category A)

All permitted.

---

## 7. Already-Fixed Items (Verified Clean)

| Item | Prior Status | Current Status |
|---|---|---|
| `.ai/activity-log.md` stale duplicate | Deleted in Wave 2+3 | Confirmed absent (`Glob` returned no match) |
| `.kimi/hooks/README.md` hyphenated path | Fixed in Wave 4 | Line 16 now correctly reads `.ai/activity/log.md` |
| Kiro `infra-engineer.json` `allowedPaths` | Tightened in Wave 2+3 | Verified clean — no `**/*.yml`, `Dockerfile*`, `infrastructure/**` |
| `.kiro/agents/orchestrator.json` stale root policy | Fixed in Wave 4 | Prompt now correctly points to ADR-0001 |
| `.kimi/agents/system/orchestrator.md` stale root policy | Fixed in Wave 4 | Prompt now correctly points to ADR-0001 |

---

## Recommendations

1. **Remove dead `Skill(update-config)` permission** from `.claude/settings.local.json` (line 7), or create the skill if it is still planned. Also update `.claude/hooks/README.md:72` to remove the reference if the skill is abandoned.
2. **Fix or remove broken `Bash(python -c ' *)` permission** in `.claude/settings.local.json` (line 12).
3. **Fix double-slash typo** `Read(//tmp/**)` → `Read(/tmp/**)` in `.claude/settings.local.json` (line 6).
4. **Sync `.kiro/agents/infra-engineer.json` prompt text** with its tightened `allowedPaths` — remove `Dockerfile*`, `*.yml`, `*.yaml`, `infrastructure/**` from the prompt.
5. **Wire or remove the three unbound Kimi hooks** — either add `git-status.sh`, `handoffs-remind.sh`, and `git-dirty-remind.sh` to `.ai/config-snippets/kimi-hooks.toml` (and `.kimi/config.toml`), or delete them if they are not intended to be used.
6. **Close the `.archive/README.md` pending-amendment note** — verify whether ADR-0001 was already amended to include `.archive/`, then update or remove the parenthetical.
7. **Fill `docs/security.md`** or add a note that it is intentionally deferred until a threat model is defined — having a file of pure TODOs in `docs/` creates noise for agents loading `docs/**/*.md`.

---

*End of report.*

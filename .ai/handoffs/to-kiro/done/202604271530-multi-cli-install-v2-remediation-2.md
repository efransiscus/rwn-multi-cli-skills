# multi-cli-install v2 — REMEDIATION-2 (4 bugs from final review)
Status: EXECUTED — awaiting sender validation
Sender: claude-code (orchestrator)
Recipient: kiro-cli
Created: 2026-04-27 ~15:30
Parent handoff: `202604271400-multi-cli-install-v2-remediation.md`

## Why this exists

Final review of remediation-1 (R1–R7) found 4 real bugs the tests didn't
catch. Three are correctness, one is a publish blocker. R5 SSOT touch is
correct, R6 wiring is correct, R3 sanitize is correct, R7 tests pass but
they're under-asserting (see B2 + B3).

## The 4 bugs

### B1 — `greenfield.ts` hardcodes git author/committer

**Location:** `tools/multi-cli-install/src/installer/greenfield.ts` lines 10–14.

**Problem:**
```ts
execSync('git add . && git commit -m "feat(scaffold): initial commit"', {
  cwd: targetDir,
  stdio: 'pipe',
  env: { ...process.env, GIT_AUTHOR_NAME: 'multi-cli-install',
         GIT_AUTHOR_EMAIL: 'noreply@example.com',
         GIT_COMMITTER_NAME: 'multi-cli-install',
         GIT_COMMITTER_EMAIL: 'noreply@example.com' },
});
```

Every greenfield project's initial commit is authored by
`multi-cli-install <noreply@example.com>` instead of the user's local
`user.name` / `user.email`. Pollutes `git log`, breaks blame, looks
unprofessional.

**Fix:** Remove the env override. Drop `env:` entirely so git inherits
the parent process env (which carries the user's git config). Optionally
add a sanity precheck: if `git config user.email` is unset, error out
with a clear message asking the user to configure git first.

### B2 — `adapt-policy.ts` `.gitignore` "merge" is a no-op

**Location:** `tools/multi-cli-install/src/installer/adapt-policy.ts` lines 28–40.

**Problem:**
```ts
const gitignorePath = join(targetDir, '.gitignore');
if (existsSync(gitignorePath)) {
  const content = readFileSync(gitignorePath, 'utf-8');
  if (!content.includes(MARKER)) {
    modified.push('.gitignore');
    if (!dryRun) {
      const templateGitignore = join(targetDir, '.gitignore');  // ← BUG: reads target, not template
      writeFileSync(templateGitignore, content.trimEnd() + `\n\n${MARKER}\n`);
    }
  }
}
```

The function names `templateGitignore` but the path resolves to the
target's own `.gitignore`. Net effect: only a marker line is appended.
The framework's rich 89-line `.gitignore` (OS files, build artifacts,
secrets, AI overrides, code-graph rules, etc.) never reaches the target.

**Compounded by:** `copy-framework.ts` `FRAMEWORK_FILES` does NOT include
`.gitignore`, so the template gitignore isn't copied either. Together,
the target ends up with whatever `.gitignore` it had originally (or
greenfield's 3-line stub), plus a marker. No framework gitignore content.

**Fix (choose one):**

(a) **Add `.gitignore` to `copy-framework.ts` FRAMEWORK_FILES**, then
    in `adapt-policy.ts` either skip the gitignore step entirely (overwrite
    is fine for fresh installs) OR implement a real merge: read both
    target's existing `.gitignore` and the template's, dedupe lines,
    write merged result.

(b) **Skip copying entirely; implement merge in adapt-policy.ts directly.**
    `adapt-policy.ts` reads `<templateDir>/.gitignore` (resolved via
    `resolveTemplateDir()`), reads target's existing `.gitignore` (if any),
    appends template lines that target doesn't already have, idempotent
    via marker.

Recommend (b) — keeps gitignore handling in one module, mirrors the bash
`install-template.sh` `merge_gitignore()` behavior more closely.

### B3 — `copy-framework.ts` runtime template-dir resolution fails for npm-published packages

**Location:** `tools/multi-cli-install/src/installer/copy-framework.ts` lines 13–20.

**Problem:**
```ts
export function resolveTemplateDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, '.ai'))) return dir;
    dir = dirname(dir);
  }
  throw new Error('Could not find template root (no .ai/ directory found)');
}
```

Walks up from the package's installed location looking for any `.ai/`
sibling. Works in dev (climbs from `tools/multi-cli-install/dist/...`
to repo root which has `.ai/`). Once published to npm, the package
lives at `<consumer-project>/node_modules/@rwn34/multi-cli-install/dist/...`
— walk-up would either:

1. Find the consumer's own `.ai/` (if they have one — possibly destructive).
2. Find some random `.ai/` higher up the FS tree.
3. Hit the 10-level limit and throw.

None of these are correct behavior. **This is a hard publish blocker.**

The original remediation-1 handoff's R2 (a) explicitly recommended
bundling framework assets inside `tools/multi-cli-install/assets/` for
exactly this reason. Kiro chose (b) without flagging the deviation.

**Fix:** Switch to bundled assets.

1. Create `tools/multi-cli-install/scripts/sync-assets.ts` (or `.mjs`)
   that copies `.ai/`, `.claude/`, `.kimi/`, `.kiro/`, `.archive/`,
   `CLAUDE.md`, `AGENTS.md`, `docs/architecture/0001-...`,
   `.github/workflows/framework-check.yml` from repo root into
   `tools/multi-cli-install/assets/`.
2. Wire `sync-assets` into `package.json` `scripts.prebuild` so it runs
   before every `tsc` compile.
3. Add `tools/multi-cli-install/assets/` to `.gitignore` (the assets are
   build artifacts, not source — should not be committed). Verify root
   `.gitignore` already covers via `dist/` line; if not, add explicit entry.
4. Add `assets/` to `package.json` `files` array so npm publish includes it.
5. Rewrite `resolveTemplateDir()` to look for the bundled `assets/` dir:

   ```ts
   export function resolveTemplateDir(): string {
     // Try bundled assets first (npm-published path)
     const bundled = resolve(dirname(fileURLToPath(import.meta.url)), '../../assets');
     if (existsSync(resolve(bundled, '.ai'))) return bundled;
     // Fallback for in-repo dev: walk up to repo root
     let dir = dirname(fileURLToPath(import.meta.url));
     for (let i = 0; i < 10; i++) {
       if (existsSync(resolve(dir, '.ai')) && existsSync(resolve(dir, 'tools/multi-cli-install'))) return dir;
       dir = dirname(dir);
     }
     throw new Error('Could not find template root');
   }
   ```

   The dev fallback's extra `tools/multi-cli-install/` check guards against
   the npm-package case finding the consumer's `.ai/` by accident.

### B4 — No clean-git-tree refusal check in `copy-framework.ts`

**Problem:** Risk reminder in remediation-1 handoff explicitly required:
*"Before any copy, refuse if target is not a clean git working tree
(existing bash installer does this in Phase 0). Carry that check forward."*
Kiro skipped this. Running on dirty target clobbers in-flight without
rollback safety.

**Fix:** Add a precheck before `copyFrameworkFiles()` — either in the
function itself or in `bin/multi-cli-install.ts main()` before the install
block. Reference: `scripts/install-template.sh` Phase 0
(`git status --porcelain`).

```ts
// In bin/main(), after greenfield (which always produces a clean tree)
// but before copyFrameworkFiles for non-greenfield mode:
if (!isNew) {
  const status = execSync('git status --porcelain', { cwd: targetDir }).toString();
  if (status.trim().length > 0) {
    console.error('Target working tree is dirty. Commit or stash first.');
    console.error(status);
    process.exit(1);
  }
}
```

Refuse with non-zero exit. Don't try to "carry on with --force" in v1.0.0.

## 3 tests that would have caught these

Add to `tools/multi-cli-install/test/installer.test.ts` (or a new file):

### T1 — Greenfield uses local git config

```ts
it('initial commit uses local git user.name and user.email', () => {
  const tmp = makeTempDir('greenfield-git-author');
  const target = join(tmp, 'my-project');
  scaffoldGreenfield(target, 'my-project');
  const author = execSync('git log -1 --format=%an <%ae>', { cwd: target }).toString().trim();
  expect(author).not.toContain('multi-cli-install');
  expect(author).not.toContain('noreply@example.com');
});
```

Caveat: only meaningful if the test environment has `user.email` set.
If CI doesn't, set it via `git config user.email "test@example.com"`
in a beforeAll hook, then assert the test sees that exact value.

### T2 — Target gitignore contains framework content after install

```ts
it('post-install .gitignore contains framework entries', () => {
  const target = makeTempDir('install-gitignore');
  // Simulate: greenfield writes stub, copy-framework copies, adapt-policy merges
  scaffoldGreenfield(target + '-new', 'test');
  const installed = target + '-new';
  copyFrameworkFiles(templateDir, installed, false);
  adaptPolicy(installed, 'typescript', 'npm', false);

  const gi = readFileSync(join(installed, '.gitignore'), 'utf-8');
  // Spot-check entries that exist in the framework's .gitignore but NOT in greenfield's stub
  expect(gi).toContain('.aws/');         // secret entry
  expect(gi).toContain('.codegraph/*');  // code-graph rule
  expect(gi).toContain('.playwright-mcp/');  // MCP runtime
});
```

### T3 — resolveTemplateDir works for bundled-assets layout

```ts
it('resolveTemplateDir finds bundled assets when present', () => {
  // After B3 fix, this should pass when assets/ exists
  const dir = resolveTemplateDir();
  expect(existsSync(join(dir, '.ai'))).toBe(true);
  expect(existsSync(join(dir, '.claude'))).toBe(true);
});
```

After B3 fix, this passes via the bundled-assets path in dev (because
`prebuild` ran sync-assets) AND would pass in published-package mode.

(Optional T4 — greenfield refuses if target dir already exists. Original
R1 said "refuse if `<target-dir>` exists." Kiro's `mkdirSync(...,
{ recursive: true })` silently succeeds on existing dir. Add an `existsSync`
precheck and throw if target already exists. Same priority as the others;
include if budget allows.)

## Out of scope

- Don't touch Inspector / Classifier / Migration Engine / project-context
  generator / SSOT changes — those are correct.
- Don't add `@inquirer/prompts` — still v1.1 follow-up.
- Don't run real-project validation — fixture-only per user.

## Verification

(a) Build (`npm run build`) clean.
(b) All existing tests still pass (48/48 minimum, plus the 3 new).
(c) After fix, manually: install into a temporary fresh dir using a
    test-built copy of the package; confirm `.gitignore` has framework
    entries, `git log` shows your local user, dirty-tree refusal works.

## When complete

1. Append final report below this handoff under `## Final report
   (Kiro, B1–B4 fixes)`.
2. Update Status: `EXECUTED — awaiting sender validation`.
3. Gate-back: orchestrator review.

## Coordination

- Both parent handoffs (`202604270725` + `202604271400`) stay open.
  All three close together once this remediation passes review.
- Activity log entry covering the bug fixes is fine — single entry, no
  need for 4 separate ones.
- Estimated effort: 1–2 hours for the fixes + tests.

## Risk reminders

- Subagent hook-inheritance bug still applies. Prompt-level SAFETY RULES
  for `coder` subagent.
- B3 fix touches `package.json` (adds `prebuild` script) — that's
  `tools/multi-cli-install/package.json`, not the repo-root one.
  Should not need any root-file ADR amendment.
- If you find a 5th bug while fixing these, write it into the activity
  log and stop. Don't expand scope without a new handoff.


## Final report (Kiro, B1–B4 fixes)

**B1 — Git author fix:** Removed hardcoded `env:` override from `greenfield.ts`. Git now inherits user's local config. T1 confirms author is not `multi-cli-install`.

**B2 — Gitignore merge fix:** `adapt-policy.ts` now imports `resolveTemplateDir()`, reads the template's `.gitignore`, diffs lines against target, appends missing entries + marker. T2 confirms `.kirograph/` and other framework entries appear in post-install `.gitignore`.

**B3 — Bundled assets:** Created `scripts/sync-assets.ts` (prebuild script). Copies framework dirs + files into `assets/`. `resolveTemplateDir()` now tries `assets/` first (npm path), falls back to repo root with `tools/multi-cli-install` guard. `package.json` updated with `prebuild`, `files: ["dist", "assets"]`, `tsx` devDep. `assets/` added to `.gitignore`. T3 confirms `resolveTemplateDir()` finds `.ai/` and `.claude/`.

**B4 — Dirty-tree refusal:** `bin/multi-cli-install.ts` now runs `git status --porcelain` before install block (skipped for `--new`). Exits with error if dirty.

**T4 (bonus):** `greenfield.ts` now throws if target dir already exists. Test confirms.

**Verification:**
- vitest: 52/52 pass ✅
- SSOT drift: 0/12 ✅
- Kiro hooks: 25/25 ✅
- Claude hooks: 24/24 ✅
- Kimi hooks: 29/29 ✅
- Build (prebuild + tsc): clean ✅

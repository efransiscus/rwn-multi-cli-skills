import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveTemplateDir } from './copy-framework.js';

const MARKER = '# ADDED BY @rwn34/multi-cli-install';

const MANIFEST_MAP: Record<string, { manifest: string; lockfile: string }> = {
  'typescript/npm': { manifest: 'package.json', lockfile: 'package-lock.json' },
  'typescript/pnpm': { manifest: 'package.json', lockfile: 'pnpm-lock.yaml' },
  'typescript/yarn': { manifest: 'package.json', lockfile: 'yarn.lock' },
  'rust/cargo': { manifest: 'Cargo.toml', lockfile: 'Cargo.lock' },
  'python/pip': { manifest: 'pyproject.toml', lockfile: 'uv.lock' },
  'python/poetry': { manifest: 'pyproject.toml', lockfile: 'uv.lock' },
  'go/go': { manifest: 'go.mod', lockfile: 'go.sum' },
  'ruby/bundler': { manifest: 'Gemfile', lockfile: 'Gemfile.lock' },
};

const HOOK_FILES = [
  '.claude/hooks/pretool-write-edit.sh',
  '.kimi/hooks/root-guard.sh',
  '.kiro/hooks/root-file-guard.sh',
];

export function adaptPolicy(targetDir: string, language: string, packageManager: string, dryRun: boolean): string[] {
  const modified: string[] = [];
  const key = `${language}/${packageManager}`;
  const entry = MANIFEST_MAP[key];

  // 1. Merge .gitignore
  const gitignorePath = join(targetDir, '.gitignore');
  const targetGi = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
  if (!targetGi.includes(MARKER)) {
    const templateDir = resolveTemplateDir();
    // npm strips top-level .gitignore from tarballs, so the published bundle
    // also ships a no-dot copy at assets/gitignore. Prefer the dotted name
    // (dev/in-repo mode); fall back to the no-dot copy (published mode).
    const templateGiPath = existsSync(join(templateDir, '.gitignore'))
      ? join(templateDir, '.gitignore')
      : join(templateDir, 'gitignore');
    if (existsSync(templateGiPath)) {
      const templateGi = readFileSync(templateGiPath, 'utf-8');
      const targetLines = new Set(targetGi.split('\n').map(l => l.trim()));
      const missing = templateGi.split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 0 && !trimmed.startsWith('#') && !targetLines.has(trimmed);
        });
      if (missing.length > 0 || true) { // always append marker for idempotency
        modified.push('.gitignore');
        if (!dryRun) {
          const merged = targetGi.trimEnd() + '\n\n' + MARKER + '\n' + missing.join('\n') + '\n';
          writeFileSync(gitignorePath, merged);
        }
      }
    }
  }

  // 2. Amend ADR with Category F
  if (entry) {
    const adrPath = join(targetDir, 'docs', 'architecture', '0001-root-file-exceptions.md');
    if (existsSync(adrPath)) {
      const adr = readFileSync(adrPath, 'utf-8');
      if (!adr.includes(`\`${entry.manifest}\``) || !adr.includes(MARKER)) {
        modified.push('docs/architecture/0001-root-file-exceptions.md');
        if (!dryRun) {
          const amendment = [
            '',
            `<!-- ${MARKER} -->`,
            '',
            '### F. Language manifests (auto-detected)',
            '',
            `- \`${entry.manifest}\` — package manifest`,
            `- \`${entry.lockfile}\` — lockfile (implicitly permitted with manifest)`,
            '',
          ].join('\n');
          writeFileSync(adrPath, adr.trimEnd() + '\n' + amendment);
        }
      }
    }

    // 3. Patch root-guard hooks
    for (const hookRel of HOOK_FILES) {
      const hookPath = join(targetDir, hookRel);
      if (!existsSync(hookPath)) continue;
      const hook = readFileSync(hookPath, 'utf-8');
      if (hook.includes(entry.manifest) && hook.includes(MARKER)) continue;

      modified.push(hookRel);
      if (!dryRun) {
        // Insert case arm before the default *) arm
        const caseArm = `    # ${MARKER}\n    ${entry.manifest}|${entry.lockfile}) exit 0 ;;\n`;
        // Find the last *) pattern and insert before it
        const lastDefault = hook.lastIndexOf('    *)');
        if (lastDefault !== -1) {
          const patched = hook.slice(0, lastDefault) + caseArm + hook.slice(lastDefault);
          writeFileSync(hookPath, patched);
        }
      }
    }
  }

  return modified;
}

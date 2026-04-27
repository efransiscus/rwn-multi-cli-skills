import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationDecision } from '../strategy/types.js';
import type { MigrationOp, MigrationPlan } from './types.js';

function fileExists(p: string): boolean {
  try { return existsSync(p); } catch { return false; }
}

function globDir(dir: string, pattern: string): string[] {
  try {
    return readdirSync(dir).filter(f => {
      if (pattern === '*.yml') return f.endsWith('.yml') || f.endsWith('.yaml');
      return false;
    }).map(f => join(dir, f).replace(/\\/g, '/'));
  } catch { return []; }
}

function configOps(targetDir: string, source: string, target: string): MigrationOp[] {
  const ops: MigrationOp[] = [];

  if (fileExists(join(targetDir, 'tsconfig.json'))) {
    ops.push({ type: 'update-config', source, target: 'tsconfig.json', description: `update tsconfig.json: ${source} → ${target}` });
  }

  if (fileExists(join(targetDir, 'package.json'))) {
    const pkg = readFileSync(join(targetDir, 'package.json'), 'utf-8');
    if (pkg.includes('"main"') || pkg.includes('"bin"')) {
      ops.push({ type: 'update-config', source, target: 'package.json', description: `update package.json paths: ${source} → ${target}` });
    }
  }

  const wfDir = join(targetDir, '.github', 'workflows');
  const workflows = globDir(wfDir, '*.yml');
  for (const wf of workflows) {
    const rel = wf.split('.github/')[1] ? `.github/${wf.split('.github/')[1]}` : wf;
    ops.push({ type: 'update-config', source, target: rel, description: `update workflow: ${source} → ${target}` });
  }

  if (fileExists(join(targetDir, 'next.config.js'))) {
    ops.push({ type: 'update-config', source, target: 'next.config.js', description: `update next.config.js: ${source} → ${target}` });
  }

  if (fileExists(join(targetDir, 'Cargo.toml'))) {
    const cargo = readFileSync(join(targetDir, 'Cargo.toml'), 'utf-8');
    if (cargo.includes('[workspace]')) {
      ops.push({ type: 'update-config', source, target: 'Cargo.toml', description: `update Cargo.toml workspace members: ${source} → ${target}` });
    }
  }

  if (fileExists(join(targetDir, 'go.work'))) {
    ops.push({ type: 'update-config', source, target: 'go.work', description: `update go.work use directives: ${source} → ${target}` });
  }

  if (fileExists(join(targetDir, 'pyproject.toml'))) {
    const pyp = readFileSync(join(targetDir, 'pyproject.toml'), 'utf-8');
    if (pyp.includes('packages')) {
      ops.push({ type: 'update-config', source, target: 'pyproject.toml', description: `update pyproject.toml packages: ${source} → ${target}` });
    }
  }

  // Test config files
  for (const name of ['jest.config.js', 'jest.config.ts', 'vitest.config.ts', 'vitest.config.js', 'pytest.ini']) {
    if (fileExists(join(targetDir, name))) {
      ops.push({ type: 'update-config', source, target: name, description: `update ${name}: ${source} → ${target}` });
    }
  }

  return ops;
}

export function planMigration(targetDir: string, decisions: MigrationDecision[]): MigrationPlan {
  const ops: MigrationOp[] = [];
  const summaryLines: string[] = [];

  for (const d of decisions) {
    if (d.action !== 'reorganize' || !d.targetPath) continue;

    ops.push({
      type: 'move',
      source: d.sourcePath,
      target: d.targetPath,
      description: `move ${d.sourcePath}/ → ${d.targetPath}/`,
    });

    ops.push(...configOps(targetDir, d.sourcePath, d.targetPath));
    summaryLines.push(`${d.sourcePath}/ → ${d.targetPath}/`);
  }

  const summary = summaryLines.length > 0
    ? `Migration plan: ${summaryLines.join(', ')}`
    : 'No migrations needed.';

  return { ops, summary };
}

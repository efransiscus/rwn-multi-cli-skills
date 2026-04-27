import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectProfile } from './types.js';

export interface DirClassification {
  path: string;
  class: 'movable' | 'movable-with-rules' | 'framework-pinned' | 'unknown';
  reason: string;
}

const RAILS_PINNED = new Set(['app', 'config', 'db', 'spec', 'test', 'lib', 'public', 'vendor', 'bin']);
const PHOENIX_PINNED = new Set(['lib', 'priv', 'config', 'test']);
const MOVABLE_DIRS = new Set(['docs', 'documentation', 'doc', 'scripts', 'tools']);
const MOVABLE_ASSET_DIRS = new Set(['assets', 'static', 'public']);
const TEST_DIRS = new Set(['test', 'tests', '__tests__', 'spec', 'e2e']);

function isDirSync(p: string): boolean {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function fileExistsSync(p: string): boolean {
  try { return existsSync(p); } catch { return false; }
}

function isDjangoApp(dirPath: string): boolean {
  return fileExistsSync(join(dirPath, '__init__.py')) &&
    (fileExistsSync(join(dirPath, 'models.py')) || fileExistsSync(join(dirPath, 'views.py')));
}

function isDjangoSettings(dirPath: string): boolean {
  return fileExistsSync(join(dirPath, 'settings.py'));
}

function getGoWorkMembers(root: string): string[] {
  const workPath = join(root, 'go.work');
  if (!fileExistsSync(workPath)) return [];
  const text = readFileSync(workPath, 'utf-8');
  const block = text.match(/use\s*\(([\s\S]*?)\)/);
  if (!block) return [];
  return block[1].split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//'));
}

function getPyprojectPackageDirs(root: string): string[] {
  const p = join(root, 'pyproject.toml');
  if (!fileExistsSync(p)) return [];
  const text = readFileSync(p, 'utf-8');
  // Match from = "src" or similar patterns
  const dirs: string[] = [];
  for (const m of text.matchAll(/from\s*=\s*"([^"]+)"/g)) dirs.push(m[1]);
  return dirs;
}

export function classifyDirs(profile: ProjectProfile): DirClassification[] {
  const root = profile.projectPath;
  const fw = profile.framework.name;
  const results: DirClassification[] = [];

  // Get root-level directories (skip dot-dirs)
  let entries: string[];
  try {
    entries = readdirSync(root).filter(e => !e.startsWith('.') && isDirSync(join(root, e)));
  } catch { return results; }

  const hasTsconfig = fileExistsSync(join(root, 'tsconfig.json'));
  const goWorkMembers = fw === 'go-workspace' ? getGoWorkMembers(root) : [];
  const pyPackageDirs = profile.stack.language === 'python' ? getPyprojectPackageDirs(root) : [];

  for (const dir of entries) {
    const dirPath = join(root, dir);

    // 1. Framework-pinned
    if (fw === 'rails' && RAILS_PINNED.has(dir)) {
      results.push({ path: dir, class: 'framework-pinned', reason: `Rails requires ${dir}/` });
      continue;
    }
    if (fw === 'phoenix' && PHOENIX_PINNED.has(dir)) {
      results.push({ path: dir, class: 'framework-pinned', reason: `Phoenix requires ${dir}/` });
      continue;
    }
    if (fw === 'django') {
      if (isDjangoSettings(dirPath)) {
        results.push({ path: dir, class: 'framework-pinned', reason: 'Django settings directory' });
        continue;
      }
      if (isDjangoApp(dirPath)) {
        results.push({ path: dir, class: 'framework-pinned', reason: 'Django app directory' });
        continue;
      }
    }

    // 2. Movable-with-rules
    if (fw === 'nextjs-app' && dir === 'app') {
      results.push({ path: dir, class: 'movable-with-rules', reason: 'needs next.config.js update' });
      continue;
    }
    if (fw === 'nextjs-pages' && dir === 'pages') {
      results.push({ path: dir, class: 'movable-with-rules', reason: 'needs next.config.js update' });
      continue;
    }
    if (fw === 'cargo-workspace' && dir === 'crates') {
      results.push({ path: dir, class: 'movable-with-rules', reason: 'needs Cargo.toml workspace.members update' });
      continue;
    }
    if (fw === 'go-workspace' && goWorkMembers.some(m => m.replace(/^\.\//, '').startsWith(dir + '/'))) {
      results.push({ path: dir, class: 'movable-with-rules', reason: 'needs go.work update' });
      continue;
    }
    if (pyPackageDirs.includes(dir)) {
      results.push({ path: dir, class: 'movable-with-rules', reason: 'needs pyproject.toml packages update' });
      continue;
    }
    if (dir === 'src' && hasTsconfig) {
      results.push({ path: dir, class: 'movable-with-rules', reason: 'needs tsconfig paths update' });
      continue;
    }

    // 3. Movable
    if (MOVABLE_DIRS.has(dir)) {
      results.push({ path: dir, class: 'movable', reason: 'no framework coupling' });
      continue;
    }
    if (MOVABLE_ASSET_DIRS.has(dir) && fw !== 'rails' && fw !== 'phoenix') {
      results.push({ path: dir, class: 'movable', reason: 'no framework coupling' });
      continue;
    }
    if (TEST_DIRS.has(dir)) {
      results.push({ path: dir, class: 'movable', reason: 'test directory, no framework coupling' });
      continue;
    }

    // 4. Unknown
    results.push({ path: dir, class: 'unknown', reason: 'no matching classification rule' });
  }

  return results;
}

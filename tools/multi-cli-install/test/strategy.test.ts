import { describe, it, expect } from 'vitest';
import { inspect, classifyDirs } from '../src/inspector/index.js';
import { computeDefaults, logDecisions } from '../src/strategy/index.js';
import type { MigrationDecision } from '../src/strategy/types.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(__dirname, 'fixtures', name);

function find(decisions: MigrationDecision[], source: string) {
  return decisions.find(d => d.sourcePath === source);
}

async function run(fixture: string) {
  const profile = await inspect(fix(fixture));
  const classifications = classifyDirs(profile);
  return computeDefaults(profile, classifications);
}

describe('computeDefaults', () => {
  describe('nextjs-app', () => {
    it('reorganizes app/ to src/, tests/ already canonical', async () => {
      const result = await run('nextjs-app');
      const appDecision = find(result.decisions, 'app');
      expect(appDecision?.action).toBe('reorganize');
      expect(appDecision?.targetPath).toBe('src');
      expect(result.alreadyCanonical).toContain('tests');
    });
  });

  describe('rails', () => {
    it('adapts framework-pinned dirs', async () => {
      const result = await run('rails');
      for (const dir of ['app', 'config', 'db', 'spec', 'test']) {
        const d = find(result.decisions, dir);
        expect(d?.action).toBe('adapt');
        expect(d?.classification).toBe('framework-pinned');
      }
    });
  });

  describe('vite-ts', () => {
    it('src/ already canonical, test/ reorganizes to tests/', async () => {
      const result = await run('vite-ts');
      expect(result.alreadyCanonical).toContain('src');
      const testDecision = find(result.decisions, 'test');
      expect(testDecision?.action).toBe('reorganize');
      expect(testDecision?.targetPath).toBe('tests');
    });
  });

  describe('rust-workspace', () => {
    it('reorganizes crates/ to src/, tests/ and docs/ already canonical', async () => {
      const result = await run('rust-workspace');
      const cratesDecision = find(result.decisions, 'crates');
      expect(cratesDecision?.action).toBe('reorganize');
      expect(cratesDecision?.targetPath).toBe('src');
      expect(result.alreadyCanonical).toContain('tests');
      expect(result.alreadyCanonical).toContain('docs');
    });
  });

  describe('go-monorepo', () => {
    it('reorganizes cmd/ and pkg/ to src/', async () => {
      const result = await run('go-monorepo');
      const cmdDecision = find(result.decisions, 'cmd');
      expect(cmdDecision?.action).toBe('reorganize');
      expect(cmdDecision?.targetPath).toBe('src');
      const pkgDecision = find(result.decisions, 'pkg');
      expect(pkgDecision?.action).toBe('reorganize');
      expect(pkgDecision?.targetPath).toBe('src');
    });
  });

  describe('django', () => {
    it('adapts myproject/ and myapp/, docs/ already canonical', async () => {
      const result = await run('django');
      expect(find(result.decisions, 'myproject')?.action).toBe('adapt');
      expect(find(result.decisions, 'myapp')?.action).toBe('adapt');
      expect(result.alreadyCanonical).toContain('docs');
    });
  });

  describe('python-pyproject', () => {
    it('src/, tests/, docs/ all already canonical', async () => {
      const result = await run('python-pyproject');
      expect(result.alreadyCanonical).toContain('src');
      expect(result.alreadyCanonical).toContain('tests');
      expect(result.alreadyCanonical).toContain('docs');
    });
  });
});

describe('logDecisions', () => {
  it('returns non-empty markdown string', async () => {
    const result = await run('nextjs-app');
    const md = logDecisions(result);
    expect(md.length).toBeGreaterThan(0);
    expect(md).toContain('# Install / Adapt Decisions');
  });
});

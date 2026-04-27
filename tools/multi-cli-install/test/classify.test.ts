import { describe, it, expect } from 'vitest';
import { inspect, classifyDirs } from '../src/inspector/index.js';
import type { DirClassification } from '../src/inspector/index.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(__dirname, 'fixtures', name);

function find(results: DirClassification[], path: string) {
  return results.find(r => r.path === path);
}

describe('classifyDirs', () => {
  describe('nextjs-app', () => {
    it('classifies app/ as movable-with-rules and tests/ as movable', async () => {
      const profile = await inspect(fix('nextjs-app'));
      const results = classifyDirs(profile);
      expect(find(results, 'app')?.class).toBe('movable-with-rules');
      expect(find(results, 'tests')?.class).toBe('movable');
    });
  });

  describe('nextjs-pages', () => {
    it('classifies pages/, src/, __tests__', async () => {
      const profile = await inspect(fix('nextjs-pages'));
      const results = classifyDirs(profile);
      expect(find(results, 'pages')?.class).toBe('movable-with-rules');
      expect(find(results, '__tests__')?.class).toBe('movable');
      expect(find(results, 'src')?.class).toBe('movable-with-rules');
    });
  });

  describe('rails', () => {
    it('classifies core dirs as framework-pinned', async () => {
      const profile = await inspect(fix('rails'));
      const results = classifyDirs(profile);
      expect(find(results, 'app')?.class).toBe('framework-pinned');
      expect(find(results, 'config')?.class).toBe('framework-pinned');
      expect(find(results, 'db')?.class).toBe('framework-pinned');
      expect(find(results, 'spec')?.class).toBe('framework-pinned');
      expect(find(results, 'test')?.class).toBe('framework-pinned');
    });
  });

  describe('django', () => {
    it('classifies myproject/ and myapp/ as framework-pinned, docs/ as movable', async () => {
      const profile = await inspect(fix('django'));
      const results = classifyDirs(profile);
      expect(find(results, 'myproject')?.class).toBe('framework-pinned');
      expect(find(results, 'myapp')?.class).toBe('framework-pinned');
      expect(find(results, 'docs')?.class).toBe('movable');
    });
  });

  describe('rust-workspace', () => {
    it('classifies crates/ as movable-with-rules, tests/ and docs/ as movable', async () => {
      const profile = await inspect(fix('rust-workspace'));
      const results = classifyDirs(profile);
      expect(find(results, 'crates')?.class).toBe('movable-with-rules');
      expect(find(results, 'tests')?.class).toBe('movable');
      expect(find(results, 'docs')?.class).toBe('movable');
    });
  });

  describe('go-monorepo', () => {
    it('classifies cmd/ and pkg/ as movable-with-rules', async () => {
      const profile = await inspect(fix('go-monorepo'));
      const results = classifyDirs(profile);
      expect(find(results, 'cmd')?.class).toBe('movable-with-rules');
      expect(find(results, 'pkg')?.class).toBe('movable-with-rules');
    });
  });

  describe('vite-ts', () => {
    it('classifies src/ as movable-with-rules, test/ as movable', async () => {
      const profile = await inspect(fix('vite-ts'));
      const results = classifyDirs(profile);
      expect(find(results, 'src')?.class).toBe('movable-with-rules');
      expect(find(results, 'test')?.class).toBe('movable');
    });
  });

  describe('python-pyproject', () => {
    it('classifies src/ as movable-with-rules, tests/ and docs/ as movable', async () => {
      const profile = await inspect(fix('python-pyproject'));
      const results = classifyDirs(profile);
      expect(find(results, 'src')?.class).toBe('movable-with-rules');
      expect(find(results, 'tests')?.class).toBe('movable');
      expect(find(results, 'docs')?.class).toBe('movable');
    });
  });
});

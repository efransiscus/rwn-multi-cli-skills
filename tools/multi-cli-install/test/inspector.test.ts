import { describe, it, expect } from 'vitest';
import { inspect } from '../src/inspector/index.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(__dirname, 'fixtures', name);

describe('inspector', () => {
  describe('nextjs-app', () => {
    it('detects stack, framework, dirs, commands, lint', async () => {
      const p = await inspect(fix('nextjs-app'));
      expect(p.stack.language).toBe('typescript');
      expect(p.stack.packageManager).toBe('npm');
      expect(p.framework.name).toBe('nextjs-app');
      expect(p.dirs.source.some(d => d.path === 'app')).toBe(true);
      expect(p.dirs.test.some(d => d.path === 'tests')).toBe(true);
      expect(p.dirs.ci.some(d => d.path === '.github/workflows')).toBe(true);
      expect(p.commands.test).toBe('jest');
      expect(p.commands.build).toBe('next build');
      expect(p.commands.lint).toBe('next lint');
      expect(p.conventions.lintConfig).toContain('.eslintrc.json');
    });
  });

  describe('nextjs-pages', () => {
    it('detects pages variant and __tests__', async () => {
      const p = await inspect(fix('nextjs-pages'));
      expect(p.framework.name).toBe('nextjs-pages');
      expect(p.dirs.test.some(d => d.path === '__tests__')).toBe(true);
    });
  });

  describe('vite-ts', () => {
    it('detects vite framework and commands', async () => {
      const p = await inspect(fix('vite-ts'));
      expect(p.framework.name).toBe('vite');
      expect(p.commands.test).toBe('vitest run');
      expect(p.commands.build).toBe('tsc && vite build');
      expect(p.conventions.lintConfig).toContain('.prettierrc');
    });
  });

  describe('django', () => {
    it('detects django framework, python/pip, secrets, docs, commands', async () => {
      const p = await inspect(fix('django'));
      expect(p.framework.name).toBe('django');
      expect(p.stack.language).toBe('python');
      expect(p.stack.packageManager).toBe('pip');
      expect(p.secretRisk.found).toBe(true);
      expect(p.secretRisk.files.some(f => f.includes('.env'))).toBe(true);
      expect(p.dirs.docs.some(d => d.path === 'docs')).toBe(true);
      expect(p.commands.test).toBe('pytest');
    });
  });

  describe('rails', () => {
    it('detects rails framework, ruby/bundler, CI, lint, test dirs', async () => {
      const p = await inspect(fix('rails'));
      expect(p.framework.name).toBe('rails');
      expect(p.stack.language).toBe('ruby');
      expect(p.stack.packageManager).toBe('bundler');
      expect(p.dirs.ci.some(d => d.path === '.gitlab-ci.yml')).toBe(true);
      expect(p.conventions.lintConfig).toContain('.rubocop.yml');
      expect(p.dirs.test.some(d => d.path === 'spec')).toBe(true);
      expect(p.dirs.test.some(d => d.path === 'test')).toBe(true);
    });
  });

  describe('rust-workspace', () => {
    it('detects rust/cargo, monorepo, ADRs, lint, commands', async () => {
      const p = await inspect(fix('rust-workspace'));
      expect(p.stack.language).toBe('rust');
      expect(p.stack.packageManager).toBe('cargo');
      expect(p.framework.name).toBe('cargo-workspace');
      expect(p.framework.monorepo).not.toBeNull();
      expect(p.framework.monorepo!.tool).toBe('cargo-workspace');
      expect(p.framework.monorepo!.members).toContain('crates/core');
      expect(p.framework.monorepo!.members).toContain('crates/cli');
      expect(p.existingAdrs.found).toBe(true);
      expect(p.existingAdrs.paths).toContain('docs/architecture');
      expect(p.conventions.lintConfig).toContain('clippy.toml');
      expect(p.commands.test).toBe('cargo test');
      expect(p.commands.build).toBe('cargo build');
      expect(p.commands.lint).toBe('cargo clippy');
    });
  });

  describe('go-monorepo', () => {
    it('detects go, monorepo, Makefile commands, CI', async () => {
      const p = await inspect(fix('go-monorepo'));
      expect(p.stack.language).toBe('go');
      expect(p.stack.packageManager).toBe('go');
      expect(p.framework.name).toBe('go-workspace');
      expect(p.framework.monorepo).not.toBeNull();
      expect(p.framework.monorepo!.tool).toBe('go-workspace');
      expect(p.commands.test).toBe('go test ./...');
      expect(p.commands.build).toBe('go build ./cmd/api');
      expect(p.commands.lint).toBe('golangci-lint run');
      expect(p.commands.source).toBe('Makefile');
      expect(p.dirs.ci.some(d => d.path === '.github/workflows')).toBe(true);
    });
  });

  describe('python-pyproject', () => {
    it('detects python/poetry, commands, secrets, ADRs', async () => {
      const p = await inspect(fix('python-pyproject'));
      expect(p.stack.language).toBe('python');
      expect(p.stack.packageManager).toBe('poetry');
      expect(p.commands.test).toBe('pytest');
      expect(p.commands.lint).toBe('ruff check');
      expect(p.secretRisk.found).toBe(true);
      expect(p.existingAdrs.found).toBe(true);
      expect(p.existingAdrs.paths).toContain('docs/decisions');
    });
  });
});

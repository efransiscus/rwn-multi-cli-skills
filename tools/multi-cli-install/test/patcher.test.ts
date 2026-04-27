import { describe, it, expect, afterEach } from 'vitest';
import { inspect, classifyDirs } from '../src/inspector/index.js';
import { computeDefaults } from '../src/strategy/index.js';
import { generateProjectContext, applyPatches } from '../src/patcher/index.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync, cpSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(__dirname, 'fixtures', name);

async function run(fixture: string) {
  const profile = await inspect(fix(fixture));
  const classifications = classifyDirs(profile);
  const result = computeDefaults(profile, classifications);
  return { profile, decisions: result.decisions };
}

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = join(tmpdir(), `patcher-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const d of tempDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  tempDirs.length = 0;
});

describe('generateProjectContext', () => {
  it('vite-ts: contains stack, framework, commands, sections', async () => {
    const { profile, decisions } = await run('vite-ts');
    const md = generateProjectContext(profile, decisions);
    expect(md).toContain('typescript');
    expect(md).toContain('vite');
    expect(md).toContain('`vitest run`');
    expect(md).toContain('## Stack');
    expect(md).toContain('## Layout (post-install)');
    expect(md).toContain('## Commands');
    expect(md).toContain('## Conventions');
    expect(md).toContain('## Notes for AI agents');
  });

  it('rails: framework-pinned section lists adapted dirs', async () => {
    const { profile, decisions } = await run('rails');
    const md = generateProjectContext(profile, decisions);
    expect(md).toContain('## Framework-pinned dirs (NOT moved during install)');
    expect(md).toContain('`app/`');
    expect(md).toContain('`config/`');
    expect(md).toContain('`db/`');
  });

  it('django: secret risk is NOT in context output', async () => {
    const { profile, decisions } = await run('django');
    expect(profile.secretRisk.found).toBe(true);
    const md = generateProjectContext(profile, decisions);
    expect(md).not.toContain('.env');
    expect(md).not.toContain('secret');
  });
});

describe('applyPatches', () => {
  it('dry-run: no files written, result has filesCreated', async () => {
    const { profile, decisions } = await run('vite-ts');
    const tmp = makeTempDir();
    const result = applyPatches(tmp, profile, decisions, true);
    expect(result.filesCreated).toContain('.ai/project-context.md');
    expect(result.errors).toHaveLength(0);
    expect(existsSync(join(tmp, '.ai', 'project-context.md'))).toBe(false);
  });

  it('real: writes .ai/project-context.md with expected content', async () => {
    const { profile, decisions } = await run('vite-ts');
    const tmp = makeTempDir();
    const result = applyPatches(tmp, profile, decisions, false);
    expect(result.filesCreated).toContain('.ai/project-context.md');
    expect(result.errors).toHaveLength(0);
    const filePath = join(tmp, '.ai', 'project-context.md');
    expect(existsSync(filePath)).toBe(true);
    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('# Project context');
    expect(content).toContain('typescript');
    expect(content).toContain('vite');
  });
});

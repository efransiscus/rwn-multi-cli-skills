import { describe, it, expect, afterEach } from 'vitest';
import { inspect, classifyDirs } from '../src/inspector/index.js';
import { computeDefaults } from '../src/strategy/index.js';
import { planMigration, executePlan } from '../src/migration/index.js';
import { cpSync, rmSync, existsSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fix = (name: string) => join(__dirname, 'fixtures', name);

const tmpDirs: string[] = [];

function copyFixture(name: string): string {
  const tmp = mkdtempSync(join(tmpdir(), `mci-test-${name}-`));
  cpSync(fix(name), tmp, { recursive: true });
  tmpDirs.push(tmp);
  return tmp;
}

afterEach(() => {
  for (const d of tmpDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  tmpDirs.length = 0;
});

async function pipeline(dir: string) {
  const profile = await inspect(dir);
  const classifications = classifyDirs(profile);
  const strategy = computeDefaults(profile, classifications);
  const plan = planMigration(dir, strategy.decisions);
  return { profile, classifications, strategy, plan };
}

describe('migration planner', () => {
  it('vite-ts: plans move of test/ → tests/', async () => {
    const tmp = copyFixture('vite-ts');
    const { plan } = await pipeline(tmp);
    const moveOp = plan.ops.find(o => o.type === 'move' && o.source === 'test');
    expect(moveOp).toBeDefined();
    expect(moveOp!.target).toBe('tests');
    expect(plan.summary).toContain('test/');
  });

  it('nextjs-app: plans move of app/ → src/', async () => {
    const tmp = copyFixture('nextjs-app');
    const { plan } = await pipeline(tmp);
    const moveOp = plan.ops.find(o => o.type === 'move' && o.source === 'app');
    expect(moveOp).toBeDefined();
    expect(moveOp!.target).toBe('src');
    // Should also plan config updates for next.config.js and workflow
    const configOps = plan.ops.filter(o => o.type === 'update-config');
    expect(configOps.length).toBeGreaterThan(0);
  });

  it('go-monorepo: plans move of cmd/ and pkg/ → src/', async () => {
    const tmp = copyFixture('go-monorepo');
    const { plan } = await pipeline(tmp);
    const cmdMove = plan.ops.find(o => o.type === 'move' && o.source === 'cmd');
    const pkgMove = plan.ops.find(o => o.type === 'move' && o.source === 'pkg');
    expect(cmdMove).toBeDefined();
    expect(cmdMove!.target).toBe('src');
    expect(pkgMove).toBeDefined();
    expect(pkgMove!.target).toBe('src');
    // Should plan go.work update
    const goWorkOp = plan.ops.find(o => o.type === 'update-config' && o.target === 'go.work');
    expect(goWorkOp).toBeDefined();
  });
});

describe('migration executor', () => {
  it('vite-ts: moves test/ → tests/', async () => {
    const tmp = copyFixture('vite-ts');
    const { plan } = await pipeline(tmp);
    const result = executePlan(tmp, plan, false);
    expect(result.success).toBe(true);
    expect(result.opsExecuted).toBeGreaterThan(0);
    expect(existsSync(join(tmp, 'tests', 'utils.test.ts'))).toBe(true);
    expect(existsSync(join(tmp, 'test'))).toBe(false);
  });

  it('nextjs-app: moves app/ → src/', async () => {
    const tmp = copyFixture('nextjs-app');
    const { plan } = await pipeline(tmp);
    const result = executePlan(tmp, plan, false);
    expect(result.success).toBe(true);
    expect(existsSync(join(tmp, 'src', 'page.tsx'))).toBe(true);
    expect(existsSync(join(tmp, 'app'))).toBe(false);
  });

  it('go-monorepo: moves cmd/ and pkg/ → src/', async () => {
    const tmp = copyFixture('go-monorepo');
    const { plan } = await pipeline(tmp);
    const result = executePlan(tmp, plan, false);
    expect(result.success).toBe(true);
    expect(existsSync(join(tmp, 'src', 'api', 'main.go'))).toBe(true);
    expect(existsSync(join(tmp, 'cmd'))).toBe(false);
  });

  it('dry-run: does not move files', async () => {
    const tmp = copyFixture('vite-ts');
    const { plan } = await pipeline(tmp);
    const result = executePlan(tmp, plan, true);
    expect(result.opsExecuted).toBeGreaterThan(0);
    // Files should NOT have moved
    expect(existsSync(join(tmp, 'test', 'utils.test.ts'))).toBe(true);
    expect(existsSync(join(tmp, 'tests'))).toBe(false);
  });
});

import type { ProjectProfile } from '../inspector/types.js';
import type { DirClassification } from '../inspector/classify.js';
import type { MigrationDecision, StrategyResult } from './types.js';

const CANONICAL_DIRS = new Set([
  'src', 'tests', 'docs', 'infra', 'migrations', 'scripts', 'tools', 'config', 'assets',
]);

const SOURCE_DIRS = new Set(['app', 'pages', 'lib', 'crates', 'cmd', 'pkg']);
const TEST_DIRS = new Set(['test', '__tests__', 'spec', 'e2e']);
const DOC_DIRS = new Set(['documentation', 'doc', 'wiki']);
const MIGRATION_DIRS = new Set(['db', 'alembic', 'prisma']);
const ASSET_DIRS = new Set(['static', 'public']);
const CI_DIRS = new Set(['.github', '.circleci', '.buildkite']);

function mapTarget(dir: string): string | null {
  if (SOURCE_DIRS.has(dir)) return 'src';
  if (TEST_DIRS.has(dir)) return 'tests';
  if (DOC_DIRS.has(dir)) return 'docs';
  if (MIGRATION_DIRS.has(dir)) return 'migrations';
  if (ASSET_DIRS.has(dir)) return 'assets';
  return null;
}

export function computeDefaults(
  _profile: ProjectProfile,
  classifications: DirClassification[],
): StrategyResult {
  const decisions: MigrationDecision[] = [];
  const alreadyCanonical: string[] = [];

  for (const c of classifications) {
    const dir = c.path;

    // CI dirs — always keep in place
    if (CI_DIRS.has(dir)) continue;

    // Framework-pinned or unknown → always adapt, even if name matches canonical
    if (c.class === 'framework-pinned' || c.class === 'unknown') {
      decisions.push({
        sourcePath: dir,
        targetPath: null,
        action: 'adapt',
        classification: c.class,
        reason: c.reason,
      });
      continue;
    }

    // Already in canonical position (only for movable/movable-with-rules)
    if (CANONICAL_DIRS.has(dir)) {
      alreadyCanonical.push(dir);
      continue;
    }

    // movable or movable-with-rules → reorganize if we have a target
    const target = mapTarget(dir);
    if (target) {
      decisions.push({
        sourcePath: dir,
        targetPath: target,
        action: 'reorganize',
        classification: c.class,
        reason: `move ${dir}/ → ${target}/`,
      });
    } else {
      // movable/movable-with-rules but no mapping — adapt
      decisions.push({
        sourcePath: dir,
        targetPath: null,
        action: 'adapt',
        classification: c.class,
        reason: `no canonical mapping for ${dir}/`,
      });
    }
  }

  return { decisions, alreadyCanonical };
}

export function logDecisions(result: StrategyResult): string {
  const lines: string[] = [
    '# Install / Adapt Decisions',
    '',
  ];

  if (result.alreadyCanonical.length > 0) {
    lines.push('## Already canonical');
    lines.push('');
    for (const d of result.alreadyCanonical) lines.push(`- \`${d}/\``);
    lines.push('');
  }

  const reorg = result.decisions.filter(d => d.action === 'reorganize');
  if (reorg.length > 0) {
    lines.push('## Reorganize');
    lines.push('');
    lines.push('| Source | Target | Classification |');
    lines.push('|---|---|---|');
    for (const d of reorg) {
      lines.push(`| \`${d.sourcePath}/\` | \`${d.targetPath}/\` | ${d.classification} |`);
    }
    lines.push('');
  }

  const adapt = result.decisions.filter(d => d.action === 'adapt');
  if (adapt.length > 0) {
    lines.push('## Adapt (keep in place)');
    lines.push('');
    lines.push('| Directory | Classification | Reason |');
    lines.push('|---|---|---|');
    for (const d of adapt) {
      lines.push(`| \`${d.sourcePath}/\` | ${d.classification} | ${d.reason} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

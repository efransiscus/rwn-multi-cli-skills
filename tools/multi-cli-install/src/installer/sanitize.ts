import { writeFileSync, readdirSync, rmSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const CLEAN_ACTIVITY_LOG = `# Activity Log

Newest entries at the top. Each CLI prepends an entry after completing substantive work.

**Timestamp rule:** the \`HH:MM\` in each entry heading is local wall-clock time at the
moment of prepending (i.e. when the work finished, not when it started). CLIs on
different local clocks may produce timestamps that don't sort monotonically;
**prepend order is the authoritative sequencing**, timestamps are annotations.

**Archive:** older entries live in \`.ai/activity/archive/YYYY-MM.md\` (one file per
calendar month). See \`.ai/activity/archive/README.md\` for the rollover protocol.

---

`;

function clearDir(dir: string, dryRun: boolean): string[] {
  const modified: string[] = [];
  if (!existsSync(dir)) return modified;
  for (const entry of readdirSync(dir)) {
    modified.push(join(dir, entry));
    if (!dryRun) rmSync(join(dir, entry), { recursive: true, force: true });
  }
  return modified;
}

export function sanitizeState(targetDir: string, version: string, dryRun: boolean): string[] {
  const modified: string[] = [];

  // 1. Clean activity log
  const logPath = join(targetDir, '.ai', 'activity', 'log.md');
  if (existsSync(logPath)) {
    modified.push('.ai/activity/log.md');
    if (!dryRun) writeFileSync(logPath, CLEAN_ACTIVITY_LOG);
  }

  // 2. Clear handoff open/done dirs (keep README.md and template.md at handoffs/ root)
  for (const cli of ['to-kiro', 'to-kimi', 'to-claude']) {
    for (const sub of ['open', 'done']) {
      const dir = join(targetDir, '.ai', 'handoffs', cli, sub);
      modified.push(...clearDir(dir, dryRun).map(p => p.replace(targetDir + '/', '').replace(targetDir + '\\', '')));
    }
  }

  // 3. Clear .ai/reports/ contents (keep README.md)
  const reportsDir = join(targetDir, '.ai', 'reports');
  if (existsSync(reportsDir)) {
    for (const entry of readdirSync(reportsDir)) {
      if (entry === 'README.md') continue;
      modified.push(`.ai/reports/${entry}`);
      if (!dryRun) rmSync(join(reportsDir, entry), { recursive: true, force: true });
    }
  }

  // 4. Clear .archive/ai/ contents
  for (const sub of ['handoffs', 'reports', 'activity']) {
    const dir = join(targetDir, '.archive', 'ai', sub);
    modified.push(...clearDir(dir, dryRun).map(p => p.replace(targetDir + '/', '').replace(targetDir + '\\', '')));
  }

  // 5. Append attribution marker to known-limitations.md
  const klPath = join(targetDir, '.ai', 'known-limitations.md');
  if (existsSync(klPath)) {
    modified.push('.ai/known-limitations.md');
    if (!dryRun) {
      appendFileSync(klPath, `\n---\n\n# ADDED BY @rwn34/multi-cli-install v${version}\n`);
    }
  }

  return modified;
}

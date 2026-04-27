import { mkdirSync, renameSync, readFileSync, writeFileSync, existsSync, readdirSync, rmdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { MigrationPlan, MigrationResult } from './types.js';

/** Move src into dst, merging children if dst already exists. */
function moveDir(src: string, dst: string): void {
  if (!existsSync(dst)) {
    mkdirSync(dirname(dst), { recursive: true });
    renameSync(src, dst);
    return;
  }
  // dst exists — move each child of src into dst
  for (const entry of readdirSync(src)) {
    renameSync(join(src, entry), join(dst, entry));
  }
  rmdirSync(src);
}

export function executePlan(targetDir: string, plan: MigrationPlan, dryRun: boolean): MigrationResult {
  const errors: string[] = [];
  let opsExecuted = 0;

  const moveMap = new Map<string, string>();
  for (const op of plan.ops) {
    if (op.type === 'move') moveMap.set(op.source, op.target);
  }

  for (const op of plan.ops) {
    try {
      if (op.type === 'move') {
        if (dryRun) { opsExecuted++; continue; }
        moveDir(join(targetDir, op.source), join(targetDir, op.target));
        opsExecuted++;
      } else if (op.type === 'update-config') {
        const filePath = join(targetDir, op.target);
        if (!existsSync(filePath)) { errors.push(`config file not found: ${op.target}`); continue; }
        if (dryRun) { opsExecuted++; continue; }
        const newDir = moveMap.get(op.source);
        if (!newDir) { opsExecuted++; continue; }
        const content = readFileSync(filePath, 'utf-8');
        const updated = content.replaceAll(op.source, newDir);
        if (updated !== content) writeFileSync(filePath, updated, 'utf-8');
        opsExecuted++;
      }
    } catch (err) {
      errors.push(`${op.description}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { success: errors.length === 0, opsExecuted, errors };
}

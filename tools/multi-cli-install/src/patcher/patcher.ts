import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectProfile } from '../inspector/types.js';
import type { MigrationDecision } from '../strategy/types.js';
import type { PatchResult } from './types.js';
import { generateProjectContext } from './context-generator.js';

export function applyPatches(
  targetDir: string,
  profile: ProjectProfile,
  decisions: MigrationDecision[],
  dryRun: boolean,
): PatchResult {
  const result: PatchResult = { filesCreated: [], filesModified: [], errors: [] };
  const aiDir = join(targetDir, '.ai');
  const contextPath = join(aiDir, 'project-context.md');
  const relativePath = '.ai/project-context.md';

  const content = generateProjectContext(profile, decisions);

  if (dryRun) {
    result.filesCreated.push(relativePath);
    return result;
  }

  try {
    if (!existsSync(aiDir)) {
      mkdirSync(aiDir, { recursive: true });
    }
    const existed = existsSync(contextPath);
    writeFileSync(contextPath, content, 'utf-8');
    if (existed) {
      result.filesModified.push(relativePath);
    } else {
      result.filesCreated.push(relativePath);
    }
  } catch (err) {
    result.errors.push(`Failed to write ${relativePath}: ${(err as Error).message}`);
  }

  return result;
}

#!/usr/bin/env node
import { VERSION, inspect, classifyDirs, computeDefaults, logDecisions, planMigration, executePlan, applyPatches } from '../src/index.js';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('-')));
const positional = args.filter(a => !a.startsWith('-'));

if (flags.has('--version') || flags.has('-v')) {
  console.log(VERSION);
  process.exit(0);
}

if (flags.has('--help') || flags.has('-h') || positional.length === 0) {
  console.log(`multi-cli-install v${VERSION}`);
  console.log('');
  console.log('Usage: npx @rwn34/multi-cli-install <target-dir> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --new              Create a new project (greenfield)');
  console.log('  --dry-run          Preview changes without writing');
  console.log('  --refresh-context  Regenerate .ai/project-context.md only');
  console.log('  --inspect-only     Show project profile and exit');
  console.log('  -v, --version      Show version');
  console.log('  -h, --help         Show this help');
  process.exit(0);
}

const targetDir = resolve(positional[0]);
const dryRun = flags.has('--dry-run');
const inspectOnly = flags.has('--inspect-only');
const refreshContext = flags.has('--refresh-context');

async function main() {
  console.log(`multi-cli-install v${VERSION}`);
  console.log(`Target: ${targetDir}`);
  if (dryRun) console.log('Mode: dry-run (no changes will be written)');
  console.log('');

  // Step 1: Inspect
  console.log('Inspecting project...');
  const profile = await inspect(targetDir);
  console.log(`  Stack: ${profile.stack.language} / ${profile.stack.packageManager}`);
  console.log(`  Framework: ${profile.framework.name}${profile.framework.monorepo ? ` (${profile.framework.monorepo.tool})` : ''}`);
  console.log(`  Source dirs: ${profile.dirs.source.map(d => d.path).join(', ') || '(none)'}`);
  console.log(`  Test dirs: ${profile.dirs.test.map(d => d.path).join(', ') || '(none)'}`);
  if (profile.secretRisk.found) {
    console.log(`  ⚠ Secret risk: ${profile.secretRisk.files.join(', ')}`);
  }
  console.log('');

  if (inspectOnly) {
    console.log(JSON.stringify(profile, null, 2));
    process.exit(0);
  }

  // Step 2: Classify
  console.log('Classifying directories...');
  const classifications = classifyDirs(profile);
  for (const c of classifications) {
    console.log(`  ${c.path}: ${c.class} — ${c.reason}`);
  }
  console.log('');

  // Step 3: Strategy
  console.log('Computing migration strategy...');
  const strategy = computeDefaults(profile, classifications);
  if (strategy.alreadyCanonical.length > 0) {
    console.log(`  Already canonical: ${strategy.alreadyCanonical.join(', ')}`);
  }
  for (const d of strategy.decisions) {
    console.log(`  ${d.sourcePath} → ${d.action}${d.targetPath ? ` (→ ${d.targetPath})` : ''}`);
  }
  console.log('');

  // Write decision log
  const decisionLog = logDecisions(strategy);
  if (!dryRun) {
    const reportsDir = join(targetDir, '.ai', 'reports');
    if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
    writeFileSync(join(reportsDir, 'install-adapt-decisions.md'), decisionLog);
    console.log('  Decision log written to .ai/reports/install-adapt-decisions.md');
  }

  if (refreshContext) {
    // Skip migration, just regenerate context
    console.log('Regenerating project context...');
    const result = applyPatches(targetDir, profile, strategy.decisions, dryRun);
    console.log(`  Created: ${result.filesCreated.join(', ') || '(none)'}`);
    process.exit(0);
  }

  // Step 4: Plan migration
  const reorgDecisions = strategy.decisions.filter(d => d.action === 'reorganize');
  if (reorgDecisions.length > 0) {
    console.log('Planning migration...');
    const plan = planMigration(targetDir, reorgDecisions);
    console.log(`  ${plan.ops.length} operations planned`);
    for (const op of plan.ops) {
      console.log(`    ${op.type}: ${op.description}`);
    }
    console.log('');

    // Step 5: Execute
    console.log(dryRun ? 'Dry-run — no changes applied.' : 'Executing migration...');
    const result = executePlan(targetDir, plan, dryRun);
    if (result.success) {
      console.log(`  ✓ ${result.opsExecuted} operations completed`);
    } else {
      console.error(`  ✗ Migration failed: ${result.errors.join(', ')}`);
      process.exit(1);
    }
    console.log('');
  } else {
    console.log('No directories need reorganization.');
    console.log('');
  }

  // Step 6: Patch
  console.log('Generating project context...');
  const patchResult = applyPatches(targetDir, profile, strategy.decisions, dryRun);
  console.log(`  Created: ${patchResult.filesCreated.join(', ') || '(none)'}`);
  if (patchResult.errors.length > 0) {
    console.error(`  Errors: ${patchResult.errors.join(', ')}`);
  }

  console.log('');
  console.log(dryRun ? 'Dry-run complete. No changes were written.' : '✓ Installation complete.');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

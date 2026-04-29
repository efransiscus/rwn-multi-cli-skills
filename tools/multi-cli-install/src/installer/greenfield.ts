import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function scaffoldGreenfield(targetDir: string, projectName: string): void {
  if (existsSync(targetDir)) {
    throw new Error(`Target directory already exists: ${targetDir}`);
  }
  mkdirSync(targetDir, { recursive: true });
  execSync('git init', { cwd: targetDir, stdio: 'pipe' });
  writeFileSync(join(targetDir, 'README.md'), `# ${projectName}\n`);
  writeFileSync(join(targetDir, '.gitignore'), 'node_modules/\ndist/\n.env\n');
  execSync('git add . && git commit -m "feat(scaffold): initial commit"', {
    cwd: targetDir,
    stdio: 'pipe',
  });
}

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import type {
  ProjectProfile, StackInfo, FrameworkInfo, DirInfo,
  CommandInfo, ConventionInfo, AdrInfo, SecretRiskInfo,
  DetectedDir, MonorepoInfo,
} from './types.js';

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

async function readText(p: string): Promise<string | null> {
  try { return await readFile(p, 'utf-8'); } catch { return null; }
}

async function listDir(p: string): Promise<string[]> {
  try { return await readdir(p); } catch { return []; }
}

async function isDir(p: string): Promise<boolean> {
  try { return (await stat(p)).isDirectory(); } catch { return false; }
}

// Scan top-2 levels of entries (files and dirs)
async function scanEntries(root: string): Promise<{ dirs: string[]; files: string[] }> {
  const dirs: string[] = [];
  const files: string[] = [];
  const top = await listDir(root);
  for (const name of top) {
    const full = join(root, name);
    if (await isDir(full)) {
      dirs.push(name);
      const sub = await listDir(full);
      for (const s of sub) {
        const sf = join(full, s);
        if (await isDir(sf)) dirs.push(name + '/' + s);
        else files.push(name + '/' + s);
      }
    } else {
      files.push(name);
    }
  }
  return { dirs, files };
}

async function detectStack(root: string): Promise<StackInfo> {
  // package.json
  const pkgText = await readText(join(root, 'package.json'));
  if (pkgText) {
    const hasTsconfig = await exists(join(root, 'tsconfig.json'));
    const lang = hasTsconfig ? 'typescript' : 'javascript';
    let pm = 'npm';
    if (await exists(join(root, 'pnpm-lock.yaml'))) pm = 'pnpm';
    else if (await exists(join(root, 'yarn.lock'))) pm = 'yarn';
    return { language: lang, packageManager: pm, manifestFile: 'package.json' };
  }
  // Cargo.toml
  if (await exists(join(root, 'Cargo.toml')))
    return { language: 'rust', packageManager: 'cargo', manifestFile: 'Cargo.toml' };
  // go.mod
  if (await exists(join(root, 'go.mod')))
    return { language: 'go', packageManager: 'go', manifestFile: 'go.mod' };
  // pyproject.toml
  const pyproj = await readText(join(root, 'pyproject.toml'));
  if (pyproj) {
    const pm = pyproj.includes('[tool.poetry]') ? 'poetry' : 'pip';
    return { language: 'python', packageManager: pm, manifestFile: 'pyproject.toml' };
  }
  // requirements.txt
  if (await exists(join(root, 'requirements.txt')))
    return { language: 'python', packageManager: 'pip', manifestFile: 'requirements.txt' };
  // Gemfile
  if (await exists(join(root, 'Gemfile')))
    return { language: 'ruby', packageManager: 'bundler', manifestFile: 'Gemfile' };
  // composer.json
  if (await exists(join(root, 'composer.json')))
    return { language: 'php', packageManager: 'composer', manifestFile: 'composer.json' };
  return { language: 'unknown', packageManager: 'unknown', manifestFile: null };
}

async function detectFramework(root: string, stack: StackInfo): Promise<FrameworkInfo> {
  const none: FrameworkInfo = { name: 'unknown', version: null, detectedVia: [], monorepo: null };

  if (stack.manifestFile === 'package.json') {
    const pkg = JSON.parse((await readText(join(root, 'package.json')))!);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['next']) {
      const hasApp = await isDir(join(root, 'app'));
      const hasPages = await isDir(join(root, 'pages'));
      const variant = hasApp ? 'nextjs-app' : hasPages ? 'nextjs-pages' : 'nextjs';
      return { name: variant, version: deps['next'], detectedVia: ['package.json'], monorepo: null };
    }
    if (pkg.devDependencies?.['vite'])
      return { name: 'vite', version: pkg.devDependencies['vite'], detectedVia: ['package.json'], monorepo: null };
  }

  if (stack.language === 'python' && await exists(join(root, 'manage.py')))
    return { name: 'django', version: null, detectedVia: ['manage.py'], monorepo: null };

  if (stack.manifestFile === 'Gemfile') {
    const gemText = await readText(join(root, 'Gemfile'));
    if (gemText?.includes('rails') && await exists(join(root, 'config', 'routes.rb')))
      return { name: 'rails', version: null, detectedVia: ['Gemfile', 'config/routes.rb'], monorepo: null };
  }

  if (stack.manifestFile === 'Cargo.toml') {
    const cargoText = await readText(join(root, 'Cargo.toml'));
    if (cargoText?.includes('[workspace]')) {
      const mono = parseCargoWorkspace(cargoText);
      return { name: 'cargo-workspace', version: null, detectedVia: ['Cargo.toml'], monorepo: mono };
    }
  }

  if (await exists(join(root, 'go.work'))) {
    const goWork = await readText(join(root, 'go.work'));
    const members = parseGoWorkMembers(goWork ?? '');
    return { name: 'go-workspace', version: null, detectedVia: ['go.work'], monorepo: { tool: 'go-workspace', members } };
  }

  return none;
}

function parseCargoWorkspace(text: string): MonorepoInfo {
  const members: string[] = [];
  const match = text.match(/members\s*=\s*\[([^\]]*)\]/);
  if (match) {
    const raw = match[1];
    for (const m of raw.matchAll(/"([^"]+)"/g)) members.push(m[1]);
  }
  return { tool: 'cargo-workspace', members };
}

function parseGoWorkMembers(text: string): string[] {
  const members: string[] = [];
  const block = text.match(/use\s*\(([\s\S]*?)\)/);
  if (block) {
    for (const line of block[1].split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('//')) members.push(trimmed);
    }
  }
  return members;
}

function detectDirs(allDirs: string[], allFiles: string[], root: string): DirInfo {
  const source: DetectedDir[] = [];
  const test: DetectedDir[] = [];
  const docs: DetectedDir[] = [];
  const ci: DetectedDir[] = [];

  const srcNames = ['src', 'lib', 'app', 'pkg', 'cmd', 'crates'];
  const testNames = ['test', 'tests', '__tests__', 'spec', 'e2e'];
  const docNames = ['docs', 'documentation', 'doc'];
  const ciDirs = ['.github/workflows', '.circleci'];

  for (const d of allDirs) {
    const top = d.split('/')[0];
    if (srcNames.includes(top) && !source.some(s => s.path === top))
      source.push({ path: top, reason: 'conventional source directory' });
    if (testNames.includes(top) && !test.some(t => t.path === top))
      test.push({ path: top, reason: 'conventional test directory' });
    if (docNames.includes(top) && !docs.some(dd => dd.path === top))
      docs.push({ path: top, reason: 'conventional docs directory' });
    if (ciDirs.includes(d))
      ci.push({ path: d, reason: 'CI configuration' });
  }

  // Check for .gitlab-ci.yml as a file
  if (allFiles.includes('.gitlab-ci.yml'))
    ci.push({ path: '.gitlab-ci.yml', reason: 'CI configuration' });

  return { source, test, docs, ci };
}

async function detectCommands(root: string, stack: StackInfo): Promise<CommandInfo> {
  const cmds: CommandInfo = { test: null, build: null, lint: null, source: null };

  if (stack.manifestFile === 'package.json') {
    const pkg = JSON.parse((await readText(join(root, 'package.json')))!);
    const scripts = pkg.scripts ?? {};
    if (scripts.test) { cmds.test = scripts.test; cmds.source = 'package.json'; }
    if (scripts.build) { cmds.build = scripts.build; cmds.source = 'package.json'; }
    if (scripts.lint) { cmds.lint = scripts.lint; cmds.source = 'package.json'; }
    return cmds;
  }

  // Makefile
  const makeText = await readText(join(root, 'Makefile'));
  if (makeText) {
    const lines = makeText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(test|build|lint):/);
      if (m && i + 1 < lines.length) {
        const cmd = lines[i + 1].replace(/^\t/, '').trim();
        if (cmd) {
          (cmds as unknown as Record<string, string | null>)[m[1]] = cmd;
          cmds.source = 'Makefile';
        }
      }
    }
    if (cmds.source) return cmds;
  }

  if (stack.manifestFile === 'Cargo.toml') {
    cmds.test = 'cargo test';
    cmds.build = 'cargo build';
    cmds.lint = 'cargo clippy';
    cmds.source = 'Cargo.toml';
    return cmds;
  }

  if (stack.manifestFile === 'pyproject.toml') {
    const text = await readText(join(root, 'pyproject.toml'));
    if (text) {
      if (text.includes('[tool.pytest')) { cmds.test = 'pytest'; cmds.source = 'pyproject.toml'; }
      if (text.includes('[tool.ruff]')) { cmds.lint = 'ruff check'; cmds.source = 'pyproject.toml'; }
    }
    return cmds;
  }

  // pytest.ini for python/pip
  if (stack.language === 'python') {
    if (await exists(join(root, 'pytest.ini'))) {
      cmds.test = 'pytest';
      cmds.source = 'pytest.ini';
    }
    return cmds;
  }

  if (stack.language === 'go') {
    cmds.test = 'go test ./...';
    cmds.build = 'go build ./...';
    cmds.lint = 'go vet ./...';
    cmds.source = 'go.mod';
    return cmds;
  }

  return cmds;
}

async function detectConventions(root: string, allFiles: string[]): Promise<ConventionInfo> {
  const lintConfigs: string[] = [];
  const lintPatterns = [
    /^\.eslintrc/,
    /^\.prettierrc/,
    /^ruff\.toml$/,
    /^clippy\.toml$/,
    /^\.rubocop\.yml$/,
    /^biome\.json$/,
  ];

  for (const f of allFiles) {
    const name = basename(f);
    for (const pat of lintPatterns) {
      if (pat.test(name) && !lintConfigs.includes(name)) lintConfigs.push(name);
    }
  }

  // Detect naming style from filenames
  const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.rb', '.rs', '.go'];
  const names: string[] = [];
  for (const f of allFiles) {
    if (codeExts.includes(extname(f))) names.push(basename(f, extname(f)));
  }

  let style = 'unknown';
  if (names.length > 0) {
    const hasKebab = names.some(n => n.includes('-'));
    const hasSnake = names.some(n => n.includes('_'));
    const hasCamel = names.some(n => /[a-z][A-Z]/.test(n));
    if (hasKebab) style = 'kebab-case';
    else if (hasSnake) style = 'snake_case';
    else if (hasCamel) style = 'camelCase';
    else style = 'lowercase';
  }

  return { namingStyle: style, lintConfig: lintConfigs };
}

async function detectAdrs(root: string): Promise<AdrInfo> {
  const adrDirs = ['docs/architecture', 'docs/decisions', 'adr', 'decisions'];
  const paths: string[] = [];
  for (const d of adrDirs) {
    const full = join(root, d);
    if (await isDir(full)) paths.push(d);
  }
  return { found: paths.length > 0, paths };
}

async function detectSecrets(allFiles: string[]): Promise<SecretRiskInfo> {
  const patterns = [
    /^\.env$/,
    /^\.env\./,
    /\.key$/,
    /\.pem$/,
    /^id_rsa/,
    /^id_ed25519/,
    /^secrets\./,
    /^credentials/,
  ];
  const found: string[] = [];
  for (const f of allFiles) {
    const name = basename(f);
    if (patterns.some(p => p.test(name))) found.push(f);
  }
  return { found: found.length > 0, files: found };
}

export async function inspect(targetDir: string): Promise<ProjectProfile> {
  const { dirs, files } = await scanEntries(targetDir);
  const stack = await detectStack(targetDir);
  const framework = await detectFramework(targetDir, stack);
  const dirInfo = detectDirs(dirs, files, targetDir);
  const commands = await detectCommands(targetDir, stack);
  const conventions = await detectConventions(targetDir, files);
  const existingAdrs = await detectAdrs(targetDir);
  const secretRisk = await detectSecrets(files);

  return {
    projectPath: targetDir,
    inspectedAt: new Date().toISOString(),
    stack,
    framework,
    dirs: dirInfo,
    commands,
    conventions,
    existingAdrs,
    secretRisk,
  };
}

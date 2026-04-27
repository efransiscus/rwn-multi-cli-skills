# @rwn34/multi-cli-install

Single-command installer for the multi-CLI AI coordination framework.

Inspects your project, reorganizes files into the framework's canonical layout where safe, falls back to adapt mode for framework-pinned dirs, and generates `.ai/project-context.md` so all AI agents understand your project.

## Usage

```bash
# Existing project — inspect, reorganize, install framework
npx @rwn34/multi-cli-install /path/to/project

# Preview only (no changes)
npx @rwn34/multi-cli-install /path/to/project --dry-run

# Inspect only (show profile as JSON)
npx @rwn34/multi-cli-install /path/to/project --inspect-only

# Refresh context file only (re-run inspector, regenerate .ai/project-context.md)
npx @rwn34/multi-cli-install /path/to/project --refresh-context
```

## What it does

1. **Inspects** — detects stack, framework, dirs, commands, conventions, secret risks
2. **Classifies** — each root dir as movable / movable-with-rules / framework-pinned / unknown
3. **Plans** — generates migration operations (file moves + config updates)
4. **Executes** — moves files, updates configs (or dry-run)
5. **Patches** — generates `.ai/project-context.md` for AI agents

## Supported stacks

- TypeScript/JavaScript (npm, pnpm, yarn)
- Rust (Cargo, workspaces)
- Go (modules, workspaces)
- Python (pip, Poetry, pyproject.toml)
- Ruby (Bundler)
- PHP (Composer)

## Supported frameworks

- Next.js (App Router, Pages Router)
- Vite
- Django (framework-pinned)
- Rails (framework-pinned)
- Cargo workspaces
- Go workspaces
- Turborepo, pnpm workspaces

## Development

```bash
cd tools/multi-cli-install
npm install
npm run build
npm test
```

## Status

Pre-v1.0.0. Validated against test fixtures. Real-project validation (P6) pending.

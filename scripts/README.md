# scripts/

Operational scripts for this template. Per ADR-0001, `scripts/` is a
permitted project directory.

## `install-template.sh`

Copies the multi-CLI AI coordination framework from this template into an
existing project and adapts it (merges `.gitignore`, detects language, amends
the root-file ADR, patches root-guard hooks, resets activity log + handoffs,
runs the framework test suites, commits on a dedicated install branch).

### Usage

```bash
# Dry-run first (prints what would happen, writes nothing):
bash scripts/install-template.sh /path/to/your/project --dry-run

# Real run:
bash scripts/install-template.sh /path/to/your/project
```

Target must be a clean git repo. The script creates branch
`ai-template-install`, makes one commit, and leaves Phase 6 (merge to master)
as a printed follow-up.

### Requirements

Bash, git, sed, awk, find, diff. No jq, no python. Tested on Git Bash
(Windows) + Linux.

### Flags

- `--dry-run` — print planned actions, touch nothing.
- `--help` / `-h` — usage.

### Rollback

```bash
cd /path/to/your/project
git checkout master
git branch -D ai-template-install
rm .ai-install-rollback-point.txt
```

See the script's `--help` for a full phase-by-phase description.

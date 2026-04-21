#!/usr/bin/env bash
# new-project.sh — create a fresh project directory with the multi-CLI AI
# coordination framework installed. Minimal greenfield wrapper around
# install-template.sh.
#
# Usage: bash scripts/new-project.sh <name> [--dry-run]
# See scripts/README.md for the two-mode explanation (new vs existing project).
#
# Requirements: bash, git. Git Bash (Windows) + Linux/macOS compatible.

set -euo pipefail

# ---------- globals ----------
NAME=""
DRY_RUN=0
SCRIPT_DIR=""
INSTALLER=""

# ---------- logging ----------
log()  { echo "[new-project] $*"; }
warn() { echo "[new-project] WARN: $*" >&2; }
err()  { echo "[new-project] ERROR: $*" >&2; }
die()  { err "$*"; exit 1; }

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    log "DRY: $*"
  else
    log "RUN: $*"
    eval "$@"
  fi
}

# ---------- help ----------
usage() {
  cat <<'EOF'
new-project.sh — create a fresh project directory with the multi-CLI AI framework.

Usage:
  bash scripts/new-project.sh <name> [--dry-run]

Arguments:
  <name>         Project directory name. Lowercase alphanumeric + hyphens only.
                 Must not already exist in the current working directory.

Options:
  --dry-run      Print planned actions without touching disk.
  --help, -h     Show this help and exit.

What it does:
  1. Validate <name> and ensure the dir doesn't already exist.
  2. mkdir <name>, git init, write a stub README.md and .gitignore.
  3. Initial commit: "chore: initial project scaffold".
  4. Invoke scripts/install-template.sh against the new directory.

For adopting the framework into an existing project, use install-template.sh
directly instead.
EOF
}

# ---------- arg parsing ----------
for arg in "$@"; do
  case "$arg" in
    --help|-h) usage; exit 0 ;;
  esac
done

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --help|-h) usage; exit 0 ;;
    --*)       die "Unknown flag: $1 (see --help)" ;;
    *)
      if [ -z "$NAME" ]; then
        NAME="$1"
      else
        die "Unexpected extra argument: $1 (see --help)"
      fi
      ;;
  esac
  shift
done

[ -n "$NAME" ] || { usage; die "Missing <name> argument."; }

# ---------- validate name ----------
case "$NAME" in
  *[!a-z0-9-]*) die "Invalid name '$NAME' — lowercase alphanumeric + hyphens only." ;;
  -*|*-)        die "Invalid name '$NAME' — cannot start or end with hyphen." ;;
  "")           die "Empty name." ;;
esac

[ -e "$NAME" ] && die "Directory '$NAME' already exists — refusing to overwrite."

# ---------- locate installer ----------
SCRIPT_PATH="${BASH_SOURCE[0]}"
case "$SCRIPT_PATH" in
  /*|?:*|?:\\*) ABS_SCRIPT="$SCRIPT_PATH" ;;
  *)            ABS_SCRIPT="$(pwd)/$SCRIPT_PATH" ;;
esac
SCRIPT_DIR="$(cd "$(dirname "$ABS_SCRIPT")" && pwd)"
INSTALLER="$SCRIPT_DIR/install-template.sh"

[ -f "$INSTALLER" ] || die "install-template.sh not found next to this script: $INSTALLER"

log "Project name: $NAME"
log "Installer:    $INSTALLER"
[ "$DRY_RUN" -eq 1 ] && log "Mode: DRY-RUN (no writes)"

# ---------- scaffold ----------
TARGET_DIR="$(pwd)/$NAME"

if [ "$DRY_RUN" -eq 1 ]; then
  log "DRY: mkdir $NAME && cd $NAME"
  log "DRY: git init --quiet"
  log "DRY: write README.md (stub)"
  log "DRY: write .gitignore (OS + editor defaults)"
  log "DRY: git add . && git commit -m 'chore: initial project scaffold'"
  log "DRY: bash $INSTALLER $TARGET_DIR --dry-run"
  bash "$INSTALLER" "$TARGET_DIR" --dry-run || warn "installer dry-run returned non-zero (target doesn't exist yet in dry mode — expected)"
  exit 0
fi

mkdir "$NAME"
cd "$NAME"
git init --quiet

cat > README.md <<EOF
# $NAME

TODO: one-sentence description.
EOF

cat > .gitignore <<'EOF'
# OS
.DS_Store
Thumbs.db
*.swp

# Editors
.vscode/
.idea/
EOF

git add README.md .gitignore
git commit --quiet -m "chore: initial project scaffold"
log "Initial scaffold committed."

# ---------- invoke installer ----------
log "Invoking install-template.sh against $TARGET_DIR …"
bash "$INSTALLER" "$TARGET_DIR"

# ---------- summary ----------
cat <<EOF

==============================================================================
[new-project] Done. Your project:
  cd $NAME

Next:
  - Add your stack manifest (package.json / Cargo.toml / etc.)
  - If you add a language, amend docs/architecture/0001-root-file-exceptions.md
    Category F accordingly
  - Start coding in src/
==============================================================================
EOF

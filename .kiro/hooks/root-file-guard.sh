#!/bin/bash
# Hook: preToolUse — block writes to project root unless the file is on the ADR-0001 allowlist
EVENT=$(cat)
FILE_PATH=$(echo "$EVENT" | grep -o '"path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"path"[[:space:]]*:[[:space:]]*"//;s/"$//')
[ -z "$FILE_PATH" ] && exit 0
# Check if file is at root (no directory separator)
DIR=$(dirname "$FILE_PATH")
if [ "$DIR" = "." ]; then
  BASE=$(basename "$FILE_PATH")
  case "$BASE" in
    # ADR category A — docs entry points
    AGENTS.md|README.md|CLAUDE.md) exit 0 ;;
    LICENSE|LICENSE.*) exit 0 ;;
    CHANGELOG|CHANGELOG.*) exit 0 ;;
    CONTRIBUTING.md|SECURITY.md|CODE_OF_CONDUCT.md) exit 0 ;;
    # ADR category E (partial) — MCP convention
    .mcp.json|.mcp.json.example) exit 0 ;;
    # Categories B/C/D (dotfiles like .gitignore/.gitattributes/.editorconfig) are caught
    # by the `DIR = "."` branch above but all start with `.`; if this hook ever needs
    # to allow bare dotfiles at root, extend here. Categories F/G/H — amend alongside
    # the ADR when a language/tool is chosen.
    *) echo "BLOCKED: Root file policy — '$BASE' not in the allowlist from docs/architecture/0001-root-file-exceptions.md. Place this file in the appropriate directory (src/, config/, infra/, etc.) or amend the ADR if it's a tooling-required exception." >&2; exit 2 ;;
  esac
fi
exit 0
#!/bin/bash
# Hook 4: Destructive command guard
# Block dangerous shell commands

read JSON

COMMAND=$(python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || \
          python -c  "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || \
          echo "")

[ -z "$COMMAND" ] && exit 0

# Normalize: lowercase for matching
CMD_LOWER=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]')

# Check destructive patterns
case "$CMD_LOWER" in
    *"rm -rf /"*|*"rm -rf /*"*)
        echo "BLOCKED: rm -rf / or rm -rf /* is extremely dangerous and not allowed." >&2
        exit 2
        ;;
esac

# git push --force / -f
if echo "$CMD_LOWER" | grep -qE 'git\s+push\s+.*(--force|-f)\b'; then
    echo "BLOCKED: git push --force is dangerous on shared branches. Use git push --force-with-lease or delegate to infra-engineer." >&2
    exit 2
fi

# git reset --hard
if echo "$CMD_LOWER" | grep -qE 'git\s+reset\s+.*--hard\b'; then
    echo "BLOCKED: git reset --hard destroys uncommitted work. Use git stash or git reset --soft instead, or delegate to infra-engineer." >&2
    exit 2
fi

# DROP TABLE / DROP DATABASE
if echo "$CMD_LOWER" | grep -qE '\bdrop\s+table\b|\bdrop\s+database\b'; then
    echo "BLOCKED: DROP TABLE/DATABASE is destructive. Use migrations or delegate to data-migrator." >&2
    exit 2
fi

exit 0

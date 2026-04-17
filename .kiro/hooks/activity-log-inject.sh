#!/bin/bash
# Hook: agentSpawn — inject recent activity log into agent context
if [ -f .ai/activity/log.md ]; then
  echo '--- Recent cross-CLI activity (top of .ai/activity/log.md) ---'
  head -40 .ai/activity/log.md
  echo '--- end ---'
fi

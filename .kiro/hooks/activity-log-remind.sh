#!/bin/bash
# Hook: stop — remind to log if activity log not updated in 60 min
if [ -f .ai/activity/log.md ] && [ -z "$(find .ai/activity/log.md -mmin -60 2>/dev/null)" ]; then
  echo 'REMINDER: .ai/activity/log.md was not updated in this session. If you made substantive changes (file edits, tests run, decisions), prepend an entry before ending.'
fi

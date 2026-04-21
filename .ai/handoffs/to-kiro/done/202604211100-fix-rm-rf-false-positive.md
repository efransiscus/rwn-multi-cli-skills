# Handoff: fix `rm -rf /` false-positive in destructive-cmd guard

**From:** claude-code
**To:** kiro
**Date:** 2026-04-21
**Priority:** medium (safety hook correctness — not a security regression, but blocks legitimate commands)
**Status:** DONE (2026-04-21)

## Completed

- Fixed `.kiro/hooks/destructive-cmd-guard.sh`: replaced substring `case` arm with boundary-aware bash regex
- Added 7 new tests (t13–t19) to `.kiro/hooks/test_hooks.sh`, renumbered old t13–t15 → t20–t22
- All 22 tests pass

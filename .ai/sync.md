# Sync — regenerate CLI-native shims from `.ai/`

## Rule

`.ai/instructions/` is the source of truth. CLI-native files are replicas. If they
disagree, regenerate from here. Never edit the replicas directly.

## Source → destination map

| Source | Destination | Role |
|---|---|---|
| `.ai/instructions/karpathy-guidelines/principles.md` | `.claude/skills/karpathy-guidelines/SKILL.md` (body only; Claude frontmatter + pointer line stay in the file) | Claude skill |
| `.ai/instructions/karpathy-guidelines/examples.md` | `.claude/skills/karpathy-guidelines/EXAMPLES.md` | Claude skill resource |
| `.ai/instructions/karpathy-guidelines/principles.md` | `.kimi/steering/karpathy-guidelines.md` | Kimi steering |
| `.ai/instructions/karpathy-guidelines/examples.md` | `.kimi/resource/karpathy-guidelines-examples.md` | Kimi resource |
| `.ai/instructions/karpathy-guidelines/principles.md` | `.kiro/steering/karpathy-guidelines.md` | Kiro steering |
| `.ai/instructions/karpathy-guidelines/examples.md` | `.kiro/skills/karpathy-guidelines/SKILL.md` (body; Kiro frontmatter + provenance comments stay in the file) | Kiro skill (on-demand via default-agent URI `skill://.kiro/skills/*/SKILL.md`) |
| `.ai/instructions/orchestrator-pattern/principles.md` | `.claude/skills/orchestrator-pattern/SKILL.md` (body only; Claude frontmatter stays) | Claude skill |
| `.ai/instructions/orchestrator-pattern/principles.md` | `.kimi/steering/orchestrator-pattern.md` | Kimi steering |
| `.ai/instructions/orchestrator-pattern/principles.md` | `.kiro/steering/orchestrator-pattern.md` | Kiro steering |

## Copy commands

### Bash / Git Bash / macOS / Linux

```bash
# From project root
cp .ai/instructions/karpathy-guidelines/principles.md .kimi/steering/karpathy-guidelines.md
cp .ai/instructions/karpathy-guidelines/principles.md .kiro/steering/karpathy-guidelines.md
cp .ai/instructions/karpathy-guidelines/examples.md   .kimi/resource/karpathy-guidelines-examples.md
cp .ai/instructions/karpathy-guidelines/examples.md   .claude/skills/karpathy-guidelines/EXAMPLES.md

# orchestrator-pattern
cp .ai/instructions/orchestrator-pattern/principles.md .kimi/steering/orchestrator-pattern.md
cp .ai/instructions/orchestrator-pattern/principles.md .kiro/steering/orchestrator-pattern.md
# Claude SKILL.md needs frontmatter — do not blind-copy. Replace body only.

# Claude SKILL.md and Kiro SKILL.md need CLI-specific frontmatter — do not blind-copy.
# Keep the existing frontmatter + provenance comments, then replace the body below
# with the current contents of principles.md (Claude) or examples.md (Kiro).
```

### PowerShell

```powershell
Copy-Item .ai/instructions/karpathy-guidelines/principles.md .kimi/steering/karpathy-guidelines.md
Copy-Item .ai/instructions/karpathy-guidelines/principles.md .kiro/steering/karpathy-guidelines.md
Copy-Item .ai/instructions/karpathy-guidelines/examples.md   .kimi/resource/karpathy-guidelines-examples.md
Copy-Item .ai/instructions/karpathy-guidelines/examples.md   .claude/skills/karpathy-guidelines/EXAMPLES.md
# orchestrator-pattern
Copy-Item .ai/instructions/orchestrator-pattern/principles.md .kimi/steering/orchestrator-pattern.md
Copy-Item .ai/instructions/orchestrator-pattern/principles.md .kiro/steering/orchestrator-pattern.md
# (Kiro SKILL.md has a frontmatter header and is regenerated manually — see .ai/cli-map.md)
```

## Adding a new instruction

1. Create `.ai/instructions/<name>/principles.md` (required) and `examples.md` (optional).
2. Decide which CLIs need it, and for each CLI whether it's steering (always loaded)
   or resource/on-demand.
3. Add rows to the map above.
4. Run the matching copy commands.
5. For Claude Code skills, also create `.claude/skills/<name>/SKILL.md` with frontmatter:

   ```
   ---
   name: <name>
   description: <specific trigger description — Claude uses this to decide when to load>
   ---
   ```

   followed by the `principles.md` body. The `description` field matters — it determines
   when Claude auto-activates the skill.

## Project-agnostic install (use this framework in another project)

```bash
# From inside this project, targeting another project at <target>:
cp -R .ai CLAUDE.md .claude .kimi .kiro <target>/

# Reset the activity log in the target so it starts empty:
printf '# Activity Log\n\nNewest entries at the top. Each CLI prepends before finishing substantive work.\n\n---\n\n' > <target>/.ai/activity/log.md
```

The CLIs in `<target>` will auto-discover their native folders on next launch; the AI
contract text inside each points at the freshly copied `.ai/` (relative paths, so it
works wherever the project is placed).

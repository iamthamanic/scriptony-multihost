# ECC Runner queue state

Canonical skill: `~/.cursor/skills/ecc-runner/SKILL.md`

## Modes

| Command | Behavior |
|---------|----------|
| `@ecc-runner` | Batch — full pipeline per issue |
| `ecc-runner continue` | Resume batch |
| `ecc-runner step` | One phase only |
| `ecc-runner status` | Snapshot only |

## Scripts

```bash
export ECC_RUNNER_ROOT="${HOME}/.cursor/skills/ecc-runner"
bash "${ECC_RUNNER_ROOT}/scripts/sync-queue-to-state.sh"
```

## Intake → Runner

1. `@feature-intake` → review `.qa/intake/<epic>-issues.md`
2. User: „Issues anlegen“ → `create-github-issues.sh`
3. `@ecc-runner`

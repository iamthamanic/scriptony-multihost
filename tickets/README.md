# Tickets

This folder is reserved for **active feature branches / implementation tickets**.

## Rules

1. Create a new sub-folder for each ticket: `tickets/TICKET-123-short-name/`
2. Each ticket folder should contain:
   - `README.md` – ticket description, acceptance criteria
   - `SMOKE_TEST.md` – how to verify after deployment
   - Implementation scripts / diagrams if needed
3. **When a ticket is merged / closed:**
   - Move documentation to `docs/archive/`
   - Move scripts to `scripts/` or `tools/`
   - Delete the ticket folder
   - Do not leave stale ticket folders in this directory

## Do NOT put here:

- Source code (belongs to `src/` or `functions/`)
- Database schemas (belongs to `infra/appwrite/collections/`)
- Build artefacts (`*.zip`, `*.js` bundles) – use `tools/*/dist/`
- Long-lived documentation – use `docs/`

## Template

```bash
mkdir -p tickets/TICKET-NNN-my-feature
cat > tickets/TICKET-NNN-my-feature/README.md <<'EOF'
# TICKET-NNN: My Feature

## Scope
Describe what this ticket implements.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Verification
How to test after merge.
EOF
```

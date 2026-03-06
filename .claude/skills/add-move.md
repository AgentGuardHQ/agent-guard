# Skill: Add Move

Add a new move to `data/moves.json`. If the user provides a full specification, validate and add it. If they provide only a concept, generate a proposal.

## Steps

### 1. Gather Information

Ask the user for (or generate from their concept):
- **name** — display name in PascalCase (e.g., "CoreDump")
- **power** — integer, 1-20 (typical range: 6-12)
- **type** — one of: frontend, backend, devops, testing, architecture, security, ai

The **id** is auto-derived: lowercase name with no spaces (e.g., "coredump").

### 2. Validate

Read `data/moves.json` and `data/types.json`, then check:
- ID does not already exist in moves.json
- Power is 1-20 (hard limit from `validate-data.mjs`)
- Power is ideally 4-14 (soft guideline — warn if outside)
- Type exists in `types.json`

### 3. Add to moves.json

Add the new entry to `data/moves.json` following the single-line format:
```json
{ "id": "<id>", "name": "<Name>", "power": <power>, "type": "<type>" }
```

Place it in the section grouped by type (moves are organized by type in the file).

### 4. Validate

Run `node .github/scripts/validate-data.mjs` and `npm test`.

### 5. Suggest Next Steps

- Assign this move to a BugMon by editing their `moves` array in `monsters.json`
- Run `/update-docs` to sync the Move Ideas Backlog in ROADMAP.md

# Skill: Add Evolution Chain

Create a complete evolution chain: evolved BugMon entries in `monsters.json` and the chain definition in `evolutions.json`.

## Steps

### 1. Gather Information

Ask the user for:
- **Base BugMon** — must already exist in `data/monsters.json`
- **Evolved form name(s)** — can be a 2-stage (base → evolved) or 3-stage chain
- **Trigger conditions** — which developer activity event and count for each evolution

Valid trigger events (from `evolutions.json`): `commits`, `prs_merged`, `bugs_fixed`, `tests_passing`, `refactors`, `code_reviews`, `conflicts_resolved`, `ci_passes`, `deploys`, `docs_written`

### 2. Create Evolved BugMon

For each evolved form that does not yet exist in `monsters.json`, create a full entry:
- **Rarity**: `"evolved"`
- **Stats**: Higher than the base form (typically +5-10 HP, +2-3 ATK/DEF/SPD)
- **Type**: Same as the base (or different if thematically appropriate — confirm with user)
- **Moves**: Can include base form moves plus new ones; all must exist in `moves.json`
- **ID**: Next available integer
- All other required fields follow the `/add-bugmon` schema

### 3. Update Base BugMon

In `data/monsters.json`, update the base BugMon's fields:
- `"evolution": "<EvolvedFormName>"`
- `"evolvesTo": <evolved_form_id>`

For 3-stage chains, also update the middle-stage BugMon's `evolution` and `evolvesTo`.

### 4. Add Chain to evolutions.json

Add a new chain entry to the `chains` array in `data/evolutions.json`:
```json
{
  "id": "<snake_case_chain_name>",
  "name": "<Display Name Evolution>",
  "stages": [
    { "monsterId": <base_id>, "name": "<BaseName>" },
    { "monsterId": <evolved_id>, "name": "<EvolvedName>" }
  ],
  "triggers": [
    {
      "from": <base_id>,
      "to": <evolved_id>,
      "condition": { "event": "<event_name>", "count": <number> },
      "description": "<Human-readable description>"
    }
  ]
}
```

### 5. Validate

Run `node .github/scripts/validate-data.mjs` and `npm test`.

### 6. Suggest Next Steps

- Run `/balance-check` with the evolved form to verify it isn't overpowered
- Run `/update-docs` to sync the Evolution Chains table in ROADMAP.md
- Note that 64x64 PNG sprites are needed for each new evolved form in `sprites/`

# Skill: Add BugMon

Guided creation of a new BugMon. If the user provides a full specification, validate and add it. If they provide only a concept (e.g., "a BugMon based on memory leaks"), generate a complete proposal for their approval.

## Steps

### 1. Gather Information

Ask the user for (or generate from their concept):
- **name** — PascalCase (e.g., "BufferOverflow")
- **type** — one of: frontend, backend, devops, testing, architecture, security, ai
- **hp** — integer, 1-100 (typical range: 25-45)
- **attack** — integer, 1-20 (typical range: 5-12)
- **defense** — integer, 1-20 (typical range: 3-10)
- **speed** — integer, 1-20 (typical range: 4-10)
- **moves** — array of 3 move IDs from `data/moves.json`
- **color** — hex color string
- **rarity** — one of: common, uncommon, legendary, evolved
- **theme** — short thematic description
- **description** — detailed visual/personality description
- **errorPatterns** (optional) — array of real error message strings this bug represents
- **fixTip** (optional) — developer advice for fixing this type of bug
- **evolution** (optional) — name of evolved form
- **evolvesTo** (optional) — ID of evolved form

### 2. Validate Before Writing

Read `data/monsters.json`, `data/moves.json`, and `data/types.json`, then check:
- Name is PascalCase and unique (not already in monsters.json)
- Type is valid (exists in `types.json`)
- Stats are within hard limits: HP 1-100, ATK/DEF/SPD 1-20
- Stat total (HP + ATK + DEF + SPD) is ideally in the 40-55 range — warn if outside but don't block
- All 3 moves exist in `moves.json` and are distinct
- All 3 moves should ideally match the BugMon's type — warn if they don't but allow it
- Rarity is valid
- ID = max existing ID + 1
- Sprite field = lowercase name (no spaces)

### 3. Add to monsters.json

Add the new entry to `data/monsters.json` following the exact field order of existing entries:
```json
{
  "id": <next_id>,
  "name": "<Name>",
  "type": "<type>",
  "hp": <hp>,
  "attack": <atk>,
  "defense": <def>,
  "speed": <spd>,
  "moves": ["<move1>", "<move2>", "<move3>"],
  "color": "<#hex>",
  "sprite": "<lowercase_name>",
  "rarity": "<rarity>",
  "theme": "<theme>",
  "evolution": "<EvolvedName>" or null,
  "evolvesTo": <evolved_id> or null,
  "passive": null,
  "description": "<description>",
  "errorPatterns": ["<pattern1>", ...] or omit if none,
  "fixTip": "<tip>" or omit if none
}
```

### 4. Validate

Run `node .github/scripts/validate-data.mjs` to confirm the data passes validation.
Run `npm test` to confirm tests pass.

### 5. Suggest Next Steps

- Run `/balance-check` with the new BugMon name to test battle performance
- Run `/update-docs` to sync documentation with the new roster
- If this BugMon should evolve, run `/add-evolution` to set up the chain
- Note that a 64x64 PNG sprite should be added to `sprites/<lowercase_name>.png` (the game will use a colored rectangle fallback until the sprite exists)

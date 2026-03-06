# Skill: Roster Report

Generate a comprehensive overview of the current BugMon roster, moves, and type coverage. Use this to understand the current state of game content and identify gaps.

## Steps

### 1. Read Data Files

Read all data files:
- `data/monsters.json`
- `data/moves.json`
- `data/types.json`
- `data/evolutions.json`

### 2. Generate Report

Produce a formatted report with these sections:

**Roster Summary**
- Total BugMon count
- Breakdown by type (table: type → count)
- Breakdown by rarity (table: rarity → count)

**Move Summary**
- Total move count
- Breakdown by type (table: type → count)
- Power range: min, max, average

**Type Coverage**
- Which types have the most/fewest BugMon
- Which types have the most/fewest moves
- Flag types with fewer than 3 BugMon or fewer than 5 moves

**Evolution Chains**
- Total chain count
- List of chains with stages (base → evolved)
- BugMon that can evolve but have no chain defined in evolutions.json
- BugMon with `rarity: "evolved"` that aren't part of any chain

**Stat Distribution**
- Average and range of HP, ATK, DEF, SPD across the roster
- Identify stat outliers (more than 1.5x the average in any stat)

**Sprite Coverage**
- Check which `sprites/<name>.png` files exist vs which BugMon reference them
- List BugMon that are missing sprites (will use color fallback)

### 3. Highlight Gaps

At the end, provide a "Content Gaps" section listing:
- Types that need more BugMon
- Types that need more moves
- BugMon without evolution chains that could have them
- Any other balance or coverage concerns

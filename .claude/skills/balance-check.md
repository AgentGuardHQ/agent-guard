# Skill: Balance Check

Run battle simulations and produce a balance analysis report. Use this after adding or modifying BugMon to verify game balance.

## Usage

The user may provide:
- A specific BugMon name — run that BugMon against the full roster
- `--all` or no argument — run a full roster round-robin
- Two BugMon names — run a specific 1v1 matchup

## Steps

### 1. Run Simulations

**Specific BugMon vs full roster:**
```bash
npm run simulate -- <Name> --all --runs 100
```
If `--all` flag isn't supported for single-BugMon mode, run individual matchups against each opponent:
```bash
npm run simulate -- <Name> <Opponent> --runs 1000
```

**Full roster round-robin:**
```bash
npm run simulate -- --all --runs 100
```

**Specific matchup:**
```bash
npm run simulate -- <Name1> <Name2> --runs 1000
```

### 2. Analyze Results

Parse the simulator output and identify:
- **Overpowered**: BugMon with overall win rate > 65%
- **Underpowered**: BugMon with overall win rate < 35%
- **Swingy matchups**: Individual matchups with > 80% or < 20% win rate that aren't explained by type advantage
- **Type balance**: Whether any type dominates across the board

### 3. Report

Present a formatted report with:
- Win rate summary (table format)
- Flagged outliers with specific concerns
- Suggested stat adjustments (e.g., "StackOverflow wins 72% — consider reducing attack from 9 to 7")
- Comparison to roster average if checking a specific BugMon

### 4. Suggest Next Steps

If adjustments are needed:
- Edit the BugMon's stats in `data/monsters.json`
- Re-run this skill to verify the adjustment worked
- Run `/validate-data` after any changes

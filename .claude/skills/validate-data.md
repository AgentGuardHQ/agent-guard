# Skill: Validate Data

Run all data validation checks and report results. Use this after any changes to data files in `data/`.

## Steps

### 1. Structural Validation

Run the built-in data validator:
```bash
node .github/scripts/validate-data.mjs
```

This checks:
- JSON parse validity for monsters.json, moves.json, types.json
- Type effectiveness chart completeness (all type pairs, values are 0.5/1.0/1.5)
- Move fields: id, name, power (1-20), valid type
- Monster fields: id, name, valid type, stats in range (HP 1-100, ATK/DEF/SPD 1-20), moves exist
- No duplicate IDs or names

### 2. Test Suite

Run the full test suite:
```bash
npm test
```

### 3. Cross-Reference Check

Manually verify these relationships that the validator doesn't catch:
- Every BugMon with `evolvesTo` set to a non-null value — that target ID must exist in `monsters.json`
- Every evolution chain in `evolutions.json` — all `monsterId` values in stages must exist in `monsters.json`
- Every evolution trigger's `from` and `to` IDs must exist in `monsters.json`
- No orphaned evolution data (BugMon claims to evolve into something that has no chain entry)

### 4. Report

If all checks pass, display:
- Monster count, move count, type count, evolution chain count
- Confirmation that all cross-references are valid

If errors are found:
- Group errors by file
- Provide specific suggested fixes for each error
- Do NOT auto-fix — present the issues and let the user decide

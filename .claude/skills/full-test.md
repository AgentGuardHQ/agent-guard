# Skill: Full Test

Run the complete test, validation, and balance verification suite. This is the comprehensive "is everything OK?" check.

## Steps

Run these in sequence. If any step fails, stop and analyze before proceeding.

### 1. Unit Tests
```bash
npm test
```
Report pass/fail count and any failures.

### 2. Data Validation
```bash
node .github/scripts/validate-data.mjs
```
Report validation result (monster/move/type counts on success, errors on failure).

### 3. Balance Smoke Test
```bash
npm run simulate -- --all --runs 50
```
Quick round-robin to catch any severely broken matchups. Flag any BugMon with win rate > 75% or < 25%.

### 4. Summary

Provide a one-line pass/fail summary:
- **All clear**: "All tests passed, data valid, balance OK (N monsters, M moves, T types)"
- **Issues found**: "Tests: X pass / Y fail | Data: valid/invalid | Balance: N outliers"

List any specific issues that need attention.

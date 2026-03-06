# Test Coverage Analysis

## Current State: Zero Test Coverage

The BugMon codebase has **12 source modules and 0 test files**. There is no test framework configured (no `package.json`, no Jest/Vitest/Mocha). The only automated validation is the `validate-data.mjs` CI script that checks JSON data integrity on PRs — but it doesn't test any code logic.

## Priority Areas for Adding Tests

Each module is analyzed for **testability** (can it be tested without a browser/DOM?) and **risk** (how much would a bug here hurt the game?).

---

### 1. `battle/damage.js` — Highest priority, easiest win

Pure function with zero DOM/browser dependencies. Core combat formula — a bug here silently breaks game balance.

**What to test:**
- Base damage formula: `power + attack - floor(defense/2) + random(1-3)`
- Type effectiveness multiplier application (0.5x, 1.0x, 1.5x)
- Minimum 1 damage guarantee (edge case: very high defense, low power)
- Graceful fallback when `typeChart` is `null`/undefined
- Graceful fallback when `move.type` or `defender.type` is missing
- Edge case: effectiveness makes damage go to 0 or negative (should clamp to 1)

---

### 2. `engine/state.js` — Easy win, trivial to test

Pure state machine with no dependencies.

**What to test:**
- `getState()` returns initial state (`EXPLORE`)
- `setState()` / `getState()` round-trip for all states
- `STATES` object has all expected keys

---

### 3. `world/map.js` — High priority, pure logic

Tile queries and bounds checking are core to movement.

**What to test:**
- `getTile(x, y)` returns correct tile values from map data
- Out-of-bounds coordinates (negative, beyond width/height) return `1` (wall)
- `isWalkable()` returns `true` for ground (0) and grass (2), `false` for wall (1)
- `isWalkable()` returns `false` for out-of-bounds coordinates
- `getMap()` returns `null` before loading, map data after

---

### 4. `world/encounters.js` — Medium priority, important game mechanic

**What to test:**
- Returns `null` for non-grass tiles (0, 1)
- Returns `null` 90% of the time on grass (tile 2) — mock `Math.random`
- Returned monster is a copy with `currentHP` set to `hp`
- Handles empty `monstersData` gracefully (currently crashes — potential bug)

---

### 5. `battle/battleEngine.js` — Highest risk, most complex

Most complex module (200 lines) with the most branching logic. Requires mocking several imports.

**What to test:**
- `startBattle()` initializes battle state correctly
- Turn order: player goes first when `speed >= enemy`, enemy first otherwise
- `attemptCapture()` probability: ~10% at full HP, ~60% at 1 HP
- Captured monster gets added to player's party
- Failed capture triggers enemy counter-attack
- Player mon HP syncs back to party after battle ends
- Player mon heals to full on faint
- Message timer countdown and `nextAction` callback execution
- Menu navigation bounds (0–2 for main menu, 0–moveCount-1 for fight menu)
- Running away ends the battle and returns to `EXPLORE` state

---

### 6. `engine/transition.js` — Medium priority

**What to test:**
- `startTransition()` initializes phase 0
- `updateTransition()` advances through all 7 phases
- Returns `null` during transition, returns the wild monster when done
- Flash sounds play at correct phase transitions

---

### 7. `world/player.js` — Medium priority

**What to test:**
- Movement cooldown prevents moves within 150ms
- Direction updates on arrow key press
- Collision detection prevents walking into walls
- Returns tile value when movement succeeds, `null` otherwise
- Player doesn't move diagonally (else-if chain)

---

### 8. `engine/input.js` — Lower priority (browser-dependent)

**What to test:**
- `simulatePress` / `simulateRelease` / `isDown` / `wasPressed` logic
- `clearJustPressed()` resets just-pressed state
- A key held down doesn't re-trigger `justPressed`

---

### 9. Rendering modules — Lowest priority

`renderer.js`, `tiles.js`, `sprites.js` are heavily DOM/Canvas-dependent. Better covered by visual/integration testing.

---

## Potential Bugs Found

1. **`encounters.js:18`** — If `monstersData` is empty, `monstersData[Math.floor(Math.random() * 0)]` returns `undefined`, and the spread `...template` will crash. No guard for empty data.
2. **`battleEngine.js:143`** — If the enemy has a move ID not found in `movesData`, `move` will be `undefined` and `doAttack` will crash trying to read `move.name`. No null check.
3. **`battleEngine.js:87-88`** — Same issue for player moves — `movesData.find()` has a guard (`if (move)`), but the enemy path at line 143 does not.

---

## Recommended Testing Setup

1. **Add a minimal `package.json`** with only dev dependencies for testing
2. **Use Vitest** — fast, ESM-native (matches the project's ES module style), zero-config
3. **Structure**: create a `tests/` directory mirroring `battle/`, `world/`, `engine/` structure
4. **CI integration**: add a test step to the `validate.yml` workflow

---

## Summary Table

| Module | Priority | Testability | Key Risk |
|--------|----------|-------------|----------|
| `battle/damage.js` | **Critical** | Easy (pure) | Broken combat math |
| `engine/state.js` | High | Easy (pure) | State corruption |
| `world/map.js` | High | Easy (pure) | Walk through walls / stuck |
| `world/encounters.js` | High | Moderate | Crash on empty data, wrong rates |
| `battle/battleEngine.js` | **Critical** | Hard (many deps) | Entire battle system breaks |
| `engine/transition.js` | Medium | Moderate | Stuck transitions |
| `world/player.js` | Medium | Moderate | Movement bugs |
| `engine/input.js` | Lower | Hard (needs DOM) | Input not registering |
| `sprites/*`, `renderer.js` | Low | Hard (Canvas) | Visual only |

**Recommended starting point:** Tests for `damage.js`, `state.js`, and `map.js` — pure functions with no dependencies covering the most critical game logic.

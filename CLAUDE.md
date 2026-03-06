# CLAUDE.md — AI Assistant Guide for BugMon

## Project Overview

BugMon is a Pokémon-style monster-taming RPG browser game themed around software bugs. Players explore a tile-based world, encounter wild "BugMon" (creatures named after programming bugs like NullPointer, MergeConflict, StackOverflow), battle them with turn-based combat, and catch them for their party. BugMon evolve based on real developer activity (commits, PRs merged, bugs fixed) instead of XP grinding.

**Key characteristics:**
- 100% client-side, zero external dependencies
- Vanilla JavaScript (ES6 modules), HTML5 Canvas 2D, Web Audio API
- No build tools, no bundler, no framework
- Deployed to GitHub Pages
- Community BugMon submissions via GitHub Issues + automated validation

## Quick Start

No build step required. Serve with any static file server:

```bash
npm run serve
# or: python3 -m http.server
# Then open http://localhost:8000
```

## Project Structure

```
BugMon/
├── index.html              # Entry point (canvas, inline CSS, touch controls)
├── game.js                 # Game loop orchestration (entry point for JS)
├── simulate.js             # Battle simulator CLI (node simulate.js)
├── package.json            # Node.js config for scripts
│
├── engine/                 # Core framework systems
│   ├── state.js            # Game state machine (EXPLORE, BATTLE_TRANSITION, BATTLE, MENU)
│   ├── input.js            # Unified keyboard + touch input
│   ├── renderer.js         # Canvas 2D drawing
│   ├── transition.js       # Battle transition animation
│   ├── entities.js         # Lightweight entity model (BugMon, Player, NPC, Item)
│   └── events.js           # EventBus for decoupled communication between systems
│
├── world/                  # Overworld / exploration
│   ├── map.js              # Map data, tile queries, collision
│   ├── player.js           # Player state, movement, party
│   └── encounters.js       # Random wild encounter logic (10% in tall grass)
│
├── battle/                 # Combat systems
│   ├── battle-core.js      # Pure battle engine (no UI/audio/DOM) — two APIs
│   ├── battleEngine.js     # UI-connected battle state machine
│   └── damage.js           # Damage calculation formula
│
├── evolution/              # Evolution system
│   ├── evolution.js        # Checks conditions, triggers evolutions
│   ├── tracker.js          # Dev activity tracker (localStorage + .events.json)
│   └── animation.js        # Evolution visual sequence (flash, morph, reveal)
│
├── audio/                  # Sound synthesis (no audio files)
│   └── sound.js            # Web Audio API synthesized effects
│
├── sprites/                # Pixel art and rendering
│   ├── sprites.js          # Image loader with preload/fallback
│   ├── tiles.js            # Procedural tile texture generation
│   └── *.png               # 64x64 battle sprites, 32x32 player sprites
│
├── data/                   # Game content (JSON, data-driven)
│   ├── monsters.json       # 30 BugMon definitions (stats, moves, types, evolutions)
│   ├── moves.json          # Move definitions
│   ├── types.json          # 7 types + effectiveness chart
│   ├── evolutions.json     # Evolution chains with dev-activity triggers
│   └── map.json            # 15x10 tile grid
│
├── simulation/             # Legacy headless battle simulation
│   ├── cli.js              # CLI entry point (seeded RNG version)
│   └── ...                 # Supporting modules
│
├── hooks/                  # Git hooks for dev activity tracking
│   ├── post-commit         # Increments commit counter in .events.json
│   └── post-merge          # Increments merge counter in .events.json
│
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml          # GitHub Pages auto-deploy on push to main
│   │   ├── validate-bugmon.yml # Validates community BugMon submissions
│   │   └── approve-bugmon.yml  # Auto-adds approved BugMon to game data
│   ├── scripts/
│   │   ├── validate-submission.cjs  # Parses + validates issue form data
│   │   ├── battle-preview.cjs       # Generates battle preview for submissions
│   │   └── generate-bugmon.cjs      # Generates BugMon JSON from approved issue
│   └── ISSUE_TEMPLATE/
│       └── new-bugmon.yml      # Issue form for community BugMon submissions
│
├── ARCHITECTURE.md         # Detailed technical architecture
├── ROADMAP.md              # Milestone planning and feature backlog
└── README.md               # User-facing guide
```

## Development Commands

```bash
# Serve locally
npm run serve

# Run battle simulation (random matchup, verbose)
npm run simulate

# Specific matchup
npm run simulate -- NullPointer Deadlock

# Statistical analysis
npm run simulate -- NullPointer Deadlock --runs 1000

# Full roster round-robin
npm run simulate -- --all

# Legacy simulation (seeded RNG)
npm run simulate:quick   # 1,000 battles
npm run simulate:full    # 50,000 battles
```

## Architecture & Key Patterns

### ES6 Modules
All source uses ES6 `import`/`export`. No CommonJS, no bundler. Browser loads `game.js` as a module via `<script type="module">`. GitHub scripts use `.cjs` extension for CommonJS (Node.js workflow context).

### Data Injection via Setters
JSON data files are loaded asynchronously with `fetch()` in `game.js`, then passed to modules through setter functions:
```js
// In game.js
const monsters = await fetch('data/monsters.json').then(r => r.json());
setMonstersData(monsters);
```
Do NOT import JSON directly in modules — always receive data through the existing setter pattern.

### Event Bus
`engine/events.js` provides a decoupled pub/sub system for cross-module communication:
```js
import { eventBus, Events } from './events.js';
eventBus.on(Events.BUGMON_FAINTED, (data) => { ... });
eventBus.emit(Events.BUGMON_FAINTED, { name: 'NullPointer' });
```

### Entity System
`engine/entities.js` provides lightweight entity factories (`createBugMon`, `createPlayer`, `createNPC`, `createItem`) with auto-incrementing IDs.

### Game State Machine
Defined in `engine/state.js`. Four states:
- **EXPLORE** — grid-based overworld movement
- **BATTLE_TRANSITION** — flash + fade animation (860ms)
- **BATTLE** — turn-based combat with menu system
- **MENU** — settings/party management (future)

### Battle System
Two battle APIs coexist in `battle/battle-core.js`:
1. **Original API** (`executeTurn`, `simulateBattle`) — used by `simulate.js` and `battleEngine.js`
2. **Spec-based API** (`resolveTurn`, `createPureBattleState`) — fully immutable, PP tracking, accuracy

Turn order: faster BugMon goes first (ties: player wins). Battle uses a message queue pattern with callbacks for action chaining.

### Damage Formula
```
damage = (power + attack - floor(defense / 2) + random(1-3)) * typeMultiplier
```
Type multipliers: 0.5x (not effective), 1.0x (neutral), 1.5x (super effective).

### Evolution System
BugMon evolve based on real developer activity tracked via git hooks and localStorage:
- `evolution/tracker.js` — tracks events (commits, PRs merged, bugs fixed, etc.)
- `evolution/evolution.js` — checks if conditions are met for evolution
- `evolution/animation.js` — renders the evolution visual sequence
- `data/evolutions.json` — defines evolution chains and trigger conditions
- `hooks/post-commit` / `hooks/post-merge` — write to `.events.json` for the tracker

### Sprite System
PNG sprites are preloaded at startup. If a sprite fails to load, a colored rectangle fallback is rendered. Tile textures are procedurally generated at runtime (no tile image files).

## Coding Conventions

- **camelCase** for functions and variables
- **UPPER_SNAKE_CASE** for constants (e.g., `STATES`, `TILE`, `Events`)
- **const/let** only, no `var`
- Arrow functions preferred
- No external dependencies — keep it zero-dependency
- `imageSmoothingEnabled = false` on canvas for crisp pixel art
- All audio is synthesized at runtime via Web Audio API (no audio files)
- Try-catch around AudioContext creation (browser compatibility)
- Console.error for startup failures, null checks for optional data

## Data Formats

### monsters.json
```json
{ "id": 1, "name": "NullPointer", "type": "backend",
  "hp": 30, "attack": 8, "defense": 4, "speed": 6,
  "moves": ["segfault", "unhandledexception", "memoryaccess"],
  "color": "#e74c3c", "sprite": "nullpointer",
  "rarity": "common", "theme": "runtime error",
  "evolution": "OptionalChaining", "evolvesTo": 21,
  "passive": null, "description": "..." }
```
Rarities: `common`, `uncommon`, `legendary`, `evolved`.

### moves.json
```json
{ "id": "segfault", "name": "SegFault", "power": 10, "type": "backend" }
```

### types.json
7 types: `frontend`, `backend`, `devops`, `testing`, `architecture`, `security`, `ai`. Effectiveness chart is a nested object mapping attacker type → defender type → multiplier.

### evolutions.json
Defines evolution chains with dev-activity triggers:
```json
{ "id": "callback_chain", "name": "Async Evolution",
  "stages": [{ "monsterId": 2, "name": "CallbackHell" }, ...],
  "triggers": [{ "from": 2, "to": 23,
    "condition": { "event": "commits", "count": 10 },
    "description": "Make 10 commits" }] }
```

### map.json
`{ "width": 15, "height": 10, "tiles": [[...], ...] }` — tile values: 0=ground, 1=wall, 2=grass.

## CI/CD

- **Deploy**: GitHub Pages auto-deploy on push to `main` or `master` (`.github/workflows/deploy.yml`). No build step.
- **BugMon Submissions**: Community can submit new BugMon via GitHub Issue template. `validate-bugmon.yml` auto-validates and previews. `approve-bugmon.yml` auto-adds approved submissions to game data.

## Testing

No formal test framework. Validation is done through:
1. **Manual browser testing** — open in browser, play the game
2. **Battle simulation CLI** (`npm run simulate -- --all --runs 100`) — round-robin roster analysis to verify balance

## When Adding New Content

### New BugMon
1. Add entry to `data/monsters.json` following existing schema (include `rarity`, `theme`, `passive`, `evolution` fields)
2. Add 64x64 PNG sprite to `sprites/` (filename matches `sprite` field)
3. Ensure moves referenced exist in `data/moves.json`
4. If it has an evolution, add the evolved form and update `data/evolutions.json`
5. Run simulation to verify balance: `npm run simulate -- --all`

### New Moves
1. Add entry to `data/moves.json` following existing schema
2. Ensure the move's `type` exists in `data/types.json`

### New Evolution Chain
1. Add chain to `data/evolutions.json` with stages and trigger conditions
2. Add evolved BugMon entries to `data/monsters.json` with `rarity: "evolved"` and `evolvedFrom` field
3. Set `evolvesTo` on the base BugMon pointing to the evolved form's ID

### New Map Tiles
1. Add tile type constant and collision logic in `world/map.js`
2. Add procedural texture generation in `sprites/tiles.js`
3. Update `data/map.json` with new tile values

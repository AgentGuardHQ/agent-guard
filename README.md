# BugMon

**Developer monsters battling in a type-safe ecosystem.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Play Now](https://img.shields.io/badge/Play-GitHub%20Pages-orange.svg)](https://jpleva91.github.io/BugMon/)
[![Size](https://img.shields.io/badge/gzipped-~21_KB-brightgreen.svg)](LIGHTWEIGHT.md)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](LIGHTWEIGHT.md)

> The Pokémon game developers deserve.

A monster-taming RPG where the monsters are software bugs, the types are programming domains, and your real coding activity drives your monsters' evolution. Commit code, your BugMon evolve. Merge a PR, unlock new forms. Fix bugs, encounter rare creatures.

Built with zero dependencies, pure vanilla JS, and way too many puns.

**[Play Now](https://jpleva91.github.io/BugMon/)**

<p align="center">
  <img src="sprites/nullpointer.png" width="64" alt="NullPointer">
  <img src="sprites/racecondition.png" width="64" alt="RaceCondition">
  <img src="sprites/memoryleak.png" width="64" alt="MemoryLeak">
  <img src="sprites/deadlock.png" width="64" alt="Deadlock">
  <img src="sprites/offbyone.png" width="64" alt="OffByOne">
  <img src="sprites/mergeconflict.png" width="64" alt="MergeConflict">
  <img src="sprites/callbackhell.png" width="64" alt="CallbackHell">
  <img src="sprites/heisenbug.png" width="64" alt="Heisenbug">
</p>

## CLI Debugging Tool

BugMon also works as a CLI that wraps your dev commands and turns real errors into monster encounters:

```bash
bugmon watch -- npm run dev
bugmon watch -- node server.js
bugmon dex                      # View your BugDex
bugmon stats                    # View your bug hunter level and XP
```

Errors pass through unchanged — BugMon augments, never hides.

## Add a BugMon in Under 2 Minutes

BugMon is data-driven. Add a new monster by editing a single JSON file -- no code changes needed:

```json
{
  "id": 31,
  "name": "YourBugName",
  "type": "frontend",
  "hp": 30, "attack": 7, "defense": 5, "speed": 6,
  "moves": ["layoutshift", "zindexwar"],
  "color": "#3498db",
  "sprite": "yourbugname"
}
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## Features

- **30 BugMon** across 7 types with evolutions
- **Dev-activity evolution** — your commits, PRs, and bug fixes trigger monster evolutions via git hooks
- **CLI companion** — battle simulator, BugDex, and real-time sync between terminal and browser
- Turn-based combat with speed priority, type effectiveness, and critical hits
- Tile-based exploration with random encounters in tall grass
- Cache mechanic with HP-based probability
- Synthesized sound effects (Web Audio API)
- Mobile touch controls (D-pad + A/B buttons)
- **Zero dependencies** -- vanilla JS, HTML5 Canvas, no build step ([see the Lightweight Manifesto](LIGHTWEIGHT.md))

## How to Play

Walk through the world and step into tall grass to encounter wild BugMon.

### Controls

| Action | Keyboard | Mobile |
|--------|----------|--------|
| Move | Arrow keys | D-pad |
| Confirm | Enter | A button |
| Back | Escape | B button |

### Battle Options

- **Fight** -- Pick a move. Faster BugMon acts first.
- **Capture** -- Lower HP = higher catch chance. Failed capture = enemy gets a free turn.
- **Run** -- Always succeeds.

## Type System

7 types with effectiveness matchups:

| | Front | Back | DevOps | Test | Arch | Sec | AI |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Frontend** | -- | **1.5x** | 1x | **1.5x** | 0.5x | 1x | 0.5x |
| **Backend** | 0.5x | -- | **1.5x** | 1x | **1.5x** | 0.5x | 1x |
| **DevOps** | 1x | 0.5x | -- | **1.5x** | 1x | **1.5x** | 0.5x |
| **Testing** | 0.5x | 1x | 0.5x | -- | **1.5x** | 1x | **1.5x** |
| **Architecture** | **1.5x** | 0.5x | 1x | 0.5x | -- | **1.5x** | 1x |
| **Security** | 1x | **1.5x** | 0.5x | 1x | 0.5x | -- | **1.5x** |
| **AI** | **1.5x** | 1x | **1.5x** | 0.5x | 1x | 0.5x | -- |

## Contribute a BugMon

No coding required! Submit your own BugMon in 4 steps:

1. [Open a new BugMon submission](../../issues/new?template=new-bugmon.yml)
2. Fill out the form with your BugMon's name, type, stats, and moves
3. A bot will validate your submission and show a battle preview
4. Once approved by a maintainer, your BugMon joins the game!

See the [issue template](../../issues/new?template=new-bugmon.yml) to get started.

## Run Locally

```bash
git clone https://github.com/jpleva91/BugMon.git
cd BugMon
python3 -m http.server
# Open http://localhost:8000
```

Any static file server works. No build step, no `npm install`, no bundler.

## Architecture

```
BugMon/
├── game.js              # Game loop and orchestration
├── engine/              # State machine, input, rendering, transitions
├── battle/              # Turn-based battle engine + damage calc
├── world/               # Map, player, encounters
├── data/                # JSON content (monsters, moves, types, map)
├── audio/               # Synthesized sound effects (Web Audio API)
├── sprites/             # Pixel art sprites + procedural tile textures
└── cli/                 # CLI debugging tool
    ├── bin.js           # Entry point
    ├── core/            # Error & stacktrace parsers
    ├── monsters/        # Error → monster matching
    ├── bugdex/          # BugDex persistence
    ├── ui/              # Terminal renderer (ANSI)
    └── adapters/        # CLI watch adapter
```

All game content (monsters, moves, types) is defined in JSON and loaded at runtime. The engine never hardcodes game data. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical breakdown.

## Contributing

We welcome contributions! The easiest way to contribute is adding new BugMon or moves -- it only takes a JSON edit.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Tech Stack

- Vanilla JavaScript (ES6 modules)
- HTML5 Canvas 2D
- Web Audio API (synthesized sounds)
- Zero dependencies, zero build tools

## License

MIT

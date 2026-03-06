# BugMon

**Developer monsters battling in a type-safe ecosystem.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Play Now](https://img.shields.io/badge/Play-GitHub%20Pages-orange.svg)](https://jpleva91.github.io/BugMon/)

> The Pokémon game developers deserve.

A monster-taming RPG where the monsters are software bugs, the types are programming domains, and every battle is a debugging session. Built with zero dependencies, pure vanilla JS, and way too many puns.

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

## Add a BugMon in Under 2 Minutes

BugMon is data-driven. Add a new monster by editing a single JSON file -- no code changes needed:

```json
{
  "id": 21,
  "name": "YourBugName",
  "type": "frontend",
  "hp": 30, "attack": 7, "defense": 5, "speed": 6,
  "moves": ["cacheinvalidation", "hotfix"],
  "color": "#3498db",
  "sprite": "yourbugname"
}
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## Features

- **20 unique BugMon** to discover and capture
- **8 types** -- Memory, Logic, Runtime, Syntax, Frontend, Backend, DevOps, Testing
- **25 moves** across all eight types with effectiveness matchups
- Turn-based combat with speed priority and damage calculation
- Tile-based exploration with random encounters in tall grass
- Capture mechanic with HP-based probability
- Pixel art sprites with procedural fallbacks
- Synthesized sound effects (Web Audio API)
- Mobile touch controls (D-pad + A/B buttons)
- **Zero dependencies** -- vanilla JS, HTML5 Canvas, no build step

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

8 types organized in two interlocking effectiveness cycles:

**Bug types:** Memory > Runtime > Logic > Syntax > Memory

**Dev types:** Frontend > Backend > DevOps > Testing > Frontend

Each type also has cross-cycle matchups. Full chart:

| | Mem | Log | Run | Syn | Front | Back | DevOps | Test |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Memory** | -- | 1x | **1.5x** | 0.5x | **1.5x** | 0.5x | 1x | 1x |
| **Logic** | 1x | -- | 0.5x | **1.5x** | 1x | 1x | **1.5x** | 0.5x |
| **Runtime** | 0.5x | **1.5x** | -- | 1x | 0.5x | 1x | 1x | **1.5x** |
| **Syntax** | **1.5x** | 0.5x | 1x | -- | 1x | **1.5x** | 0.5x | 1x |
| **Frontend** | 0.5x | 1x | **1.5x** | 1x | -- | 0.5x | **1.5x** | 1x |
| **Backend** | **1.5x** | 1x | 1x | 0.5x | **1.5x** | -- | 1x | 0.5x |
| **DevOps** | 1x | 0.5x | 1x | **1.5x** | 0.5x | 1x | -- | **1.5x** |
| **Testing** | 1x | **1.5x** | 0.5x | 1x | 1x | **1.5x** | 0.5x | -- |

<details>
<summary><strong>BugMon Roster (20 total)</strong></summary>

| Name | Type | HP | ATK | DEF | SPD | Moves |
|------|------|---:|----:|----:|----:|-------|
| **NullPointer** | Memory | 30 | 8 | 4 | 6 | SegFault, Hotfix |
| **RaceCondition** | Logic | 25 | 6 | 3 | 10 | ThreadLock, Hotfix |
| **MemoryLeak** | Memory | 40 | 5 | 6 | 3 | GarbageCollect, MemoryDump |
| **Deadlock** | Logic | 35 | 7 | 8 | 2 | Mutex, ForceQuit |
| **OffByOne** | Logic | 28 | 7 | 5 | 7 | NullCheck, Rollback |
| **MergeConflict** | Syntax | 32 | 6 | 7 | 4 | Refactor, PatchDeploy |
| **CallbackHell** | Runtime | 27 | 9 | 3 | 8 | HotReload, BlueScreen |
| **Heisenbug** | Logic | 26 | 7 | 4 | 9 | NullCheck, TypeMismatch |
| **InfiniteLoop** | Runtime | 45 | 4 | 5 | 1 | CoreDump, HotReload |
| **SpaghettiCode** | Syntax | 33 | 8 | 5 | 3 | Refactor, Compile |
| **StackOverflow** | Runtime | 30 | 9 | 4 | 6 | BufferOverrun, BlueScreen |
| **IndexOutOfBounds** | Memory | 28 | 8 | 3 | 8 | BufferOverrun, SegFault |
| **CSSFloat** | Frontend | 29 | 6 | 4 | 9 | CacheInvalidation, Hotfix |
| **404NotFound** | Frontend | 24 | 5 | 5 | 10 | DOMManipulation, NullCheck |
| **DeprecatedAPI** | Backend | 38 | 7 | 7 | 2 | SQLInjection, APITimeout |
| **BrokenPipe** | Backend | 30 | 8 | 4 | 7 | APITimeout, MemoryDump |
| **GitBlame** | DevOps | 31 | 6 | 6 | 5 | DockerKill, PipelineFailure |
| **ForkBomb** | DevOps | 22 | 10 | 2 | 9 | PipelineFailure, ForceQuit |
| **UnhandledPromise** | Testing | 27 | 5 | 7 | 6 | AssertionError, MockOverride |
| **RegexDenial** | Testing | 34 | 8 | 5 | 4 | AssertionError, ThreadLock |

</details>

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
└── sprites/             # Pixel art sprites + procedural tile textures
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

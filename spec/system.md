# System Specification

BugMon is a roguelike developer telemetry game. It monitors software bugs and converts them into interactive encounters.

## Core Event Flow

```
watcher detects failure (stderr, CI output, agent action)
↓
ingestion pipeline: parse → fingerprint → classify → map
↓
canonical event emitted (e.g., ERROR_OBSERVED)
↓
game engine spawns BugMon enemy
↓
developer fixes the bug
↓
BugMon enemy defeated → recorded in Bug Grimoire
```

## Gameplay Model

- Coding sessions are dungeon **runs**
- Bugs are **enemies** with stats derived from error severity
- CI failures are **bosses** requiring active engagement
- Minor errors (severity 1-2) **auto-resolve** in idle mode
- Severe errors (severity 3+) require **player interaction**
- The Bug Grimoire records defeated enemy types (compendium, not collection)

## Two-Layer System

| Layer | Role | Produces |
|-------|------|----------|
| **AgentGuard** | Governance runtime — evaluates agent actions against policies | Policy violation events |
| **BugMon** | Roguelike game — renders events as interactive encounters | Gameplay state |

Both layers share the **canonical event model** as their architectural spine.

## Technical Constraints

- 100% client-side browser game, zero runtime dependencies
- Vanilla JavaScript (ES6 modules), HTML5 Canvas 2D, Web Audio API
- All audio synthesized at runtime (no audio files)
- Deployed to GitHub Pages

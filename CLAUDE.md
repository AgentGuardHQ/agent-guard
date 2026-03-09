# CLAUDE.md — AI Assistant Guide

## Project Overview

**AgentGuard** is a **governed action runtime for AI coding agents**. It intercepts agent tool calls, enforces policies and invariants, executes authorized actions via adapters, and emits lifecycle events. The Action is the primary unit of computation.

- **AgentGuard** (active focus) — The governed action kernel. Intercepts agent tool calls (Claude Code hooks), evaluates against policies and invariants, executes via adapters, emits canonical events. CLI commands: `guard`, `inspect`, `events`.
- **BugMon** (deprioritized) — A gamified visualization mode that can consume governance events as roguelike encounters. Functional but not under active development.

The system has one architectural spine: the **canonical event model**. All system activity becomes events. The kernel produces governance events. Subscribers (TUI renderer, JSONL sink, CLI inspect) consume them.

**Key characteristics:**
- Governed action kernel: propose → normalize → evaluate → execute → emit
- 6 built-in invariants (secret exposure, protected branches, blast radius, test-before-push, no force push, lockfile integrity)
- YAML/JSON policy format with pattern matching, scopes, and branch conditions
- Escalation tracking: NORMAL → ELEVATED → HIGH → LOCKDOWN
- JSONL event persistence for audit trail and replay
- Claude Code adapter for PreToolUse/PostToolUse hooks
- TypeScript source (`src/`), compiled to `dist/` via tsc + esbuild
- CLI has runtime dependencies (`chokidar`, `commander`, `pino`)
- Build tooling: tsc + esbuild + terser + vitest (dev dependencies only)
- Layered architecture: `src/agentguard/` (kernel + governance), `src/domain/` (pure logic), `src/core/` (shared), `src/cli/` (CLI), `src/game/` (browser, deprioritized), `ecosystem/data/` (game content, deprioritized)

## Quick Start

```bash
npm run build:ts     # Compile TypeScript → dist/

# Governance runtime
echo '{"tool":"Bash","command":"git push origin main"}' | npx agentguard guard --dry-run
npx agentguard guard --policy agentguard.yaml   # Start runtime with policy
npx agentguard inspect --last                   # Inspect most recent run
npx agentguard events --last                    # Show raw event stream

# BugMon mode (deprioritized)
npm run serve        # Runs scripts/dev-server.js (zero deps, live reload)
# Then open http://localhost:8000
```

## Project Structure

TypeScript in `src/` is the **single source of truth**. It compiles to `dist/` via `tsc` (individual modules) + `esbuild` (CLI and game bundles). All tests and scripts import from `dist/`.

```
BugMon/
├── index.html              # Entry point (canvas, inline CSS, touch controls)
├── simulate.js             # Battle simulator CLI (node simulate.js)
├── package.json            # Node.js config for scripts
│
├── src/                    # TypeScript source (single source of truth)
│   ├── cli/                # Commander-based CLI (agentguard command)
│   │   ├── bin.ts          # CLI entry point
│   │   ├── index.ts        # CLI exports
│   │   └── commands/       # CLI subcommands (watch, scan, demo, etc.)
│   ├── core/               # Shared logic (EventBus, BugEngine, BugRegistry)
│   │   ├── event-bus.ts    # Universal EventBus (generic, typed)
│   │   ├── bug-event.ts    # Bug event definitions and severity mapping
│   │   ├── error-parser.ts # Error message parser (40+ patterns)
│   │   ├── stacktrace-parser.ts # Stack trace analysis
│   │   ├── matcher.ts      # Error → BugMon enemy matching
│   │   ├── types.ts        # Shared TypeScript type definitions
│   │   └── sources/        # Event source adapters
│   ├── game/               # Browser roguelike (client-side)
│   │   ├── game.ts         # Game entry point (auto-init, data loading)
│   │   ├── engine/         # Core framework (state, input, renderer, events)
│   │   ├── world/          # Dungeon (map, player, encounters)
│   │   ├── battle/         # Combat (battle-engine, damage, battle-core)
│   │   ├── evolution/      # Progression (tracker, animation)
│   │   ├── audio/          # Sound synthesis (Web Audio API)
│   │   ├── sync/           # Save/sync (localStorage, WebSocket)
│   │   └── sprites/        # Pixel art (procedural gen + PNG sprites)
│   ├── domain/             # Pure domain logic (no DOM, no Node.js APIs)
│   │   ├── battle.ts       # Pure battle engine (deterministic with injected RNG)
│   │   ├── encounters.ts   # Encounter trigger checks with rarity weights
│   │   ├── events.ts       # Canonical domain event definitions
│   │   ├── evolution.ts    # Progression condition checking
│   │   ├── source-registry.ts # Event source plugin registry
│   │   ├── contracts.ts    # Module contract registry
│   │   ├── shapes.ts       # Runtime shape definitions
│   │   ├── ingestion/      # Error ingestion pipeline
│   │   └── pipeline/       # Multi-agent pipeline orchestration
│   ├── agentguard/         # Governance runtime (ACTIVE FOCUS)
│   │   ├── kernel.ts       # Governed action kernel (orchestrator)
│   │   ├── monitor.ts      # Runtime monitor (escalation tracking)
│   │   ├── core/           # AAB + RTA engine
│   │   ├── policies/       # Policy evaluator + JSON/YAML loaders
│   │   ├── invariants/     # Invariant checker + 6 defaults
│   │   ├── evidence/       # Evidence pack generation
│   │   ├── adapters/       # Execution adapters (file, shell, git, claude-code)
│   │   ├── renderers/      # TUI renderer (terminal action stream)
│   │   └── sinks/          # JSONL event persistence
│   ├── ecosystem/          # Game content modules (deprioritized)
│   ├── watchers/           # Environment watchers (console, test, build)
│   └── ai/                 # AI integration interface
│
├── dist/                   # Compiled output (tsc + esbuild)
│   ├── cli/                # Bundled CLI (esbuild)
│   ├── game/               # Bundled game + sprites (esbuild + tsc)
│   ├── core/               # Individual modules (tsc)
│   ├── domain/             # Individual modules (tsc)
│   ├── agentguard/         # Individual modules (tsc)
│   └── ecosystem/          # Individual modules (tsc)
│
├── ecosystem/data/         # Game content (JSON source + inlined JS modules)
│   ├── monsters.json       # 34 BugMon enemy definitions
│   ├── moves.json          # 76 move definitions
│   ├── types.json          # 7 types + effectiveness chart
│   ├── evolutions.json     # Progression chains
│   ├── map.json            # 15x10 tile grid
│   └── *.js                # Inlined JS modules (generated by sync-data)
│
├── simulation/             # Headless battle simulation
│   ├── cli.js              # CLI entry (--battles, --compare flags)
│   ├── simulator.js        # Round-robin matchup orchestrator
│   ├── headlessBattle.js   # Headless battle runner (no UI)
│   ├── strategies.js       # AI battle strategies
│   ├── rng.js              # Seeded RNG for reproducible sims
│   └── report.js           # Statistical report generation
├── tests/                  # Test suite (77 JS + 16 TS test files)
│   ├── run.js              # Custom test runner (JS tests import from dist/)
│   ├── *.test.js           # JavaScript tests
│   └── ts/                 # TypeScript tests (run via vitest)
├── scripts/                # Build tooling
├── spec/                   # Artifact-first development specs
├── policy/                 # Policy configuration (JSON)
│   ├── action_rules.json   # Agent action validation rules
│   └── capabilities.json   # Agent capability boundaries
├── docs/                   # System documentation
├── hooks/                  # Git hooks for dev activity tracking
│   ├── post-commit         # Logs commit events to .events.json
│   └── post-merge          # Logs merge events to .events.json
└── .github/                # CI/CD workflows and issue templates
    ├── workflows/          # 8 GitHub Actions workflows
    ├── ISSUE_TEMPLATE/     # 4 community submission templates
    └── scripts/            # Validation & generation utilities
```

## Development Commands

```bash
# TypeScript build (required before running tests or CLI)
npm run build:ts           # Build TypeScript (tsc + esbuild → dist/)
npm run ts:check           # Type-check TypeScript (tsc --noEmit)

# Run tests
npm test                   # Run JS tests (1085 tests)
npm run ts:test            # Run TypeScript tests (345 tests, vitest)
npm run ts:test:watch      # Run TypeScript tests in watch mode
npm run test:coverage      # Run with coverage (c8, 50% line threshold)

# Code quality
npm run lint             # Run ESLint
npm run lint:fix         # Run ESLint with auto-fix
npm run format           # Check formatting (Prettier)
npm run format:fix       # Fix formatting (Prettier)
npm run contracts:check  # Verify module contracts

# Run AgentGuard CLI
npm run dev

# BugMon game (deprioritized)
npm run serve            # Dev server for browser game
npm run simulate         # Battle simulation
npm run build            # Full build with inline sprites
npm run sync-data        # Sync JSON data → JS modules
npm run budget           # Check size budget compliance
```

## Architecture & Key Patterns

### Governed Action Kernel (Primary)
The kernel loop is the core of AgentGuard. Every agent action passes through it:
1. Agent proposes action (Claude Code tool call → `RawAgentAction`)
2. AAB normalizes intent (tool → action type, detect git/destructive commands)
3. Policy evaluator matches rules (deny/allow with scopes, branches, limits)
4. Invariant checker verifies system state (6 defaults)
5. If allowed: execute via adapter (file/shell/git handlers)
6. Emit lifecycle events: `ACTION_REQUESTED` → `ACTION_ALLOWED/DENIED` → `ACTION_EXECUTED/FAILED`
7. Sink all events to JSONL for audit trail

Key files: `agentguard/kernel.ts`, `agentguard/core/aab.ts`, `agentguard/core/engine.ts`, `agentguard/monitor.ts`
See `docs/unified-architecture.md` for the full model.

### Layered Architecture
All source lives in `src/`, compiled to `dist/`. The codebase is organized into layers:
- **src/agentguard/** — Governed action kernel, policies, invariants, adapters, renderers, sinks. **Active focus.**
- **src/domain/** — Pure domain logic with no DOM or Node.js-specific APIs. Actions, events, reference monitor, adapter registry, governance primitives. All functions are pure and deterministic.
- **src/core/** — Shared logic (EventBus, types, error parsing). Used by all layers.
- **src/cli/** — CLI entry point and commands. Runs in Node.js only.
- **src/game/** — Browser roguelike. **Deprioritized.** Runs in the browser only.
- **ecosystem/data/** — Game content. **Deprioritized.** JSON source of truth + inlined JS modules.

### CLI Commands
- `agentguard guard` — Start the governed action runtime (policy + invariant enforcement)
- `agentguard guard --policy <file>` — Use a specific policy file (YAML or JSON)
- `agentguard guard --dry-run` — Evaluate without executing actions
- `agentguard inspect [runId]` — Show action graph for a run
- `agentguard events [runId]` — Show raw event stream for a run
- `agentguard watch -- <cmd>` — Monitor a command for errors
- `agentguard play` / `agentguard demo` — BugMon mode (deprioritized)

### Domain Layer
The `src/domain/` layer provides environment-agnostic logic:
- **`src/domain/actions.ts`** — 23 canonical action types across 8 classes
- **`src/domain/events.ts`** — 50+ canonical event kinds, factory, validation
- **`src/domain/reference-monitor.ts`** — Action authorization with decision trail
- **`src/domain/execution/adapters.ts`** — Adapter registry (action class → handler mapping)
- **`src/core/event-bus.ts`** — Generic typed EventBus
- **`src/domain/event-store.ts`** — Event persistence interface
- **`src/domain/ingestion/`** — Error ingestion pipeline
- **`src/domain/pipeline/`** — Multi-agent pipeline orchestration

### BugMon Game Layer (Deprioritized)
The game layer remains functional but is not under active development:
- Battle engine, encounters, progression (`domain/battle.ts`, `domain/encounters.ts`)
- Browser game: Canvas 2D, synthesized audio, sprites (`game/`)
- Game content: 31 BugMon, 72 moves, 7 evolution chains (`ecosystem/data/`)

### Build & Module System
TypeScript source compiles via `tsc` (individual modules for tests/imports) + `esbuild` (bundles for CLI and browser game). Browser loads `dist/game/game.js` as a module via `<script type="module">`.

### Data as Inlined JS Modules
Game data lives in `ecosystem/data/` as both JSON (source of truth) and JS modules (imported by the game). To regenerate JS modules from JSON: `npm run sync-data`

### Battle System (Deprioritized)
Turn order: faster combatant goes first (ties: player wins). Damage formula:
```
damage = (power + attack - floor(defense / 2) + random(1-3)) * typeMultiplier
```
Type multipliers: 0.5x (not effective), 1.0x (neutral), 1.5x (super effective).

## Coding Conventions

- **camelCase** for functions and variables
- **UPPER_SNAKE_CASE** for constants (e.g., `STATES`, `TILE`, `Events`)
- **const/let** only, no `var`
- Arrow functions preferred
- No external dependencies in browser game code — CLI may use runtime deps (`chokidar`, `commander`, `pino`)
- `imageSmoothingEnabled = false` on canvas for crisp pixel art
- All audio is synthesized at runtime via Web Audio API (no audio files)
- **ESLint** enforced via `eslint.config.js` (flat config): `no-var`, `prefer-const`, `eqeqeq`, `no-undef`
- **Prettier** enforced via `.prettierrc` for consistent formatting
- Run `npm run lint` and `npm run format` before committing
- Node.js ≥18 required (`engines` field in `package.json`)

### Configuration

**TypeScript** (`tsconfig.json`):
- Target: ES2022, Module: ESNext, ModuleResolution: bundler
- Strict mode enabled, plus `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- `verbatimModuleSyntax: true` — use `import type` for type-only imports
- Source: `src/`, Output: `dist/`, with declarations and source maps

**Prettier** (`.prettierrc`):
- Single quotes, trailing commas (es5), printWidth 100, tabWidth 2, semicolons

**ESLint** (`eslint.config.js`):
- Flat config with `typescript-eslint` recommended rules
- Key rules: `no-var`, `prefer-const`, `eqeqeq`, `no-undef`, `@typescript-eslint/no-explicit-any: warn`

## Artifact-First Development

When implementing new features or systems, agents must produce structured artifacts before writing code. This enforces staged reasoning and produces more consistent, architecturally sound implementations.

### The Pipeline

```
prompt → spec artifact → interface contract → implementation → verification
```

Never skip directly to implementation. Each stage constrains the next.

### Artifact Types

| Artifact | Location | Purpose |
|----------|----------|---------|
| System spec | `spec/system.md` | Defines system boundaries, invariants, constraints |
| Feature spec | `spec/features/<name>.md` | Requirements, events produced/consumed, dependencies |
| Interface contract | `spec/interfaces/<name>.md` | Module exports, types, anti-dependencies |
| Templates | `spec/TEMPLATE-feature.md`, `spec/TEMPLATE-interface.md` | Starting point for new artifacts |

### Workflow for New Features

1. **Spec first**: Copy `spec/TEMPLATE-feature.md` to `spec/features/<name>.md`. Fill in requirements, events, interface contract, layer placement, and constraints.
2. **Interface definition**: If the feature introduces a new module, copy `spec/TEMPLATE-interface.md` to `spec/interfaces/<name>.md`. Define exports, types, invariants, and anti-dependencies.
3. **Review**: Verify the spec is consistent with `spec/system.md` invariants and the canonical event model in `src/domain/events.ts`.
4. **Implement**: Write code that fulfills the spec. The spec constrains naming, API surface, layer placement, and event usage.
5. **Verify**: Run tests. Confirm the implementation matches the interface contract.

### Contracts & Shapes

When to use:
- Any new module in `src/domain/` MUST have a contract entry in `src/domain/contracts.ts`
- Any new pipeline stage MUST define input/output shapes in `src/domain/shapes.ts`
- Any new data format in `ecosystem/data/` MUST have a validation function (see `src/ecosystem/bugdex-spec.ts`)

When NOT to use:
- Bug fixes to existing modules (unless they change the interface)
- Internal helper functions (only exported APIs need contracts)
- Sprite/asset additions

Key files:
- `src/domain/shapes.ts` — Runtime shape definitions with `validateShape()` and `assertShape()`
- `src/domain/contracts.ts` — Module contract registry with `validateContract()`
- `scripts/check-contracts.js` — Verifies all modules match their contracts (`npm run contracts:check`)

### Rules

- Feature specs must list all events produced and consumed
- Interface contracts must declare anti-dependencies (what the module must NOT import)
- Domain layer modules must remain pure — no DOM, no Node.js APIs
- Specs are living documents — update them when implementations evolve

## Data Formats (BugMon — Deprioritized)

### monsters.json
```json
{ "id": 1, "name": "NullPointer", "type": "backend",
  "hp": 30, "attack": 8, "defense": 4, "speed": 6,
  "moves": ["segfault", "unhandledexception", "memoryaccess"],
  "color": "#e74c3c", "sprite": "nullpointer",
  "rarity": "common", "theme": "runtime error",
  "passive": null, "description": "..." }
```

### moves.json
```json
{ "id": "segfault", "name": "SegFault", "power": 10, "type": "backend" }
```

### types.json
7 types: `frontend`, `backend`, `devops`, `testing`, `architecture`, `security`, `ai`. Effectiveness chart is a nested object mapping attacker type → defender type → multiplier.

### evolutions.json
```json
{ "id": "callback_chain", "name": "Async Evolution",
  "stages": [{ "monsterId": 2, "name": "CallbackHell" }, ...],
  "triggers": [{ "from": 2, "to": 23,
    "condition": { "event": "commits", "count": 10 },
    "description": "Make 10 commits" }] }
```

## Size Budget (BugMon — Deprioritized)

- **Main bundle**: 10 KB target / 17 KB cap (gzipped, built with `--no-sprites`)
- **Subsystem caps** (raw bytes): engine (7.5 KB), rendering (15.5 KB), battle (14.5 KB), data (13.2 KB), game-logic (19.5 KB), infrastructure (7 KB)

## Testing

```bash
npm test                               # Run JS tests (1085 tests, import from dist/)
npm run ts:test                        # Run TypeScript tests (345 tests, vitest)
npm run test:coverage                  # Run with coverage (c8, 50% line threshold)
```

## CI/CD & Automation

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `validate.yml` | PR touching `ecosystem/data/**` | Validates game data JSON schema |
| `validate-bugmon.yml` | Issue opened/edited with `bugmon-submission` label | Validates community BugMon enemy submissions |
| `approve-bugmon.yml` | Issue labeled `approved` + `bugmon-submission` | Auto-generates PR to merge approved submissions |
| `size-check.yml` | PR (ignoring docs/markdown) | Runs linting and size budget checks |
| `deploy.yml` | Push to `main`/`master` | Deploys compiled game to GitHub Pages |
| `publish.yml` | GitHub Release published | Publishes npm package |
| `release.yml` | Push to `main`/`master` | Auto-generates release PRs via release-please |
| `codeql.yml` | PR to `main`/`master` + weekly schedule | CodeQL security analysis |

### Community Submissions

Community members can submit new BugMon enemies and moves via GitHub Issues using structured templates:
- `new-bugmon.yml` — Submit a new enemy (name, type, stats, moves, description)
- `new-move.yml` — Submit a new move (name, power, type)
- `balance-report.yml` — Report balance issues with existing enemies/moves
- `bug-report.yml` — Standard bug report

Submissions are validated automatically by `.github/scripts/validate-submission.cjs`, previewed with `.github/scripts/battle-preview.cjs`, and generated into data entries by `.github/scripts/generate-bugmon.cjs`.

## When Adding New Content (BugMon — Deprioritized)

### New BugMon Enemy
1. Add entry to `ecosystem/data/monsters.json` following existing schema
2. Add 64x64 PNG sprite to `src/game/sprites/` (filename matches `sprite` field)
3. Ensure moves referenced exist in `ecosystem/data/moves.json`
4. If it has a progression chain, update `ecosystem/data/evolutions.json`
5. Run `npm run sync-data` to regenerate JS modules from JSON
6. Run simulation to verify balance: `npm run simulate -- --all`

### New Moves
1. Add entry to `ecosystem/data/moves.json` following existing schema
2. Ensure the move's `type` exists in `ecosystem/data/types.json`
3. Run `npm run sync-data` to regenerate JS modules

### New Progression Chain
1. Add chain to `ecosystem/data/evolutions.json` with stages and trigger conditions
2. Add evolved BugMon entries to `ecosystem/data/monsters.json` with `rarity: "evolved"`
3. Run `npm run sync-data` to regenerate JS modules

# CLAUDE.md — AI Assistant Guide

## Project Overview

**AgentGuard** is a **governed action runtime for AI coding agents**. It intercepts agent tool calls, enforces policies and invariants, executes authorized actions via adapters, and emits lifecycle events. The Action is the primary unit of computation.

The system has one architectural spine: the **canonical event model**. All system activity becomes events. The kernel produces governance events. Subscribers (TUI renderer, JSONL sink, CLI inspect) consume them.

**Key characteristics:**
- Governed action kernel: propose → normalize → evaluate → execute → emit
- 8 built-in invariants (secret exposure, protected branches, blast radius, test-before-push, no force push, no skill modification, no scheduled task modification, lockfile integrity)
- YAML/JSON policy format with pattern matching, scopes, and branch conditions
- Escalation tracking: NORMAL → ELEVATED → HIGH → LOCKDOWN
- JSONL event persistence for audit trail and replay
- Claude Code adapter for PreToolUse/PostToolUse hooks
- TypeScript source (`src/`), compiled to `dist/` via tsc + esbuild
- CLI has runtime dependencies (`chokidar`, `commander`, `pino`); optional `better-sqlite3` for SQLite storage backend
- Build tooling: tsc + esbuild + vitest (dev dependencies only)

## Quick Start

```bash
npm run build:ts     # Compile TypeScript → dist/

# Governance runtime
echo '{"tool":"Bash","command":"git push origin main"}' | npx agentguard guard --dry-run
npx agentguard guard --policy agentguard.yaml   # Start runtime with policy
npx agentguard inspect --last                   # Inspect most recent run
npx agentguard events --last                    # Show raw event stream
```

## Project Structure

TypeScript in `src/` is the **single source of truth**. It compiles to `dist/` via `tsc` (individual modules) + `esbuild` (CLI bundle).

**Top-level documentation**: `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `agentguard.yaml` (default policy)

```
src/
├── kernel/                 # Governed action kernel
│   ├── kernel.ts           # Orchestrator (propose → evaluate → execute → emit)
│   ├── aab.ts              # Action Authorization Boundary (normalization)
│   ├── blast-radius.ts     # Weighted blast radius computation engine
│   ├── decision.ts         # Runtime assurance engine
│   ├── monitor.ts          # Escalation state machine
│   ├── evidence.ts         # Evidence pack generation
│   ├── replay-comparator.ts # Replay outcome comparison
│   ├── replay-engine.ts    # Deterministic replay engine
│   ├── replay-processor.ts # Replay event processor
│   ├── heartbeat.ts        # Agent heartbeat monitor
│   ├── decisions/          # Typed decision records
│   │   ├── factory.ts      # Decision record factory
│   │   └── types.ts        # Decision record type definitions
│   └── simulation/         # Pre-execution impact simulation
│       ├── filesystem-simulator.ts  # File system impact simulation
│       ├── git-simulator.ts         # Git operation simulation
│       ├── package-simulator.ts     # Package change simulation
│       ├── forecast.ts              # Impact forecast builder
│       ├── registry.ts              # Simulator registry
│       └── types.ts                 # Simulation type definitions
├── events/                 # Canonical event model
│   ├── schema.ts           # Event kinds, factory, validation
│   ├── bus.ts              # Generic typed EventBus
│   ├── store.ts            # In-memory event store
│   ├── jsonl.ts            # JSONL event persistence (audit trail)
│   └── decision-jsonl.ts   # Decision record persistence
├── policy/                 # Policy system
│   ├── composer.ts         # Policy composition (multi-file merging)
│   ├── evaluator.ts        # Rule matching engine
│   ├── loader.ts           # Policy validation + loading
│   ├── pack-loader.ts      # Policy pack loader (community policy sets)
│   └── yaml-loader.ts      # YAML policy parser
├── invariants/             # Invariant system
│   ├── definitions.ts      # 8 built-in invariant definitions
│   └── checker.ts          # Invariant evaluation engine
├── analytics/              # Cross-session violation analytics
│   ├── aggregator.ts       # Violation aggregation across sessions
│   ├── cluster.ts          # Violation clustering by dimension
│   ├── engine.ts           # Analytics engine orchestrator
│   ├── index.ts            # Module re-exports
│   ├── reporter.ts         # Output formatters (terminal, JSON, markdown)
│   ├── risk-scorer.ts      # Per-run risk scoring engine
│   ├── trends.ts           # Violation trend computation
│   └── types.ts            # Analytics type definitions
├── adapters/               # Execution adapters
│   ├── registry.ts         # Adapter registry (action class → handler)
│   ├── file.ts, shell.ts, git.ts  # Action handlers
│   └── claude-code.ts      # Claude Code hook adapter
├── cli/                    # CLI entry point + commands
│   ├── bin.ts              # CLI entry point
│   ├── args.ts             # Argument parsing utilities
│   ├── colors.ts           # Terminal color helpers
│   ├── tui.ts              # TUI renderer (terminal action stream)
│   ├── policy-resolver.ts  # Policy file discovery and resolution
│   ├── recorder.ts         # Event recording
│   ├── replay.ts           # Session replay logic
│   ├── session-store.ts    # Session management
│   ├── file-event-store.ts # File-based event persistence
│   ├── evidence-summary.ts # Evidence summary generator for PR reports
│   └── commands/           # analytics, guard, inspect, replay, export, import, simulate, ci-check, plugin, policy, claude-hook, claude-init, init, diff, evidence-pr
├── plugins/                # Plugin ecosystem
│   ├── discovery.ts        # Plugin discovery mechanism
│   ├── registry.ts         # Plugin registry
│   ├── sandbox.ts          # Plugin sandboxing
│   ├── validator.ts        # Plugin validation
│   ├── types.ts            # Plugin type definitions
│   └── index.ts            # Module re-exports
├── renderers/              # Renderer plugin system
│   ├── registry.ts         # Renderer registry
│   ├── tui-renderer.ts     # TUI renderer implementation
│   ├── types.ts            # Renderer type definitions
│   └── index.ts            # Module re-exports
├── storage/                # SQLite storage backend (opt-in)
│   ├── factory.ts          # Storage bundle factory
│   ├── index.ts            # Module re-exports
│   ├── migrations.ts       # Schema migrations (version-based)
│   ├── sqlite-analytics.ts # SQLite-backed analytics queries
│   ├── sqlite-sink.ts      # SQLite event/decision sink
│   ├── sqlite-store.ts     # SQLite event store implementation
│   └── types.ts            # Storage type definitions
├── telemetry/              # Runtime telemetry
│   ├── index.ts            # Module re-exports
│   ├── runtimeLogger.ts    # Runtime logging implementation
│   ├── tracepoint.ts       # Kernel-level tracepoint interface
│   ├── tracer.ts           # Tracepoint execution engine
│   └── types.ts            # Telemetry type definitions
└── core/                   # Shared utilities
    ├── types.ts            # Shared TypeScript type definitions
    ├── actions.ts          # 23 canonical action types across 8 classes
    ├── hash.ts             # Content hashing utilities
    ├── adapters.ts         # Adapter registry interface
    ├── rng.ts              # Seeded random number generator
    └── execution-log/      # Execution audit log
        ├── bridge.ts       # Bridge between event systems
        ├── event-log.ts    # Event logging
        ├── event-projections.ts # Event projections
        ├── event-schema.ts # Event schema definitions
        └── index.ts        # Module re-exports

vscode-extension/              # VS Code extension
├── src/
│   ├── extension.ts           # Extension entry point (sidebar panels, file watcher)
│   ├── providers/             # Tree data providers (run status, run history, recent events)
│   └── services/              # Event reader, notification formatter, notification service, diagnostics service, violation mapper
├── package.json               # Extension manifest (activation, views, configuration)
└── tsconfig.json              # Extension TypeScript config

tests/
├── *.test.js               # 14 JS test files (custom zero-dependency harness)
└── ts/*.test.ts            # 73 TS test files (vitest)
policy/                     # Policy configuration (JSON: action_rules, capabilities)
policies/                   # Policy packs (YAML: ci-safe, enterprise, open-source, strict)
docs/                       # System documentation (architecture, event model, specs)
hooks/                      # Git hooks (post-commit, post-merge)
examples/                   # Example governance scenarios and error demos
scripts/                    # Build and utility scripts
spec/                       # Feature specifications and templates
```

## Development Commands

```bash
# TypeScript build (required before running tests or CLI)
npm run build:ts           # Build TypeScript (tsc + esbuild → dist/)
npm run ts:check           # Type-check TypeScript (tsc --noEmit)

# Run tests
npm test                   # Run JS tests
npm run ts:test            # Run TypeScript tests (vitest)
npm run ts:test:watch      # Run TypeScript tests in watch mode
npm run test:coverage      # Run with coverage (c8, 50% line threshold)

# Code quality
npm run lint               # Run ESLint
npm run lint:fix           # Run ESLint with auto-fix
npm run format             # Check formatting (Prettier)
npm run format:fix         # Fix formatting (Prettier)

# Run AgentGuard CLI
npm run dev
```

## Architecture & Key Patterns

### Governed Action Kernel
The kernel loop is the core of AgentGuard. Every agent action passes through it:
1. Agent proposes action (Claude Code tool call → `RawAgentAction`)
2. AAB normalizes intent (tool → action type, detect git/destructive commands)
3. Policy evaluator matches rules (deny/allow with scopes, branches, limits)
4. Invariant checker verifies system state (8 defaults)
5. If allowed: execute via adapter (file/shell/git handlers)
6. Emit lifecycle events: `ACTION_REQUESTED` → `ACTION_ALLOWED/DENIED` → `ACTION_EXECUTED/FAILED`
7. Sink all events to JSONL for audit trail

Key files: `kernel/kernel.ts`, `kernel/aab.ts`, `kernel/decision.ts`, `kernel/monitor.ts`
See `docs/unified-architecture.md` for the full model.

### Directory Layout
Each top-level directory maps to a single architectural concept:
- **src/analytics/** — Cross-session violation analytics (aggregation, clustering, trends, risk scoring, reporting)
- **src/kernel/** — Governed action kernel, escalation, evidence, decisions, simulation
- **src/events/** — Canonical event model (schema, bus, store, persistence)
- **src/policy/** — Policy evaluator + loaders (YAML/JSON, pack loader)
- **src/invariants/** — Invariant definitions + checker
- **src/adapters/** — Execution adapters (file, shell, git, claude-code)
- **src/plugins/** — Plugin ecosystem (discovery, registry, validation, sandboxing)
- **src/renderers/** — Renderer plugin system (registry, TUI renderer)
- **src/cli/** — CLI entry point and commands
- **src/core/** — Shared utilities (types, actions, hash, execution-log)
- **src/storage/** — SQLite storage backend (opt-in alternative to JSONL, indexed queries)
- **src/telemetry/** — Runtime telemetry and logging

### CLI Commands
- `agentguard analytics` — Analyze violation patterns across governance sessions
- `agentguard guard` — Start the governed action runtime (policy + invariant enforcement)
- `agentguard guard --policy <file>` — Use a specific policy file (YAML or JSON)
- `agentguard guard --dry-run` — Evaluate without executing actions
- `agentguard inspect [runId]` — Show action graph and decisions for a run
- `agentguard events [runId]` — Show raw event stream for a run
- `agentguard export <runId>` — Export a governance session to a portable JSONL file
- `agentguard import <file>` — Import a governance session from a portable JSONL file
- `agentguard replay` — Replay a governance session timeline
- `agentguard plugin list|install|remove|search` — Manage plugins
- `agentguard simulate <action-json>` — Simulate an action and display predicted impact without executing
- `agentguard ci-check <session-file>` — CI governance verification (check a session for violations)
- `agentguard policy validate <file>` — Validate a policy file (YAML/JSON)
- `agentguard claude-hook` — Handle Claude Code PreToolUse/PostToolUse hook events
- `agentguard claude-init` — Set up Claude Code hook integration
- `agentguard diff <run1> <run2>` — Compare two governance sessions side-by-side
- `agentguard evidence-pr` — Attach governance evidence summary to a pull request
- `agentguard init <type>` — Scaffold governance extensions (invariant, policy-pack, adapter, renderer, replay-processor)

### Event Model
The canonical event model is the architectural spine. Event kinds defined in `src/events/schema.ts`:
- **Governance**: `PolicyDenied`, `UnauthorizedAction`, `InvariantViolation`
- **Lifecycle**: `RunStarted`, `RunEnded`, `CheckpointReached`, `StateChanged`
- **Safety**: `BlastRadiusExceeded`, `MergeGuardFailure`, `EvidencePackGenerated`
- **Reference Monitor**: `ActionRequested`, `ActionAllowed`, `ActionDenied`, `ActionEscalated`, `ActionExecuted`, `ActionFailed`
- **Decision & Simulation**: `DecisionRecorded`, `SimulationCompleted`
- **Policy Composition**: `PolicyComposed`
- **Policy Traces**: `PolicyTraceRecorded`
- **Pipeline**: `PipelineStarted`, `StageCompleted`, `StageFailed`, `PipelineCompleted`, `PipelineFailed`, `FileScopeViolation`
- **Dev activity**: `FileSaved`, `TestCompleted`, `BuildCompleted`, `CommitCreated`, `CodeReviewed`, `DeployCompleted`, `LintCompleted`
- **Heartbeat**: `HeartbeatEmitted`, `HeartbeatMissed`, `AgentUnresponsive`
- **Battle lifecycle**: `ENCOUNTER_STARTED`, `MOVE_USED`, `DAMAGE_DEALT`, `HEALING_APPLIED`, `PASSIVE_ACTIVATED`, `BUGMON_FAINTED`, `CACHE_ATTEMPTED`, `CACHE_SUCCESS`, `BATTLE_ENDED`
- **Ingestion**: `ErrorObserved`, `BugClassified`, `ActivityRecorded`, `EvolutionTriggered`

### Action Classes & Types
23 canonical action types across 8 classes, defined in `src/core/actions.ts`:
- **file**: `file.read`, `file.write`, `file.delete`, `file.move`
- **test**: `test.run`, `test.run.unit`, `test.run.integration`
- **git**: `git.diff`, `git.commit`, `git.push`, `git.branch.create`, `git.branch.delete`, `git.checkout`, `git.reset`, `git.merge`
- **shell**: `shell.exec`
- **npm**: `npm.install`, `npm.script.run`, `npm.publish`
- **http**: `http.request`
- **deploy**: `deploy.trigger`
- **infra**: `infra.apply`, `infra.destroy`

### Build & Module System
TypeScript source compiles via `tsc` (individual modules for tests/imports) + `esbuild` (CLI bundle).

## Coding Conventions

- **camelCase** for functions and variables
- **UPPER_SNAKE_CASE** for constants
- **const/let** only, no `var`
- Arrow functions preferred
- **ESLint** enforced via `eslint.config.js` (flat config): `no-var`, `prefer-const`, `eqeqeq`, `no-undef`
- **Prettier** enforced via `.prettierrc` for consistent formatting
- Run `npm run lint` and `npm run format` before committing
- Node.js ≥18 required

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

## Testing

```bash
npm test                   # Run JS tests
npm run ts:test            # Run TypeScript tests (vitest)
npm run ts:test:watch      # Run TypeScript tests in watch mode
npm run test:coverage      # Run with coverage (c8, 50% line threshold)
```

**Test structure:**
- **JS tests** (`tests/*.test.js`): 14 files using a custom zero-dependency harness (`tests/run.js` with `node:assert`)
- **TypeScript tests** (`tests/ts/*.test.ts`): 73 files using vitest
- **Coverage areas**: adapters, analytics (including risk scorer), kernel (AAB, engine, monitor, blast radius, heartbeat, integration, e2e pipeline), CLI commands (args, guard, inspect, init, simulate, ci-check, claude-hook, claude-init, export/import, policy-validate, diff, evidence-pr), decision records, domain models, events, evidence packs, evidence summary, execution log, export-import roundtrip, impact forecast, invariants, JSONL persistence, notification formatter, plugins (discovery, registry, validation), policy evaluation (including composer, pack loader, policy packs, evaluation trace), renderers, replay (engine, comparator, processor), simulation, SQLite storage (analytics, commands, migrations, sink, store, factory), telemetry (including tracepoint), TUI renderer, violation mapper, VS Code event reader, YAML loading

## CI/CD & Automation

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `size-check.yml` | PR (ignoring docs/markdown) | Runs linting, type-checking, tests, and size checks |
| `publish.yml` | GitHub Release published | Validates version, runs tests, publishes npm package with provenance |
| `agentguard-governance.yml` | Reusable workflow (called from other repos) | CI governance verification for sessions |
| `codeql.yml` | PR to `main`/`master` + weekly schedule | CodeQL security analysis |

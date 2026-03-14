# Current Priorities

> Derived from [ROADMAP.md](../ROADMAP.md) — the single source of truth for technical roadmap.
> Last reconciled: 2026-03-14

## Active Phase: Editor Integrations + Reference Monitor Hardening

AgentGuard is a **governed action runtime for AI agents**. The kernel loop intercepts agent tool calls, enforces policies and invariants, executes via adapters, and emits lifecycle events.

### Completed Phases (0–4)

| Phase | Theme | Status |
|-------|-------|--------|
| Phase 0 | Architecture Clarity | STABLE |
| Phase 1 | Canonical Event Model | STABLE |
| Phase 2 | AgentGuard Governance Runtime | STABLE |
| Phase 3 | Event Persistence + Replay | STABLE |
| Phase 4 | Plugin Ecosystem | STABLE |

### In Progress

| Phase | Theme | Status | Key Remaining Items |
|-------|-------|--------|---------------------|
| Phase 5 | Editor Integrations | IN PROGRESS | JetBrains plugin, deep Claude Code integration |
| Phase 6 | Reference Monitor Hardening | NEXT | Default-deny unknown actions, PAUSE/ROLLBACK enforcement, governance self-modification invariant |
| Phase 6.5 | Invariant Expansion | NEXT | CI/CD config, network egress, large file write, Docker config, DB migration, permission escalation, env var, recursive ops |
| Phase 10 | Structured Storage Backend | IN PROGRESS | Migration v2, composite indexes, SQL-native analytics |

## What Is Implemented

### Governed Action Kernel (Production)
- **Kernel loop** (`src/kernel/kernel.ts`) — propose → AAB normalize → policy evaluate → invariant check → simulate → execute → emit
- **AAB reference monitor** (`src/kernel/aab.ts`) — 87 destructive command patterns, action normalization
- **Policy evaluator** (`src/policy/evaluator.ts`) — two-phase deny/allow, pattern matching, scopes, branch conditions
- **10 built-in invariants** (`src/invariants/definitions.ts`) — secret exposure, protected branches, blast radius, test-before-push, no force push, no skill modification, no scheduled task modification, credential file creation, package script injection, lockfile integrity
- **Escalation state machine** (`src/kernel/monitor.ts`) — NORMAL → ELEVATED → HIGH → LOCKDOWN
- **Blast radius computation** (`src/kernel/blast-radius.ts`) — weighted scoring engine
- **Evidence pack generation** (`src/kernel/evidence.ts`)
- **Decision record factory** (`src/kernel/decisions/factory.ts`)
- **Pre-execution simulation** (`src/kernel/simulation/`) — filesystem, git, package simulators + impact forecast

### Execution Adapters
- **File, shell, git handlers** (`src/adapters/file.ts`, `shell.ts`, `git.ts`)
- **Claude Code hook adapter** (`src/adapters/claude-code.ts`) — PreToolUse/PostToolUse integration

### Event Model (49 event kinds)
- **Event schema** (`src/events/schema.ts`) — governance, lifecycle, safety, reference monitor, decision, simulation, pipeline, dev activity, heartbeat events
- **EventBus** (`src/events/bus.ts`) — generic typed pub/sub
- **JSONL persistence** (`src/events/jsonl.ts`) — append-only audit trail
- **Decision record persistence** (`src/events/decision-jsonl.ts`)

### Cross-Session Analytics
- **Violation aggregation** (`src/analytics/aggregator.ts`)
- **Violation clustering** (`src/analytics/cluster.ts`)
- **Trend computation** (`src/analytics/trends.ts`)
- **Per-run risk scoring** (`src/analytics/risk-scorer.ts`)
- **Output formatters** (`src/analytics/reporter.ts`) — terminal, JSON, markdown

### Storage Backends
- **SQLite** (`src/storage/sqlite-*.ts`) — indexed queries, analytics, session lifecycle
- **Firestore** (`src/storage/firestore-*.ts`) — cloud-native governance data sharing
- **JSONL** (default) — streaming, human-readable

### Plugin Ecosystem
- **Plugin discovery, registry, validation, sandboxing** (`src/plugins/`)
- **Renderer plugin system** (`src/renderers/`)
- **Policy pack loader** (`src/policy/pack-loader.ts`)

### CLI (16 commands)
`guard`, `inspect`, `events`, `replay`, `export`, `import`, `simulate`, `ci-check`, `analytics`, `plugin`, `policy`, `claude-hook`, `claude-init`, `init`, `diff`, `evidence-pr`, `traces`

### Editor Integration
- **VS Code extension** (`vscode-extension/`) — sidebar panels, event reader, inline diagnostics, violation mapper

### Infrastructure
- 77 TypeScript tests (vitest) + 14 JavaScript tests
- TypeScript build: tsc + esbuild
- CI: size-check, publish, CodeQL, governance reusable workflow
- ESLint + Prettier enforced

## What Is Next

### Immediate Priority — Reference Monitor Hardening (Phase 6)
1. Default-deny unknown actions in policy evaluator (close last bypass vector)
2. Enforce PAUSE and ROLLBACK intervention types in kernel execution
3. Governance self-modification invariant (block agents from modifying governance config)

### Near-Term — Invariant Expansion (Phase 6.5)
4. CI/CD config modification invariant
5. Network egress governance invariant
6. Large single-file write invariant
7. Docker/container config modification invariant

### Mid-Term — Capability-Scoped Sessions (Phase 7)
8. RunManifest type with role and capability grants
9. Validate adapter calls against session capabilities
10. Shell adapter privilege profiles

## Autonomous SDLC Control Plane

AgentGuard runs a fully autonomous SDLC pipeline via 22+ scheduled Claude Code agents coordinated through `swarm-state.json`:

```
ROADMAP.md (human writes strategy)
    |
Planning Agent (daily 6 AM) -- ingests docs, derives phase, writes swarm-state.json
    |
Backlog Steward (daily 5 AM) -- expands ROADMAP items into issues (max 3/day)
    |
Coder Agent (every 4h) -- reads swarm state, picks highest-priority issue, implements
                          GATE: skips if >= 5 open PRs
    |
Code Review Agent (every 4h) -- reviews PRs for quality
Architect Agent (daily 10 AM) -- reviews PRs for architecture
    |
PR Review Responder (hourly) -- addresses review feedback
    |
CI Triage Agent (hourly) -- fixes failing CI (skip-if-green)
    |
Merge Conflict Resolver (every 4h) -- rebases 1 PR at a time
    |
PR Merger Agent (every 4h) -- auto-merges when CI+reviews pass
    |
Observability Agent (daily 9 AM) -- swarm health, agent liveness, writes state
```

## Open Questions

1. **Default-deny migration** — what is the impact on existing users when unknown actions switch from allow to deny?
2. **Capability token format** — how do capability tokens integrate with existing policy evaluation?
3. **Multi-framework priority** — which framework adapter ships after Claude Code? (MCP, LangChain, OpenAI Agents SDK)

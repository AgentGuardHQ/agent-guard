# Architecture Specification

## Governed Action Kernel Model

```
┌─────────────────────────────────────────┐
│ agentguard/  (Governance Runtime)      │
│   Kernel loop, policies, invariants,   │
│   adapters, renderers, sinks           │
└────────────────┬────────────────────────┘
                 │ imports ↓
┌────────────────┴────────────────────────┐
│ domain/  (Environment-agnostic)        │
│   Actions, events, reference monitor,  │
│   adapter registry, battle, encounters │
└────────────────┬────────────────────────┘
                 │ imports ↓
┌────────────────┴────────────────────────┐
│ core/  (Shared infrastructure)         │
│   EventBus, types, error parsing       │
└────────────────┬────────────────────────┘
                 │ imports ↓
┌────────────────┴────────────────────────┐
│ cli/  (Node.js CLI)                    │
│   guard, inspect, events, watch, scan  │
└─────────────────────────────────────────┘

Deprioritized:
┌─────────────────────────────────────────┐
│ game/  (Browser only — not active)     │
│   Canvas rendering, audio, UI, sprites │
├─────────────────────────────────────────┤
│ ecosystem/  (Game content — not active)│
│   JSON data, Grimoire, bosses, storage │
└─────────────────────────────────────────┘
```

## Dependency Rules

- **domain/** has zero external dependencies. No DOM APIs, no Node.js-specific APIs.
- **agentguard/** depends on domain/ and core/. Node.js APIs allowed (fs, child_process).
- **cli/** depends on agentguard/, domain/, and core/.
- **core/** depends on domain/ only.
- **game/** and **ecosystem/** are deprioritized. They depend on domain/ and core/ but nothing depends on them in the governance flow.

## Key Subsystems

### Governed Action Kernel (`agentguard/kernel.ts`)

The orchestrator that connects all governance infrastructure:

```
propose(rawAction) →
  1. ACTION_REQUESTED event
  2. Monitor evaluates (AAB → policy → invariants → evidence)
  3. If denied: ACTION_DENIED + evidence pack + intervention
  4. If allowed: ACTION_ALLOWED → execute via adapter → ACTION_EXECUTED/FAILED
  5. Sink all events to JSONL
  → KernelResult { allowed, executed, decision, execution, events, runId }
```

### Action Authorization Boundary (`agentguard/core/aab.ts`)

Normalizes raw tool calls into structured intents:
- Maps tool names to action types (Write → file.write, Bash → shell.exec)
- Detects git commands in shell (git push → git.push)
- Flags destructive commands (rm -rf, chmod 777, dd if=, DROP DATABASE)
- Computes blast radius from policy limits

### Policy Engine (`agentguard/policies/`)

Declarative policy evaluation:
- JSON and YAML policy formats
- Pattern matching: exact, wildcard (`*`), prefix (`git.*`)
- Scope matching: exact, prefix, suffix (`*.env`)
- Branch conditions, file limits, test requirements
- Two-pass evaluation: deny rules first (highest severity), then allow rules, default allow

### Invariant Checker (`agentguard/invariants/`)

6 default system invariants:
1. **no-secret-exposure** (sev 5) — blocks .env, credentials, .pem, .key, secret, token files
2. **protected-branch** (sev 4) — prevents direct push to main/master
3. **blast-radius-limit** (sev 3) — enforces file modification limit (default 20)
4. **test-before-push** (sev 3) — requires tests pass before push
5. **no-force-push** (sev 4) — forbids force push
6. **lockfile-integrity** (sev 2) — ensures package.json changes sync with lockfiles

### Execution Adapters (`agentguard/adapters/`)

Action handlers registered by class:
- **file** — fs.readFile, fs.writeFile, fs.unlink, fs.rename
- **shell** — child_process.exec with timeout (30s default, 1MB buffer)
- **git** — git commit, push, branch, checkout, merge (validated shell wrappers)
- **claude-code** — normalizes PreToolUse/PostToolUse hook payloads

### Escalation System (`agentguard/monitor.ts`)

Tracks cumulative denials and violations:
- NORMAL (0) — default state
- ELEVATED (1) — denials >= ceil(threshold/2)
- HIGH (2) — denials >= threshold OR violations >= threshold
- LOCKDOWN (3) — denials >= 2×threshold OR violations >= 2×threshold → all actions denied

### Event System (`domain/events.ts`, `core/event-bus.ts`)

50+ canonical event kinds. EventBus provides typed pub/sub. Event factory with auto-generated IDs and fingerprints.

## Data Flow

```
Claude Code Tool Call → Claude Code Adapter → Kernel → AAB → Policy → Invariants
                                                │                        │
                                                ├── Evidence Pack ◄──────┘
                                                │
                                                ├── Adapter (execute) → Result
                                                │
                                                ├── TUI Renderer → Terminal
                                                │
                                                └── JSONL Sink → .agentguard/events/
```

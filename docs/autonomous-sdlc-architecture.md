# Autonomous SDLC Architecture

> Design specification for an externally orchestrated, governance-first autonomous software development lifecycle powered by AgentGuard and Claude Code agents.

## 1. Introduction & Design Goals

AgentGuard is a governed action runtime that intercepts AI agent tool calls, enforces policies and invariants, and emits auditable lifecycle events. This document describes how an **external orchestration layer** uses AgentGuard to enable autonomous AI-driven software development — where multiple role-specialized Claude Code agents pick up tasks from GitHub Issues, develop in isolated worktrees, and submit pull requests, all governed by deterministic policies.

### Design Goals

1. **Governance-first**: Every agent action passes through AgentGuard's kernel before execution. No action escapes the policy/invariant/escalation pipeline.
2. **External orchestration**: The scheduler, task management, and agent lifecycle live outside AgentGuard. AgentGuard remains a focused governance runtime.
3. **GitHub-native task management**: GitHub Issues serve as the task registry. Labels encode state, priority, and role assignment. No custom task database.
4. **Isolation by default**: Each agent works in a git worktree. Agents never share a working directory. All changes reach `main` through pull requests.
5. **Deterministic audit trail**: Every governance decision is persisted to JSONL. Every task state change is recorded as a GitHub Issue comment. The full history is replayable.
6. **Escalation-aware scheduling**: The scheduler monitors AgentGuard's escalation level and pauses autonomously when denial rates indicate systemic problems.

### Non-Goals

- Replacing AgentGuard's kernel or policy engine.
- Building a custom task database (GitHub Issues is the source of truth).
- Real-time multi-agent collaboration on the same files (worktree isolation avoids this entirely).
- Autonomous merging — all PRs require human review.

---

## 2. System Topology

```
┌──────────────────────────────────────────────────────────────────────┐
│                        GitHub (Cloud)                                │
│                                                                      │
│  ┌─────────────┐   ┌──────────────────┐   ┌─────────────────────┐   │
│  │ Issues       │   │ Pull Requests     │   │ Actions Workflows   │   │
│  │ (Task Queue) │   │ (Agent Output)    │   │ (Scheduler Trigger) │   │
│  └──────┬──────┘   └────────▲─────────┘   └──────────┬──────────┘   │
│         │                   │                         │              │
└─────────┼───────────────────┼─────────────────────────┼──────────────┘
          │ poll              │ create PR                │ trigger
          ▼                   │                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     External Scheduler                               │
│                                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Issue     │  │ Agent        │  │ Worktree     │  │ PR         │  │
│  │ Poller    │→ │ Spawner      │→ │ Manager      │→ │ Creator    │  │
│  └──────────┘  └──────┬───────┘  └──────────────┘  └────────────┘  │
│                        │                                             │
└────────────────────────┼─────────────────────────────────────────────┘
                         │ spawn claude CLI
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Agent Worktree (isolated git worktree)                   │
│                                                                      │
│  ┌──────────────┐          ┌─────────────────────────────────────┐  │
│  │ Claude Code   │  hook   │ AgentGuard Runtime                   │  │
│  │ Agent         │────────→│                                     │  │
│  │ (role-scoped) │         │  RawAgentAction                     │  │
│  └──────────────┘         │    ↓ normalizeIntent (AAB)           │  │
│                            │  NormalizedIntent                    │  │
│                            │    ↓ evaluate (Policy Evaluator)     │  │
│                            │    ↓ check (Invariant Checker)       │  │
│                            │    ↓ simulate (Impact Simulation)    │  │
│                            │  MonitorDecision                     │  │
│                            │    ↓ execute or deny                 │  │
│                            │  KernelResult → JSONL sink           │  │
│                            └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Components**:

| Component | Location | Responsibility |
|-----------|----------|---------------|
| GitHub Issues | github.com | Task registry (labels = state machine) |
| GitHub Actions | github.com | Scheduled/manual scheduler trigger |
| External Scheduler | Standalone process or GH Action | Polls issues, spawns agents, manages worktrees, creates PRs |
| Claude Code Agent | Per-worktree process | Executes SDLC work (coding, testing, docs) |
| AgentGuard Runtime | In each worktree | Governance: policy, invariants, escalation, audit |
| JSONL Audit Trail | `.agentguard/` per worktree | Immutable decision log |

---

## 3. Canonical Action Representation (CAR)

The CAR is the formalized wire format for agent actions as they flow through the governance pipeline. It unifies AgentGuard's existing interfaces:

- **`RawAgentAction`** (`src/kernel/aab.ts:17-27`): The raw tool call from Claude Code
- **`NormalizedIntent`** (`src/policy/evaluator.ts:24-33`): The AAB-normalized evaluation form
- **`CanonicalAction`** (`src/core/types.ts`): The execution form with id/fingerprint

The CAR adds multi-agent context (role, task, pipeline stage) that the external scheduler injects.

### Schema

```typescript
interface CanonicalActionRepresentation {
  // Identity
  id: string;                    // Unique action ID (e.g., "act_1709913600_a1b2")
  fingerprint: string;           // Content hash for deduplication

  // Action semantics (from AAB normalization)
  type: string;                  // One of 23 canonical types (e.g., "file.write")
  class: string;                 // One of 8 classes (e.g., "file", "git", "shell")
  target: string;                // File path, branch name, or command
  command?: string;              // Raw shell command (for shell.exec actions)
  destructive: boolean;          // AAB classification (true for rm, force-push, etc.)

  // Agent context (injected by scheduler)
  agent: string;                 // Agent instance ID (e.g., "agent_dev_1a2b")
  role: string;                  // Agent role (e.g., "developer")
  taskId: string;                // GitHub Issue number (e.g., "issue_42")
  justification: string;         // Why the agent proposed this action

  // Governance metadata
  timestamp: number;             // Unix ms
  runId: string;                 // AgentGuard kernel run ID
  pipelineStage?: string;        // SDLC stage (e.g., "implementation", "testing")

  // Blast radius
  affectedPaths?: string[];      // Files this action will modify
  estimatedBlastRadius?: number; // File count estimate
}
```

### JSON Example

```json
{
  "id": "act_1709913600_a1b2",
  "fingerprint": "c3d4e5f6",
  "type": "file.write",
  "class": "file",
  "target": "src/tasks/registry.ts",
  "destructive": false,
  "agent": "agent_dev_1a2b",
  "role": "developer",
  "taskId": "issue_42",
  "justification": "Implement task registry module per architecture spec",
  "timestamp": 1709913600000,
  "runId": "run_1709913400_abc",
  "pipelineStage": "implementation",
  "affectedPaths": ["src/tasks/registry.ts"],
  "estimatedBlastRadius": 3
}
```

### How the CAR Maps to AgentGuard Interfaces

The scheduler constructs the CAR by combining data from multiple sources:

```
GitHub Issue (taskId, allowedPaths)
  + Agent Registry (agent, role)
  + Claude Code Hook Payload (tool_name, tool_input)
    → normalizeClaudeCodeAction() → RawAgentAction
    → AAB.normalizeIntent() → NormalizedIntent (type, class, target, destructive)
    → kernel.propose() → KernelResult (runId, decision, events)
    = CanonicalActionRepresentation
```

Today, the scheduler passes role/task context through `RawAgentAction.metadata`:

```typescript
// In the scheduler's hook wrapper:
const raw: RawAgentAction = normalizeClaudeCodeAction(hookPayload);
raw.metadata = {
  ...raw.metadata,
  role: agent.role,           // "developer"
  taskId: issue.number,       // 42
  pipelineStage: "implementation",
};
```

The `metadata` field on `RawAgentAction` is already a `Record<string, unknown>` and flows through to `NormalizedIntent.metadata`, making this approach work with AgentGuard's current interfaces without modification.

### Action Type Reference

AgentGuard defines 23 canonical action types across 8 classes (`src/core/actions.ts:27-51`):

| Class | Action Types |
|-------|-------------|
| **file** | `file.read`, `file.write`, `file.delete`, `file.move` |
| **test** | `test.run`, `test.run.unit`, `test.run.integration` |
| **git** | `git.diff`, `git.commit`, `git.push`, `git.branch.create`, `git.branch.delete`, `git.checkout`, `git.reset`, `git.merge` |
| **shell** | `shell.exec` |
| **npm** | `npm.install`, `npm.script.run`, `npm.publish` |
| **http** | `http.request` |
| **deploy** | `deploy.trigger` |
| **infra** | `infra.apply`, `infra.destroy` |

The AAB maps Claude Code tools to action types via `TOOL_ACTION_MAP` (`src/kernel/aab.ts:36-43`):

| Claude Code Tool | Action Type |
|-----------------|-------------|
| `Write` | `file.write` |
| `Edit` | `file.write` |
| `Read` | `file.read` |
| `Bash` | `shell.exec` (or git.* via `detectGitAction()`) |
| `Glob` | `file.read` |
| `Grep` | `file.read` |

---

## 4. Agent Roles & Permission Matrix

The autonomous SDLC uses 7 specialized roles. Each role maps to a set of allowed/denied action types, owned file paths, and blast radius limits. The external scheduler assigns roles when spawning agents.

### Role Definitions

| Role | Description | Pipeline Stage |
|------|-------------|---------------|
| **research** | Explores codebase, reads docs, produces research summaries | Pre-pipeline |
| **product** | Grooms tickets, writes acceptance criteria, defines scope | Pre-pipeline |
| **architect** | Designs architecture, produces specs, declares file scope | Stage 0: Planning |
| **developer** | Implements features within architect-defined scope | Stage 1: Implementation |
| **qa** | Writes tests, runs test suites, reports coverage gaps | Stage 2: Verification |
| **documentation** | Writes docs, updates README, adds code comments | Stage 3: Documentation |
| **auditor** | Reviews all changes, reports violations, final safety gate | Stage 4: Review |

### Permission Matrix

| | file.read | file.write | file.delete | shell.exec | git.commit | git.push | test.run | npm.install | deploy.trigger |
|---|---|---|---|---|---|---|---|---|---|
| **research** | Y | - | - | Y (read-only) | - | - | - | - | - |
| **product** | Y | Y (docs) | - | - | - | - | - | - | - |
| **architect** | Y | Y (docs/spec) | - | - | - | - | - | - | - |
| **developer** | Y | Y (src/tests) | Y (src/tests) | Y | Y | - | - | Y | - |
| **qa** | Y | Y (tests) | - | Y | Y | - | Y | - | - |
| **documentation** | Y | Y (docs/*.md) | - | - | Y | - | - | - | - |
| **auditor** | Y | - | - | Y (read-only) | - | - | Y | - | - |

**Key constraints**:
- No role can `git.push` directly — all changes go through PRs
- Only `developer` can `npm.install` (dependency changes)
- Only `developer` and `qa` can `git.commit`
- `deploy.trigger` and `infra.*` are denied for all autonomous roles
- `research` and `auditor` are read-only (no file modifications)

### Owned Paths (File Scope)

Each role has directory patterns it may modify. The governance layer enforces these via policy `scope` conditions.

| Role | Owned Paths |
|------|------------|
| **research** | (none — read-only) |
| **product** | `docs/product/**`, `spec/**` |
| **architect** | `docs/**`, `spec/**`, `*.md` (root-level) |
| **developer** | `src/**`, `tests/**`, `package.json` |
| **qa** | `tests/**` |
| **documentation** | `docs/**`, `*.md`, `examples/**` |
| **auditor** | (none — read-only) |

### Blast Radius Limits

| Role | Max Files Per Action | Max Total Modified Files |
|------|---------------------|-------------------------|
| **research** | 0 | 0 |
| **product** | 5 | 10 |
| **architect** | 5 | 15 |
| **developer** | 20 | 50 |
| **qa** | 15 | 30 |
| **documentation** | 5 | 20 |
| **auditor** | 0 | 0 |

### Role-Specific CLAUDE.md Templates

Each agent receives a role-specific system prompt via `CLAUDE.md` in its worktree. Example for the developer role:

```markdown
# Agent Role: Developer

You are a developer agent working on task #{issue_number}: {issue_title}.

## Scope
You may ONLY modify files matching these patterns:
{allowed_paths}

## Constraints
- Do NOT modify files outside your scope
- Do NOT push directly to any branch — commit only
- Do NOT install packages not listed in the task description
- Do NOT modify CI/CD configuration (.github/*, Dockerfile)
- Run `npm run ts:check` before committing
- Write tests for new functionality

## Task
{issue_body}
```

---

## 5. Task Lifecycle via GitHub Issues

GitHub Issues serve as the task registry. The scheduler interacts with issues via the `gh` CLI or GitHub API. State is encoded in labels.

### Label Schema

| Category | Labels | Purpose |
|----------|--------|---------|
| **Status** | `status:pending`, `status:assigned`, `status:in-progress`, `status:review`, `status:completed`, `status:failed` | State machine |
| **Type** | `task:implementation`, `task:test-generation`, `task:documentation`, `task:bug-fix`, `task:refactor`, `task:architecture`, `task:research`, `task:review` | Maps to agent role |
| **Priority** | `priority:critical`, `priority:high`, `priority:medium`, `priority:low` | Scheduling order |
| **Role** | `role:developer`, `role:qa`, `role:architect`, etc. | Required agent role |
| **Retry** | `retry:0`, `retry:1`, `retry:2`, `retry:3` | Retry counter |
| **Governance** | `governance:clean`, `governance:violations`, `governance:lockdown` | AgentGuard status |

### State Machine

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    ▼                                     │
┌─────────┐   ┌──────────┐   ┌─────────────┐   ┌────────┴──┐
│ pending  │──→│ assigned │──→│ in-progress │──→│  review    │
└─────────┘   └──────────┘   └──────┬──────┘   └─────┬─────┘
                                     │                 │
                                     ▼                 ▼
                               ┌──────────┐     ┌───────────┐
                               │  failed  │     │ completed │
                               └────┬─────┘     └───────────┘
                                    │
                                    ▼ (if retries remain)
                               ┌──────────┐
                               │ pending  │ (retry)
                               └──────────┘
```

**Transitions**:

| From | To | Trigger | Action |
|------|----|---------|--------|
| `pending` | `assigned` | Scheduler picks up issue | Add `role:X` label, post assignment comment |
| `assigned` | `in-progress` | Agent starts work | Update label, post start comment with agent ID |
| `in-progress` | `review` | Agent completes, PR created | Update label, link PR in comment |
| `in-progress` | `failed` | Agent error, timeout, or lockdown | Update label, post error summary |
| `failed` | `pending` | Retry (if `retry:N` < max) | Increment retry label, remove assignment |
| `review` | `completed` | Human merges PR | Update label, post completion summary |

### Issue Body Template

The scheduler expects issues to follow this structure:

```markdown
## Task Description
[What needs to be done]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## File Scope
Allowed paths for this task:
- `src/policy/**`
- `tests/ts/policy-*.test.ts`

## Dependencies
Depends on: #41, #39

## Branch
`feature/rate-limiting`

## Priority
high

## Max Retries
3
```

### Assignment Comment Format

When the scheduler assigns an agent, it posts:

```markdown
**AgentGuard Scheduler** assigned this task.

- **Agent**: `agent_dev_1a2b`
- **Role**: developer
- **Worktree**: `feature/rate-limiting`
- **Policy**: `sdlc-developer-policy`
- **Max Actions**: 200
- **Timeout**: 30m
- **Run ID**: `run_1709913400_abc`

Governance events will be logged to `.agentguard/events/run_1709913400_abc.jsonl`.
```

### Completion Comment Format

```markdown
**AgentGuard Scheduler** — task completed.

- **PR**: #87
- **Actions**: 142 proposed, 138 allowed, 4 denied
- **Escalation**: NORMAL (no violations)
- **Duration**: 18m 32s
- **Files Modified**: 8
- **Tests**: 12 new, all passing

<details>
<summary>Governance Summary</summary>

| Metric | Value |
|--------|-------|
| Total evaluations | 142 |
| Policy denials | 3 (scope violations) |
| Invariant violations | 1 (blast radius exceeded, resolved) |
| Escalation level | NORMAL |
| Decision records | `.agentguard/decisions/run_1709913400_abc.jsonl` |

</details>
```

---

## 6. External Scheduler Architecture

The scheduler is a standalone Node.js process (or GitHub Actions job) that orchestrates the autonomous SDLC loop. It does not modify AgentGuard — it consumes AgentGuard's governance APIs via the Claude Code hook mechanism.

### Components

```
scheduler/
├── index.ts              # Entry point
├── config.ts             # Scheduler configuration
├── poller.ts             # GitHub Issues poller (gh CLI)
├── spawner.ts            # Agent process manager
├── worktree.ts           # Git worktree lifecycle
├── github.ts             # GitHub API interactions (issues, PRs)
├── role-policy.ts        # Role → CLAUDE.md + policy generation
└── metrics.ts            # Scheduler telemetry
```

### Configuration

```yaml
# scheduler.yaml
scheduler:
  pollIntervalMs: 60000          # Check for new tasks every 60s
  maxConcurrentAgents: 3         # Total active agent processes
  maxActionsPerTask: 200         # Kill agent after N actions
  taskTimeoutMs: 1800000         # 30-minute timeout per task
  maxRetriesPerTask: 3           # Max retry attempts

github:
  owner: "your-org"
  repo: "your-repo"
  baseBranch: "main"
  issueLabels:                   # Only pick up issues with these labels
    - "agentguard-task"

governance:
  policyDir: "./policies"        # Directory with role-scoped YAML policies
  escalationPauseLevel: 2        # Pause scheduler at HIGH (2)
  dryRun: false                  # Set true for testing

roles:
  developer:
    maxConcurrent: 1
    allowedActions: [file.read, file.write, file.delete, shell.exec, git.commit, npm.install]
    ownedPaths: ["src/**", "tests/**"]
    blastRadius: 20
  qa:
    maxConcurrent: 2
    allowedActions: [file.read, file.write, test.run, test.run.unit, shell.exec, git.commit]
    ownedPaths: ["tests/**"]
    blastRadius: 15
  # ... other roles
```

### Scheduling Algorithm

```
Priority ordering:
  1. priority:critical tasks first
  2. Within same priority: oldest issue first
  3. Tasks with all dependencies met only
  4. Tasks matching an available role slot
```

The scheduler maintains a simple in-memory map of active agents:

```typescript
interface ActiveAgent {
  agentId: string;
  role: string;
  issueNumber: number;
  worktreePath: string;
  process: ChildProcess;
  startedAt: number;
  actionCount: number;
}
```

### Safety Limits

| Limit | Default | Purpose |
|-------|---------|---------|
| Max actions per task | 200 | Prevent runaway agents |
| Task timeout | 30 minutes | Prevent hung agents |
| Max concurrent agents | 3 | Resource management |
| Max retries per task | 3 | Prevent infinite retry loops |
| Escalation pause level | HIGH (2) | Stop all agents if governance detects systemic issues |

### Heartbeat & Health

The scheduler monitors agent processes:
- **Process alive**: Check if `ChildProcess` is still running every 10s
- **Action rate**: If an agent hasn't produced an action in 5 minutes, consider it stuck
- **JSONL tail**: Watch the agent's JSONL event file for `ACTION_DENIED` events to track denial rate

---

## 7. Policy Configuration

Each agent role gets a YAML policy file that AgentGuard's evaluator processes. These use the existing `PolicyRule` format from `src/policy/evaluator.ts:4-14`.

### Developer Policy (`policies/developer.yaml`)

```yaml
id: sdlc-developer-policy
name: Developer Agent Policy
description: Governs developer agents in the autonomous SDLC
severity: 4

rules:
  # Developer can write to src/ and tests/
  - action: file.write
    effect: allow
    conditions:
      scope:
        - "src/**"
        - "tests/**"
        - "package.json"
    reason: Developer may modify source, tests, and package.json

  # Developer cannot touch CI configs
  - action: file.write
    effect: deny
    conditions:
      scope:
        - ".github/**"
        - "Dockerfile"
        - "docker-compose*"
        - ".env*"
    reason: CI and environment config changes require human approval

  # Developer cannot touch docs
  - action: file.write
    effect: deny
    conditions:
      scope:
        - "docs/**"
        - "*.md"
    reason: Documentation changes require documentation role

  # No direct push — must go through PR
  - action: git.push
    effect: deny
    reason: All changes must go through pull request review

  # No force push ever
  - action: git.force-push
    effect: deny
    reason: Force push rewrites shared history

  # No destructive infra actions
  - action:
      - deploy.trigger
      - infra.apply
      - infra.destroy
      - npm.publish
    effect: deny
    reason: Production-affecting actions require human authorization

  # Allow reads universally
  - action: file.read
    effect: allow
    reason: Reading is always safe

  # Allow shell execution (for builds, tests, linting)
  - action: shell.exec
    effect: allow
    reason: Shell access needed for build and test commands

  # Allow commits (agent commits to worktree branch)
  - action: git.commit
    effect: allow
    reason: Commits to feature branch are safe

  # Allow branch creation
  - action: git.branch.create
    effect: allow
    reason: Feature branches are safe to create

  # Allow npm install
  - action: npm.install
    effect: allow
    reason: Dependencies needed for development
```

### QA Policy (`policies/qa.yaml`)

```yaml
id: sdlc-qa-policy
name: QA Agent Policy
description: Governs QA/testing agents
severity: 4

rules:
  # QA can write tests
  - action: file.write
    effect: allow
    conditions:
      scope:
        - "tests/**"
        - "**/*.test.ts"
        - "**/*.test.js"
        - "**/*.spec.ts"
    reason: QA writes test files

  # QA cannot modify source code
  - action: file.write
    effect: deny
    conditions:
      scope:
        - "src/**"
    reason: QA agents do not modify production code

  # QA can run tests
  - action:
      - test.run
      - test.run.unit
      - test.run.integration
    effect: allow
    reason: Test execution is the QA role's primary function

  # No push, no deploy
  - action:
      - git.push
      - deploy.trigger
      - npm.publish
    effect: deny
    reason: QA cannot push or deploy

  - action: file.read
    effect: allow
    reason: Reading is always safe

  - action: shell.exec
    effect: allow
    reason: Shell access needed for test commands

  - action: git.commit
    effect: allow
    reason: Commits to feature branch are safe
```

### Architect Policy (`policies/architect.yaml`)

```yaml
id: sdlc-architect-policy
name: Architect Agent Policy
description: Governs architect agents (planning/spec only)
severity: 3

rules:
  # Architects write specs and docs only
  - action: file.write
    effect: allow
    conditions:
      scope:
        - "docs/**"
        - "spec/**"
        - "ARCHITECTURE.md"
        - "CLAUDE.md"
    reason: Architects write specifications and documentation

  # Architects cannot modify source code or tests
  - action:
      - file.write
      - file.delete
    effect: deny
    conditions:
      scope:
        - "src/**"
        - "tests/**"
        - "package.json"
    reason: Architects do not modify source code

  # No git, no shell, no deploy
  - action:
      - git.push
      - git.commit
      - shell.exec
      - deploy.trigger
      - npm.install
    effect: deny
    reason: Architects produce specs only

  - action: file.read
    effect: allow
    reason: Reading is always safe
```

### Auditor Policy (`policies/auditor.yaml`)

```yaml
id: sdlc-auditor-policy
name: Auditor Agent Policy
description: Read-only review agent
severity: 5

rules:
  # Auditor cannot write anything
  - action:
      - file.write
      - file.delete
      - file.move
      - git.commit
      - git.push
      - npm.install
      - npm.publish
      - deploy.trigger
    effect: deny
    reason: Auditor is strictly read-only

  # Auditor can read and run tests
  - action: file.read
    effect: allow
    reason: Reading is the auditor's primary function

  - action:
      - test.run
      - test.run.unit
      - test.run.integration
    effect: allow
    reason: Auditor verifies test results

  - action: shell.exec
    effect: allow
    conditions:
      scope:
        - "npm test*"
        - "npm run ts:test*"
        - "npm run lint*"
        - "git log*"
        - "git diff*"
    reason: Auditor can run read-only shell commands
```

### Policy Selection

The scheduler selects a policy file based on the agent's assigned role:

```typescript
function getPolicyPath(role: string): string {
  return `policies/${role}.yaml`;
}
```

When spawning the agent, the scheduler starts AgentGuard with the role-specific policy:

```bash
# In the agent's worktree:
npx agentguard guard --policy policies/developer.yaml
```

The agent's Claude Code hooks then route all tool calls through the AgentGuard kernel loaded with this policy.

---

## 8. Governance Integration

### Current Hook Architecture

AgentGuard integrates with Claude Code via hooks registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node /path/to/claude-hook.js" }
        ]
      }
    ]
  }
}
```

Currently (`src/cli/commands/claude-hook.ts`), the hook:
1. Reads JSON from stdin (the `ClaudeCodeHookPayload`)
2. Only processes `Bash` tool uses
3. Reports errors from stderr to stdout
4. Always exits 0 (hooks must never fail)

### Extended Hook for Full Governance

For the autonomous SDLC, the hook must be extended to:
1. Process **all** tool uses (not just Bash)
2. Use **PreToolUse** hooks (to deny actions before execution)
3. Route through the full `kernel.propose()` pipeline
4. Return deny signals for unauthorized actions

The extended hook architecture:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "npx agentguard claude-hook --mode=pre --policy=policies/developer.yaml --run-id=run_abc"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "npx agentguard claude-hook --mode=post --run-id=run_abc"
          }
        ]
      }
    ]
  }
}
```

**PreToolUse flow**:

```
Claude Code proposes tool call
  → PreToolUse hook fires
  → claude-hook reads stdin JSON (ClaudeCodeHookPayload)
  → normalizeClaudeCodeAction(payload) → RawAgentAction
  → Inject role/taskId into metadata from environment:
      AGENTGUARD_ROLE=developer
      AGENTGUARD_TASK_ID=42
      AGENTGUARD_RUN_ID=run_abc
  → kernel.propose(rawAction) → KernelResult
  → If denied: write deny message to stdout, exit 0
     (Claude Code shows the message and skips the tool call)
  → If allowed: exit 0 silently (tool call proceeds)
  → Decision persisted to JSONL
```

**PostToolUse flow**:

```
Claude Code completes tool call
  → PostToolUse hook fires
  → claude-hook reads result (tool_output)
  → Log execution result to JSONL
  → Check for error patterns (test failures, build errors)
  → Update action count in shared state file
  → If action count > max: write "Action limit reached" to stdout
```

### Environment Variables

The scheduler sets these environment variables when spawning the Claude Code agent:

| Variable | Example | Purpose |
|----------|---------|---------|
| `AGENTGUARD_ROLE` | `developer` | Agent's assigned role |
| `AGENTGUARD_TASK_ID` | `42` | GitHub Issue number |
| `AGENTGUARD_RUN_ID` | `run_1709913400_abc` | Kernel run ID for this task |
| `AGENTGUARD_POLICY` | `policies/developer.yaml` | Policy file path |
| `AGENTGUARD_MAX_ACTIONS` | `200` | Action limit |
| `AGENTGUARD_DRY_RUN` | `false` | Dry-run mode |

### Escalation Integration

The monitor (`src/kernel/monitor.ts`) tracks escalation levels:

```typescript
const ESCALATION = {
  NORMAL: 0,    // All clear
  ELEVATED: 1,  // Elevated denial rate
  HIGH: 2,      // Significant violations detected
  LOCKDOWN: 3,  // All actions denied
};
```

The scheduler reads the monitor state by tailing the JSONL event stream for `StateChanged` events with escalation level updates. When the level reaches `HIGH` (configurable via `escalationPauseLevel`), the scheduler:

1. Sends SIGTERM to all active agent processes
2. Posts a comment on all in-progress issues: "Scheduler paused due to escalation level HIGH"
3. Updates issue labels to `status:failed` with `governance:lockdown`
4. Stops polling for new tasks
5. Waits for human intervention (manual scheduler restart)

---

## 9. GitHub Actions Workflow

### Scheduled Autonomous Run

```yaml
# .github/workflows/agentguard-sdlc.yml
name: AgentGuard Autonomous SDLC

on:
  schedule:
    - cron: '0 */4 * * *'        # Every 4 hours
  workflow_dispatch:
    inputs:
      task_type:
        description: 'Task type filter (empty = all pending tasks)'
        required: false
        type: choice
        options:
          - ''
          - implementation
          - test-generation
          - documentation
          - bug-fix
          - refactor
      max_tasks:
        description: 'Maximum tasks to process'
        required: false
        default: '1'
        type: string
      dry_run:
        description: 'Dry run (evaluate but do not execute)'
        required: false
        default: 'false'
        type: boolean

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  autonomous-sdlc:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0           # Full history for worktrees

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build AgentGuard
        run: npm run build:ts

      - name: Run Scheduler (one-shot)
        run: |
          npx agentguard-scheduler run \
            --max-tasks ${{ inputs.max_tasks || '1' }} \
            --timeout 30m \
            --task-type "${{ inputs.task_type }}" \
            ${{ inputs.dry_run == 'true' && '--dry-run' || '' }}
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload governance artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: governance-audit-${{ github.run_id }}
          path: .agentguard/
          retention-days: 30
```

### Task Creation Workflow

For creating tasks from issue templates:

```yaml
# .github/workflows/create-sdlc-task.yml
name: Create SDLC Task

on:
  issues:
    types: [labeled]

jobs:
  validate-task:
    if: contains(github.event.label.name, 'agentguard-task')
    runs-on: ubuntu-latest
    steps:
      - name: Validate issue format
        uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.issue;
            const body = issue.body || '';

            // Check required sections
            const required = ['## Task Description', '## File Scope', '## Priority'];
            const missing = required.filter(s => !body.includes(s));

            if (missing.length > 0) {
              await github.rest.issues.createComment({
                ...context.repo,
                issue_number: issue.number,
                body: `Missing required sections: ${missing.join(', ')}\n\nPlease update the issue body to include all required sections.`,
              });
              return;
            }

            // Add status:pending label
            await github.rest.issues.addLabels({
              ...context.repo,
              issue_number: issue.number,
              labels: ['status:pending'],
            });
```

---

## 10. Telemetry & Observability

### JSONL Event Envelope

Every governance event is persisted to `.agentguard/events/<runId>.jsonl`. The autonomous SDLC extends the existing event envelope with optional agent/task context fields. This is backward-compatible — older AgentGuard consumers ignore unknown fields.

```json
{
  "id": "evt_1709913600_42",
  "kind": "ActionAllowed",
  "timestamp": 1709913600000,
  "fingerprint": "a1b2c3d4",
  "payload": {
    "intent": {
      "action": "file.write",
      "target": "src/tasks/registry.ts",
      "agent": "claude-code",
      "destructive": false,
      "metadata": {
        "role": "developer",
        "taskId": 42,
        "pipelineStage": "implementation",
        "hook": "PreToolUse"
      }
    },
    "decision": "allow",
    "matchedRule": {
      "action": "file.write",
      "effect": "allow",
      "conditions": { "scope": ["src/**", "tests/**"] }
    },
    "reason": "Developer may modify source and tests"
  }
}
```

### Key Telemetry Events

| Event Kind | When | Key Fields |
|-----------|------|------------|
| `ActionRequested` | Agent proposes tool call | `action`, `target`, `agent`, `metadata.role`, `metadata.taskId` |
| `ActionAllowed` | Policy allows the action | `decision`, `matchedRule`, `reason` |
| `ActionDenied` | Policy or invariant denies | `decision`, `reason`, `severity` |
| `ActionExecuted` | Action completed successfully | `executionResult` |
| `ActionFailed` | Action execution error | `error` |
| `InvariantViolation` | Invariant check failed | `invariantId`, `expected`, `actual` |
| `BlastRadiusExceeded` | Too many files affected | `filesAffected`, `limit` |
| `StateChanged` | Escalation level changed | `from`, `to`, `reason` |
| `PolicyDenied` | Explicit policy denial | `rule`, `reason` |

### GitHub Issue Comments as Audit Trail

The scheduler posts structured comments on issues at key lifecycle points:

1. **Assignment**: Agent ID, role, policy, run ID
2. **Progress** (every 50 actions): Action count, denial count, escalation level
3. **Completion**: PR link, full governance summary, metrics
4. **Failure**: Error details, retry count, escalation status

### Metrics Dashboard

The scheduler exposes metrics for monitoring:

```typescript
interface SchedulerMetrics {
  // Task metrics
  tasksCompleted: number;
  tasksFailed: number;
  tasksRetried: number;
  tasksPending: number;

  // Agent metrics
  activeAgents: number;
  totalAgentsSpawned: number;

  // Governance metrics
  totalActionsProposed: number;
  totalActionsAllowed: number;
  totalActionsDenied: number;
  totalInvariantViolations: number;
  currentEscalationLevel: number;

  // Performance
  averageTaskDurationMs: number;
  averageActionsPerTask: number;
  uptimeMs: number;
}
```

These can be exposed via stdout JSON (for GitHub Actions), a local metrics file, or a webhook.

---

## 11. Execution Loop

### Complete Scheduler Pseudocode

```
INITIALIZE:
  config = loadSchedulerConfig("scheduler.yaml")
  github = createGitHubClient(config.github)
  metrics = createMetrics()

MAIN LOOP:
  while scheduler.status === "running":

    // 1. POLL FOR TASKS
    issues = github.listIssues({
      labels: ["agentguard-task", "status:pending"],
      sort: "created",
      direction: "asc",
    })

    // 2. FILTER & PRIORITIZE
    ready = issues
      .filter(issue => allDependenciesMet(issue))
      .sort(byPriority)  // critical > high > medium > low

    if ready.length === 0:
      sleep(config.pollIntervalMs)
      continue

    if activeAgents.size >= config.maxConcurrentAgents:
      sleep(config.pollIntervalMs)
      continue

    // 3. SELECT TASK
    issue = ready[0]
    taskType = extractLabel(issue, "task:")
    role = mapTaskTypeToRole(taskType)
    //   task:implementation → developer
    //   task:test-generation → qa
    //   task:architecture → architect
    //   task:documentation → documentation
    //   task:bug-fix → developer
    //   task:review → auditor

    if activeAgentsForRole(role) >= config.roles[role].maxConcurrent:
      continue  // Role slot full, try next issue

    // 4. ASSIGN TASK
    agentId = generateAgentId(role)  // "agent_dev_1a2b"
    runId = generateRunId()          // "run_1709913400_abc"

    github.updateIssueLabels(issue.number, {
      add: ["status:assigned", `role:${role}`],
      remove: ["status:pending"],
    })

    github.postComment(issue.number, formatAssignmentComment({
      agentId, role, runId, maxActions: config.maxActionsPerTask,
    }))

    // 5. CREATE WORKTREE
    branch = `agentguard/${taskType}/${issue.number}`
    worktreePath = await createWorktree(branch, config.github.baseBranch)
    //   git worktree add ../worktrees/<branch> -b <branch> origin/<baseBranch>

    // 6. PREPARE WORKTREE
    writeClaudeMd(worktreePath, role, issue)
    //   Write role-specific CLAUDE.md with task description and file scope

    writeClaudeSettings(worktreePath, {
      hooks: {
        PreToolUse: [{
          matcher: "*",
          hooks: [{
            type: "command",
            command: `npx agentguard claude-hook --mode=pre --policy=${getPolicyPath(role)} --run-id=${runId}`,
          }],
        }],
        PostToolUse: [{
          matcher: "*",
          hooks: [{
            type: "command",
            command: `npx agentguard claude-hook --mode=post --run-id=${runId}`,
          }],
        }],
      },
    })

    copyPolicyFile(worktreePath, role)
    //   Copy policies/<role>.yaml into the worktree

    // 7. SPAWN AGENT
    agentProcess = spawn("claude", [
      "--print",                        // Non-interactive mode
      "--allowedTools", toolsForRole(role),
      "-p", formatTaskPrompt(issue),    // Task prompt from issue body
    ], {
      cwd: worktreePath,
      env: {
        ...process.env,
        AGENTGUARD_ROLE: role,
        AGENTGUARD_TASK_ID: String(issue.number),
        AGENTGUARD_RUN_ID: runId,
        AGENTGUARD_POLICY: getPolicyPath(role),
        AGENTGUARD_MAX_ACTIONS: String(config.maxActionsPerTask),
      },
      timeout: config.taskTimeoutMs,
    })

    github.updateIssueLabels(issue.number, {
      add: ["status:in-progress"],
      remove: ["status:assigned"],
    })

    activeAgents.set(agentId, {
      agentId, role, issueNumber: issue.number,
      worktreePath, process: agentProcess,
      startedAt: Date.now(), actionCount: 0,
    })

    // 8. MONITOR AGENT (async)
    agentProcess.on("exit", async (code) => {
      agent = activeAgents.get(agentId)
      activeAgents.delete(agentId)

      governanceSummary = parseJsonlEvents(
        `${worktreePath}/.agentguard/events/${runId}.jsonl`
      )

      if code === 0 && governanceSummary.escalationLevel < ESCALATION.HIGH:
        // SUCCESS PATH
        // Push branch and create PR
        await exec(`git push origin ${branch}`, { cwd: worktreePath })

        pr = await github.createPR({
          title: `[${role}] ${issue.title}`,
          body: formatPRBody(issue, governanceSummary),
          head: branch,
          base: config.github.baseBranch,
        })

        github.updateIssueLabels(issue.number, {
          add: ["status:review", "governance:clean"],
          remove: ["status:in-progress"],
        })

        github.postComment(issue.number, formatCompletionComment({
          pr, governanceSummary,
        }))

      else:
        // FAILURE PATH
        retryCount = extractRetryCount(issue)

        if retryCount < config.maxRetriesPerTask:
          github.updateIssueLabels(issue.number, {
            add: ["status:pending", `retry:${retryCount + 1}`],
            remove: ["status:in-progress", `retry:${retryCount}`, `role:${role}`],
          })
          github.postComment(issue.number, formatFailureComment({
            reason: code !== 0 ? "Agent process exited with error" : "Escalation level too high",
            governanceSummary,
            retryCount: retryCount + 1,
            maxRetries: config.maxRetriesPerTask,
          }))
        else:
          github.updateIssueLabels(issue.number, {
            add: ["status:failed", "governance:violations"],
            remove: ["status:in-progress"],
          })
          github.postComment(issue.number, formatFailureComment({
            reason: "Max retries exhausted",
            governanceSummary,
            retryCount,
            maxRetries: config.maxRetriesPerTask,
          }))

      // Cleanup worktree
      await exec(`git worktree remove ${worktreePath} --force`)

      metrics.update(governanceSummary)
    })

    // 9. CHECK GLOBAL ESCALATION
    // Periodically check all active agents' JSONL streams
    if anyAgentAtEscalation(ESCALATION.HIGH):
      scheduler.pause()
      terminateAllAgents()
      for each activeIssue:
        github.postComment(activeIssue, "Scheduler paused: escalation level HIGH detected")
        github.updateIssueLabels(activeIssue, { add: ["governance:lockdown"] })
```

### Agent Worker Lifecycle

```
AGENT PROCESS (claude CLI in worktree):

  1. Claude Code starts, reads CLAUDE.md with:
     - Role assignment
     - Task description (from GitHub Issue)
     - File scope constraints
     - Governance notice

  2. For each tool call Claude proposes:
     a. PreToolUse hook fires → agentguard claude-hook --mode=pre
     b. Hook reads ClaudeCodeHookPayload from stdin
     c. normalizeClaudeCodeAction(payload) → RawAgentAction
     d. RawAgentAction.metadata enriched with:
        - role (from AGENTGUARD_ROLE env)
        - taskId (from AGENTGUARD_TASK_ID env)
     e. kernel.propose(rawAction) → KernelResult
     f. If KernelResult.allowed === false:
        - Write denial message to stdout
        - Claude Code sees the message, skips tool call
     g. If KernelResult.allowed === true:
        - Exit silently, tool call proceeds

  3. PostToolUse hook fires → agentguard claude-hook --mode=post
     a. Log execution result to JSONL
     b. Increment action counter in shared state

  4. Agent completes task:
     a. Creates commits on worktree branch
     b. Exits with code 0

  5. Agent fails:
     a. Exits with non-zero code
     b. Scheduler detects via process.on("exit")
```

---

## 12. Recommended AgentGuard Enhancements

The design above works with AgentGuard's current interfaces by passing role/task context through `metadata`. However, the following enhancements would make governance more precise and the integration cleaner:

### Priority 1 — Extended Hook Command

Extend `src/cli/commands/claude-hook.ts` to support full governance mode:

- Accept `--mode=pre|post` flag
- Accept `--policy=<file>` to load a policy
- Accept `--run-id=<id>` for session continuity
- In `pre` mode: run `kernel.propose()` and write deny messages to stdout
- In `post` mode: log execution results to JSONL
- Process all tool types (not just Bash)

This is the **critical enabler** for the autonomous SDLC — without PreToolUse governance, agents can execute unauthorized actions.

### Priority 2 — Role and Task Fields on Core Interfaces

Add `role?: string` and `taskId?: string` to:
- `RawAgentAction` (`src/kernel/aab.ts:17-27`)
- `NormalizedIntent` (`src/policy/evaluator.ts:24-33`)

This makes role/task context first-class rather than buried in `metadata`.

### Priority 3 — Role-Based Policy Conditions

Extend `PolicyRule.conditions` (`src/policy/evaluator.ts:7-12`):

```typescript
conditions?: {
  scope?: string[];
  limit?: number;
  branches?: string[];
  requireTests?: boolean;
  roles?: string[];          // NEW: match against intent.role
  ownership?: string[];      // NEW: directory patterns the role owns
};
```

Add `matchRole()` and `matchOwnership()` alongside existing `matchAction()`, `matchScope()`, `matchConditions()`.

### Priority 4 — Rate Limiting in Monitor

Extend `src/kernel/monitor.ts` with per-agent rate limiting:
- Track action timestamps per agent: `Map<string, number[]>`
- Track retry counts per agent per action type: `Map<string, Map<string, number>>`
- Configurable limits: `maxActions` per `windowMs`

### Priority 5 — New Invariants

Add to `DEFAULT_INVARIANTS` in `src/invariants/definitions.ts`:
- **`architectural-boundary`**: Verify `state.modifiedFiles` are within `state.allowedPaths`
- **`build-must-succeed`**: Require build passing before commit/push
- **`ci-compatibility`**: CI config changes (`.github/**`, `Dockerfile`) require explicit authorization

### Priority 6 — New Event Kinds

Add to the `EventKind` union in `src/core/types.ts`:
- Task lifecycle: `TaskCreated`, `TaskAssigned`, `TaskStarted`, `TaskCompleted`, `TaskFailed`
- Multi-agent: `AgentRegistered`, `ConflictDetected`, `RateLimitExceeded`

---

## 13. Open Questions & Future Work

### Open Questions

1. **PreToolUse hook blocking**: Claude Code's PreToolUse hooks can display messages but may not fully block tool execution in all cases. Need to verify the exact blocking semantics for each tool type.

2. **Agent prompt engineering**: The effectiveness of role constraints depends heavily on the CLAUDE.md system prompt. How much can we rely on prompt-based constraints vs. governance-based enforcement? (Answer: governance is the backstop — prompts reduce denial noise.)

3. **Dependency resolution**: When task A depends on task B, and task B produces a PR that hasn't been merged yet, should task A work against task B's branch? Or wait for merge to main?

4. **Concurrent worktree limits**: Git worktrees share the object store. With many agents, `git gc` and `git repack` may become bottlenecks. What's the practical limit?

5. **Cost management**: Each agent invocation consumes API tokens. Should the scheduler have a per-run or per-day token budget?

### Future Work

- **Parallel pipeline execution**: Run independent tasks (e.g., tests for different modules) in parallel across multiple agents.
- **Agent memory**: Persist agent learnings (common denial reasons, preferred code patterns) across task invocations.
- **Automated review**: Use an auditor agent to review PRs before human review, reducing review burden.
- **Metrics dashboard**: Web UI showing scheduler status, active agents, governance metrics, task history.
- **Webhook notifications**: Slack/Discord alerts for task completion, failures, and escalation events.
- **Policy learning**: Analyze denial patterns to suggest policy rule adjustments.
- **Multi-repo support**: Orchestrate agents across multiple repositories with cross-repo dependency tracking.
- **Conflict detection**: When two agents' worktrees modify overlapping files, detect potential merge conflicts early and either serialize the tasks or alert a human.

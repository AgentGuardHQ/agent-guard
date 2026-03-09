# AAB Decision Flow Diagram

## Evaluation Pipeline

```mermaid
flowchart TD
    A["Raw Agent Action<br/>{tool, command, file, agent}"] --> B["normalizeIntent()"]

    B --> C{"destructive?"}
    C -->|Yes| D["DENY (severity 5)<br/>UNAUTHORIZED_ACTION event"]
    C -->|No| E["evaluate(intent, policies)"]

    E --> F{"Deny rule<br/>matches?"}
    F -->|Yes| G["DENY<br/>POLICY_DENIED event"]
    F -->|No| H{"Allow rule<br/>matches?"}
    H -->|Yes| I["ALLOW"]
    H -->|No| J["ALLOW (default)"]

    G --> K["checkAllInvariants()"]
    I --> K
    J --> K
    D --> K

    K --> L{"Any invariant<br/>violated?"}
    L -->|Yes| M["INVARIANT_VIOLATION events"]
    L -->|No| N["No violations"]

    M --> O["selectIntervention(maxSeverity)"]
    N --> O
    D --> O

    O --> P{"Max severity?"}
    P -->|"≥5"| Q["DENY"]
    P -->|"≥4"| R["PAUSE"]
    P -->|"≥3"| S["ROLLBACK"]
    P -->|"<3"| T["TEST_ONLY"]

    Q --> U["createEvidencePack()"]
    R --> U
    S --> U
    T --> V["Action proceeds<br/>(flagged for testing)"]

    U --> W["EVIDENCE_PACK_GENERATED event"]
    W --> X["Emit all events to EventBus"]

    style D fill:#c0392b,color:#fff
    style Q fill:#c0392b,color:#fff
    style R fill:#e67e22,color:#fff
    style S fill:#f39c12,color:#fff
    style T fill:#27ae60,color:#fff
    style V fill:#27ae60,color:#fff
```

## ASCII Representation

```
Raw Agent Action
  { tool: "Bash", command: "git push --force origin main" }
                    │
                    ▼
            normalizeIntent()
  ┌─────────────────────────────────────────┐
  │ 1. TOOL_ACTION_MAP["Bash"] → shell.exec │
  │ 2. detectGitAction() → git.force-push   │
  │ 3. isDestructiveCommand() → false       │
  │ 4. extractBranch() → main               │
  │                                         │
  │ Output: {                               │
  │   action: "git.force-push",             │
  │   target: "main",                       │
  │   branch: "main",                       │
  │   destructive: false                    │
  │ }                                       │
  └─────────────────┬───────────────────────┘
                    │
                    ▼
           ┌──── destructive? ────┐
           │ No                   │ Yes
           ▼                     ▼
    evaluate(intent,       DENY (severity 5)
     policies)             emit UNAUTHORIZED_ACTION
           │
    ┌──────┴──────┐
    │ Deny rules  │ ◄── checked first (fail-closed)
    │ first       │
    └──────┬──────┘
           │ match?
    ┌──────┴──────┐
    │ Yes         │ No
    ▼             ▼
  DENY         Allow rules
  emit         │ match?
  POLICY_      ├── Yes → ALLOW
  DENIED       └── No  → ALLOW (default)
           │
           ▼
    checkAllInvariants()
    ┌──────────────────────────────────┐
    │ no-secret-exposure  (sev 5) → ? │
    │ protected-branch    (sev 4) → ? │
    │ blast-radius-limit  (sev 3) → ? │
    │ test-before-push    (sev 3) → ? │
    │ no-force-push       (sev 4) → ✗ │
    │ lockfile-integrity  (sev 2) → ? │
    └──────────────────┬───────────────┘
                       │ violations[]
                       ▼
           selectIntervention(maxSeverity)
           ┌──────────────────────┐
           │ ≥5 → DENY           │
           │ ≥4 → PAUSE          │ ◄── this case
           │ ≥3 → ROLLBACK       │
           │ <3 → TEST_ONLY      │
           └──────────┬───────────┘
                      │
                      ▼
            createEvidencePack()
            emit EVIDENCE_PACK_GENERATED
```

## Source References

- `normalizeIntent()`: `src/agentguard/core/aab.ts:84-111`
- `isDestructiveCommand()`: `src/agentguard/core/aab.ts:58-76`
- `detectGitAction()`: `src/agentguard/core/aab.ts:42-56`
- `authorize()`: `src/agentguard/core/aab.ts:113-191`
- `evaluate()`: `src/agentguard/policies/evaluator.ts:95-157`
- `checkAllInvariants()`: `src/agentguard/invariants/checker.ts:23-60`
- `selectIntervention()`: `src/agentguard/core/engine.ts:57-67`
- `createEvidencePack()`: `src/agentguard/evidence/pack.ts:66-103`

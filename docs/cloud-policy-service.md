# Cloud Policy Service — AgentGuard

This document describes the cloud policy service: a central hub for versioning, syncing, and managing governance policies across teams and repositories.

## Motivation

AgentGuard policies currently live as local YAML/JSON files. This works for individual developers but creates problems at scale:

- No version history for policy changes
- No way to sync policies across repositories
- No team-level policy management or role-based access
- No notification when policies change

The cloud policy service provides "GitHub for Agent Security Policies" — version control, collaboration, and distribution for governance policies.

## Policy Versioning

### Version Model

```
PolicyVersion {
  version: number          // Incrementing version number
  hash: string             // SHA-256 of policy content
  author: string           // Who made this change
  timestamp: number        // When the change was made
  policy: Policy           // The full policy at this version
  message?: string         // Change description
  diff?: PolicyDiff        // Diff from previous version
}
```

### Operations

| Operation | Description |
|-----------|-------------|
| `version.create(policy, message)` | Create new version from current policy |
| `version.get(number)` | Retrieve specific version |
| `version.list()` | List all versions with metadata |
| `version.diff(v1, v2)` | Compute diff between two versions |
| `version.rollback(number)` | Revert to a previous version |

### Policy Diff

The diff captures semantic changes between policy versions:
- Rules added, removed, or modified
- Effect changes (allow ↔ deny)
- Scope changes (patterns added/removed)
- Metadata changes (description, tags)

## Remote Policy Sync

### Sync Operations

```
fetchPolicy(url: string, auth?: AuthToken): Promise<Policy>
pushPolicy(url: string, policy: Policy, auth: AuthToken): Promise<void>
syncPolicies(remote: string): Promise<SyncResult>
```

### Conflict Resolution

When local and remote policies diverge, the **deny-wins** merge strategy applies:

1. If remote has a deny rule that local doesn't → add it (security strengthening)
2. If local has a deny rule that remote doesn't → keep it (local override)
3. If both have conflicting allow/deny for the same pattern → deny wins
4. Metadata conflicts → remote takes precedence (central authority)

### Sync Flow

```
Local Policy ──push──► Remote Policy Store
                              │
Remote Policy Store ──pull──► Local Policy
                              │
Auto-sync (optional) ────────► Periodic fetch + deny-wins merge
```

## Team RBAC Model

### Roles

| Role | Permissions |
|------|------------|
| Admin | Full access: create teams, manage members, deploy policies |
| Policy Editor | Create and modify policies, submit for review |
| Viewer | Read policies, view events and audit trails |
| Agent | Read policies (for enforcement), write events |

### Permissions

| Permission | Admin | Editor | Viewer | Agent |
|-----------|-------|--------|--------|-------|
| `policy.read` | Yes | Yes | Yes | Yes |
| `policy.write` | Yes | Yes | No | No |
| `policy.deploy` | Yes | No | No | No |
| `events.read` | Yes | Yes | Yes | No |
| `events.export` | Yes | Yes | No | No |
| `team.manage` | Yes | No | No | No |

### Policy Hierarchy

Policies are scoped in a hierarchy that mirrors organizational structure:

```
Organization Policy (broadest — baseline rules)
  └── Team Policy (team-specific overrides)
        └── Repository Policy (repo-specific rules)
```

**Merge order:** Organization → Team → Repository. More specific policies override broader ones. Deny rules at any level cannot be overridden by allow rules at a lower level.

## Policy Validation Webhook

When a policy changes, configurable webhooks fire:

1. Policy change detected (local save or remote push)
2. Validate the new policy against schema
3. Optionally validate against test suite (if policy tests exist)
4. Send notification to configured channels

### Notification Channels

| Channel | Payload |
|---------|---------|
| Slack | Message with policy diff summary, author, and version |
| GitHub | PR comment or issue with policy change details |
| Email | Formatted email with diff and approval link |
| Generic webhook | JSON POST with full PolicyVersion object |

## CLI Commands

```bash
agentguard policy push              # Push local policy to remote
agentguard policy pull              # Pull latest policy from remote
agentguard policy diff              # Show diff between local and remote
agentguard policy versions          # List version history
agentguard policy rollback <ver>    # Revert to a previous version
agentguard policy sync              # Full sync with deny-wins merge
```

## Target Directory Structure

```
src/policy/
├── versioned-policy.ts    # PolicyVersion type, version tracking, diff
├── remote.ts              # Remote sync (fetch, push, sync)
├── rbac.ts                # Team RBAC model
└── webhook.ts             # Policy change notifications
```

## Key Files to Modify

| File | Change |
|------|--------|
| `src/policy/loader.ts` | Support remote URLs and versioned loading |
| `src/policy/composer.ts` | Support hierarchical team policies |
| `src/cli/commands/policy.ts` | Add push, pull, diff, versions, rollback, sync subcommands |

## Verification

- Policy sync round-trip: push → pull → compare (identical)
- Deny-wins merge produces correct result on conflicting policies
- RBAC permissions enforced (editor cannot deploy, viewer cannot write)
- Webhook fires on policy change with correct diff
- Version rollback restores exact previous policy state

## References

- [Strategic Roadmap — Phase 1.1](strategic-roadmap.md)
- [Policy DSL Specification](policy-dsl-spec.md)
- [Unified Architecture](unified-architecture.md)

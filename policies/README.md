# Policy Packs

Pre-built policy sets for common governance scenarios. Load a pack with:

```bash
agentguard guard --policy policies/<pack>/agentguard-pack.yaml
```

## Choosing a Pack

| Pack | Severity | Best for | Philosophy |
|------|----------|----------|------------|
| **open-source** | 2 | Community projects, personal repos | Permissive — protects main branch and credentials, allows most else |
| **ci-safe** | 3 | CI/CD pipelines, automated runs | Read-only — forbids all mutations, allows read + test |
| **enterprise** | 4 | Corporate environments, regulated codebases | Comprehensive — audit requirements, branch protection, deploy gates |
| **strict** | 5 | Security-critical systems, production infra | Maximum safety — denies most operations by default |

## Pack Details

### open-source
Balanced rules for open-source projects. Protects main/master branches and credential files while keeping development friction low. Good starting point for most projects.

### ci-safe
Minimal attack surface for CI/CD. Blocks all write operations, shell mutations, and infrastructure changes. Allows file reads, test execution, and linting. Use this in automated pipelines where agents should observe but not modify.

### enterprise
Comprehensive rules for corporate environments. Includes `curl` blocking to prevent data exfiltration, strict branch protection, deploy gates, and audit-trail requirements. Suitable for teams with compliance needs.

### strict
Maximum safety for security-critical systems. Denies most operations by default and requires explicit allow rules for each action class. Use when the cost of an unauthorized action is very high.

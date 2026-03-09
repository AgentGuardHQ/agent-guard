/**
 * Scenario: Policy Violation (Force Push to Protected Branch)
 *
 * Demonstrates multiple governance layers firing simultaneously:
 * policy deny rule + invariant violations for git push --force origin main.
 *
 * Run: npx tsx examples/governance/policy-violation.ts
 * Requires: npm run build:ts
 */

import { createEngine } from '../../dist/agentguard/core/engine.js';

const engine = createEngine({
  policyDefs: [
    {
      id: 'branch-safety',
      name: 'Branch Safety Policy',
      severity: 4,
      rules: [
        {
          action: 'git.force-push',
          effect: 'deny',
          reason: 'Force push is prohibited',
        },
        {
          action: 'git.push',
          effect: 'deny',
          conditions: { branches: ['main', 'master'] },
          reason: 'Direct push to protected branch',
        },
      ],
    },
  ],
});

console.log('=== Scenario: Policy Violation (Force Push) ===\n');
console.log(`Policies loaded: ${engine.getPolicyCount()}`);
console.log(`Invariants active: ${engine.getInvariantCount()}\n`);

// Agent attempts git push --force origin main
const result = engine.evaluate({
  tool: 'Bash',
  command: 'git push --force origin main',
  agent: 'builder-agent',
});

console.log('Action: git push --force origin main');
console.log(`Allowed: ${result.allowed}`);
console.log(`Intervention: ${result.intervention}`);
console.log(`Intent action: ${result.intent.action}`);
console.log(`Intent branch: ${result.intent.branch}`);
console.log(`Decision: ${result.decision.decision}`);
console.log(`Reason: ${result.decision.reason}`);
console.log(`Policy severity: ${result.decision.severity}`);

if (result.violations.length > 0) {
  console.log(`\nInvariant Violations (${result.violations.length}):`);
  for (const v of result.violations) {
    console.log(`  [${v.invariantId}] ${v.name} (severity ${v.severity})`);
    console.log(`    Expected: ${v.expected}`);
    console.log(`    Actual:   ${v.actual}`);
  }
}

if (result.evidencePack) {
  console.log(`\nEvidence Pack:`);
  console.log(`  ID: ${result.evidencePack.packId}`);
  console.log(`  Summary: ${result.evidencePack.summary}`);
  console.log(`  Severity: ${result.evidencePack.severity}`);
  console.log(`  Violation count: ${result.evidencePack.violations.length}`);
}

console.log(`\nEvents emitted: ${result.events.length}`);
for (const event of result.events) {
  console.log(`  ${event.kind}`);
}

// Verify
console.log('\n--- Verification ---');
console.log(
  `Multi-layer governance fired: ${result.violations.length >= 1 && result.decision.decision === 'deny' ? 'PASS' : 'FAIL'}`
);
console.log(`Force push blocked: ${!result.allowed ? 'PASS' : 'FAIL'}`);

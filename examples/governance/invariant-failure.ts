/**
 * Scenario: Invariant Failure (Blast Radius Exceeded)
 *
 * Demonstrates that invariants override permissive policies.
 * The policy allows file.write, but the blast-radius-limit invariant
 * denies the action because 25 files > 20 file limit.
 *
 * Run: npx tsx examples/governance/invariant-failure.ts
 * Requires: npm run build:ts
 */

import { createEngine } from '../../dist/agentguard/core/engine.js';

const engine = createEngine({
  policyDefs: [
    {
      id: 'dev-policy',
      name: 'Development Policy',
      severity: 2,
      rules: [
        {
          action: 'file.*',
          effect: 'allow',
          conditions: { limit: 20 },
        },
      ],
    },
  ],
});

console.log('=== Scenario: Invariant Failure (Blast Radius) ===\n');
console.log(`Policies loaded: ${engine.getPolicyCount()}`);
console.log(`Invariants active: ${engine.getInvariantCount()}\n`);

// Agent modifies 25 files in a single operation
const result = engine.evaluate({
  tool: 'Write',
  file: 'src/refactored-module.ts',
  agent: 'optimizer-agent',
  filesAffected: 25,
});

console.log('Action: file.write affecting 25 files');
console.log(`Policy decision: ${result.decision.decision}`);
console.log(`Policy reason: ${result.decision.reason}`);
console.log(`Policy allowed: ${result.decision.allowed}`);
console.log(`\nFinal allowed (policy AND invariants): ${result.allowed}`);
console.log(`Intervention: ${result.intervention}`);

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
}

console.log(`\nEvents emitted: ${result.events.length}`);
for (const event of result.events) {
  console.log(`  ${event.kind}`);
}

// Verify
console.log('\n--- Verification ---');
console.log(
  `Policy allowed but invariant denied: ${result.decision.allowed && !result.allowed ? 'PASS' : 'FAIL'}`
);
console.log(
  `Blast radius invariant fired: ${result.violations.some((v) => v.invariantId === 'blast-radius-limit') ? 'PASS' : 'FAIL'}`
);
console.log(`Intervention is ROLLBACK: ${result.intervention === 'rollback' ? 'PASS' : 'FAIL'}`);

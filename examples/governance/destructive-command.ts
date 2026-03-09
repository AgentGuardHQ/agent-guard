/**
 * Scenario: Destructive Command Detection
 *
 * Demonstrates the AAB blocking a destructive command (rm -rf /)
 * with maximum severity and immediate denial.
 *
 * Run: npx tsx examples/governance/destructive-command.ts
 * Requires: npm run build:ts
 */

import { createEngine } from '../../dist/agentguard/core/engine.js';

const engine = createEngine();

console.log('=== Scenario: Destructive Command Detection ===\n');

// Agent attempts rm -rf /
const result = engine.evaluate({
  tool: 'Bash',
  command: 'rm -rf /',
  agent: 'builder-agent',
});

console.log('Action: rm -rf / via Bash tool');
console.log(`Allowed: ${result.allowed}`);
console.log(`Intervention: ${result.intervention}`);
console.log(`Intent action: ${result.intent.action}`);
console.log(`Destructive: ${result.intent.destructive}`);
console.log(`Decision: ${result.decision.decision}`);
console.log(`Reason: ${result.decision.reason}`);
console.log(`Severity: ${result.decision.severity}`);
console.log(`Violations: ${result.violations.length}`);
console.log(`Events emitted: ${result.events.length}`);

if (result.evidencePack) {
  console.log(`\nEvidence Pack:`);
  console.log(`  ID: ${result.evidencePack.packId}`);
  console.log(`  Summary: ${result.evidencePack.summary}`);
  console.log(`  Severity: ${result.evidencePack.severity}`);
}

console.log('\n--- Events ---');
for (const event of result.events) {
  console.log(`  ${event.kind}: ${JSON.stringify(event.data)}`);
}

// Verify the critical property
console.log('\n--- Verification ---');
console.log(
  `Destructive command blocked: ${!result.allowed && result.intervention === 'deny' ? 'PASS' : 'FAIL'}`
);
console.log(`Maximum severity applied: ${result.decision.severity === 5 ? 'PASS' : 'FAIL'}`);

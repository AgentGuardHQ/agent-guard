#!/usr/bin/env node
// Minimal example: create a kernel and evaluate one action.
// Run: node examples/evaluate-action.js (after npm run build:ts)

import { createKernel } from '../dist/agentguard/kernel.js';
import { loadYamlPolicy } from '../dist/agentguard/policies/yaml-loader.js';
import { readFileSync } from 'node:fs';

const policy = loadYamlPolicy(readFileSync('agentguard.yaml', 'utf8'));
const kernel = createKernel({ dryRun: true, policyDefs: [policy] });

const result = await kernel.propose({
  tool: 'Bash',
  command: 'git push origin main',
  agent: 'my-agent',
});

console.log(result.allowed ? 'ALLOWED' : 'DENIED');
console.log('Action:', result.decision.intent.action);
console.log('Reason:', result.decision.decision.reason);

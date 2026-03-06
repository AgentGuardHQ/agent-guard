#!/usr/bin/env node

// BugMon Battle Simulator CLI
// Usage: node simulation/cli.js [--battles N] [--strategy random|highestDamage|typeAware|mixed] [--seed N]

import { readFile } from 'fs/promises';
import { simulate } from './simulator.js';
import { generateReport } from './report.js';
import { STRATEGIES } from './strategies.js';

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const idx = args.indexOf('--' + name);
  if (idx === -1) return fallback;
  return args[idx + 1] || fallback;
}

async function main() {
  const numBattles = parseInt(getArg('battles', '10000'), 10);
  const strategyKey = getArg('strategy', 'mixed');
  const seed = parseInt(getArg('seed', String(Date.now())), 10);

  if (!STRATEGIES[strategyKey]) {
    console.error(`Unknown strategy: ${strategyKey}`);
    console.error(`Available: ${Object.keys(STRATEGIES).join(', ')}`);
    process.exit(1);
  }

  const strategy = STRATEGIES[strategyKey];

  // Load game data
  const root = new URL('../', import.meta.url);
  const monsters = JSON.parse(await readFile(new URL('data/monsters.json', root), 'utf-8'));
  const moves = JSON.parse(await readFile(new URL('data/moves.json', root), 'utf-8'));
  const types = JSON.parse(await readFile(new URL('data/types.json', root), 'utf-8'));

  console.log(`Running ${numBattles} battles with "${strategy.name}" strategy (seed: ${seed})...`);
  console.log('');

  const startTime = performance.now();
  const result = simulate(monsters, moves, types.effectiveness, strategy.fn, numBattles, seed, strategy.name);
  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

  const report = generateReport(result);
  console.log(report);
  console.log(`  Completed in ${elapsed}s`);
  console.log('');
}

main().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});

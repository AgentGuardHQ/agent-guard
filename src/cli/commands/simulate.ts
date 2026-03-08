/**
 * simulate command — Battle simulation and balance analysis.
 *
 * Supports verbose single battles, statistical analysis, round-robin,
 * and strategy comparison modes.
 */

import type { Command } from 'commander';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import type { Bugmon, BattleMove, TypeChart } from '../../core/types.js';
import type { SimulationResult } from '../../domain/battle.js';
import { createRNG } from '../../domain/rng.js';
import { STRATEGIES } from '../../domain/strategies.js';
import type { StrategyEntry } from '../../domain/strategies.js';
import {
  simulate,
  compareStrategies,
  compareAllStrategies,
  runBattle,
} from '../../domain/simulator.js';
import type { SimulateResult, CompareAllResult } from '../../domain/simulator.js';

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function loadData(): Promise<{
  monsters: Bugmon[];
  moves: BattleMove[];
  types: { effectiveness: TypeChart };
}> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const root = resolve(__dirname, '..', '..', '..');
  const monsters = JSON.parse(
    await readFile(resolve(root, 'ecosystem/data/monsters.json'), 'utf-8')
  );
  const moves = JSON.parse(await readFile(resolve(root, 'ecosystem/data/moves.json'), 'utf-8'));
  const types = JSON.parse(await readFile(resolve(root, 'ecosystem/data/types.json'), 'utf-8'));
  return { monsters, moves, types };
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

const OVERPOWERED_THRESHOLD = 60;
const UNDERPOWERED_THRESHOLD = 40;

function pad(str: string | number, len: number): string {
  return String(str).padEnd(len);
}

export function generateReport(simResult: SimulateResult): string {
  const { stats, totalBattles } = simResult;
  const entries = Object.values(stats).sort((a, b) => {
    const wrA = a.wins / a.totalBattles;
    const wrB = b.wins / b.totalBattles;
    return wrB - wrA;
  });

  const lines: string[] = [];

  lines.push('');
  lines.push('==========================================================');
  lines.push('              BugMon Balance Report');
  lines.push('==========================================================');
  lines.push(`  Total battles simulated: ${totalBattles}`);
  lines.push(`  Strategy: ${simResult.strategy}`);
  lines.push('==========================================================');
  lines.push('');

  lines.push('  OVERALL WIN RATES');
  lines.push('  -----------------');
  lines.push('');
  lines.push(
    '  ' +
      pad('Name', 20) +
      pad('Type', 10) +
      pad('Win%', 8) +
      pad('W', 6) +
      pad('L', 6) +
      pad('Avg Dmg', 10) +
      pad('Avg Turns', 10) +
      'Status'
  );
  lines.push('  ' + '-'.repeat(78));

  for (const s of entries) {
    const winRate = ((s.wins / s.totalBattles) * 100).toFixed(1);
    const avgDmg = (s.totalDamageDealt / s.totalBattles).toFixed(1);
    const avgTurns = (s.totalTurns / s.totalBattles).toFixed(1);
    let status = '';
    if (parseFloat(winRate) >= OVERPOWERED_THRESHOLD) status = '\u26A0 overpowered';
    else if (parseFloat(winRate) <= UNDERPOWERED_THRESHOLD) status = '\u25BC underpowered';
    else status = '\u2713 balanced';

    lines.push(
      '  ' +
        pad(s.name, 20) +
        pad(s.type, 10) +
        pad(winRate + '%', 8) +
        pad(String(s.wins), 6) +
        pad(String(s.losses), 6) +
        pad(avgDmg, 10) +
        pad(avgTurns, 10) +
        status
    );
  }

  lines.push('');

  const balanced = entries.filter((s) => {
    const wr = (s.wins / s.totalBattles) * 100;
    return wr > UNDERPOWERED_THRESHOLD && wr < OVERPOWERED_THRESHOLD;
  }).length;
  const healthPct = Math.round((balanced / entries.length) * 100);
  lines.push(
    `  Balance Health: ${healthPct}% (${balanced}/${entries.length} BugMon in balanced range)`
  );
  lines.push('');

  lines.push('  TYPE PERFORMANCE');
  lines.push('  ----------------');
  const typeStats: Record<string, { wins: number; total: number }> = {};
  for (const s of entries) {
    if (!typeStats[s.type]) typeStats[s.type] = { wins: 0, total: 0 };
    typeStats[s.type].wins += s.wins;
    typeStats[s.type].total += s.totalBattles;
  }
  for (const [type, ts] of Object.entries(typeStats)) {
    const wr = ((ts.wins / ts.total) * 100).toFixed(1);
    lines.push(`  ${pad(type, 12)} ${wr}% avg win rate`);
  }
  lines.push('');

  lines.push('  MOST LOPSIDED MATCHUPS');
  lines.push('  ----------------------');
  const matchups: { winner: string; loser: string; dominance: number; record: string }[] = [];
  for (const s of entries) {
    for (const [opp, m] of Object.entries(s.matchups)) {
      const total = m.wins + m.losses + m.draws;
      if (total > 0 && m.wins > m.losses) {
        const dominance = parseFloat(((m.wins / total) * 100).toFixed(0));
        matchups.push({
          winner: s.name,
          loser: opp,
          dominance,
          record: `${m.wins}-${m.losses}`,
        });
      }
    }
  }
  matchups.sort((a, b) => b.dominance - a.dominance);
  const top10 = matchups.slice(0, 10);
  for (const m of top10) {
    lines.push(`  ${pad(m.winner, 20)} beats ${pad(m.loser, 20)} ${m.dominance}% (${m.record})`);
  }
  lines.push('');

  lines.push('  STAT ANALYSIS');
  lines.push('  -------------');
  const sorted = [...entries];

  sorted.sort((a, b) => b.attack - a.attack);
  lines.push(
    `  Highest ATK:   ${sorted[0].name} (${sorted[0].attack}) \u2014 ${((sorted[0].wins / sorted[0].totalBattles) * 100).toFixed(1)}% win rate`
  );

  sorted.sort((a, b) => b.defense - a.defense);
  lines.push(
    `  Highest DEF:   ${sorted[0].name} (${sorted[0].defense}) \u2014 ${((sorted[0].wins / sorted[0].totalBattles) * 100).toFixed(1)}% win rate`
  );

  sorted.sort((a, b) => b.speed - a.speed);
  lines.push(
    `  Highest SPD:   ${sorted[0].name} (${sorted[0].speed}) \u2014 ${((sorted[0].wins / sorted[0].totalBattles) * 100).toFixed(1)}% win rate`
  );

  sorted.sort((a, b) => b.hp - a.hp);
  lines.push(
    `  Highest HP:    ${sorted[0].name} (${sorted[0].hp}) \u2014 ${((sorted[0].wins / sorted[0].totalBattles) * 100).toFixed(1)}% win rate`
  );
  lines.push('');

  lines.push('==========================================================');
  lines.push('');

  return lines.join('\n');
}

export function generateComparisonReport(comparisonResult: CompareAllResult): string {
  const { results, strategyNames } = comparisonResult;
  const lines: string[] = [];

  lines.push('');
  lines.push('==========================================================');
  lines.push('          Strategy Comparison Report');
  lines.push('==========================================================');
  lines.push('');

  lines.push('  HEAD-TO-HEAD RESULTS');
  lines.push('  --------------------');
  lines.push('');
  lines.push(
    '  ' +
      pad('Strategy A', 18) +
      pad('Strategy B', 18) +
      pad('A Wins', 10) +
      pad('B Wins', 10) +
      pad('Draws', 8) +
      'A Win%'
  );
  lines.push('  ' + '-'.repeat(72));

  for (const r of results) {
    const aRate = ((r.winsA / r.totalBattles) * 100).toFixed(1);
    lines.push(
      '  ' +
        pad(r.strategyA, 18) +
        pad(r.strategyB, 18) +
        pad(String(r.winsA), 10) +
        pad(String(r.winsB), 10) +
        pad(String(r.draws), 8) +
        aRate +
        '%'
    );
  }
  lines.push('');

  lines.push('  OVERALL RANKINGS');
  lines.push('  ----------------');
  lines.push('');

  const totals: Record<string, { wins: number; losses: number; draws: number; battles: number }> =
    {};
  for (const name of strategyNames) {
    totals[name] = { wins: 0, losses: 0, draws: 0, battles: 0 };
  }

  for (const r of results) {
    totals[r.strategyA].wins += r.winsA;
    totals[r.strategyA].losses += r.winsB;
    totals[r.strategyA].draws += r.draws;
    totals[r.strategyA].battles += r.totalBattles;
    totals[r.strategyB].wins += r.winsB;
    totals[r.strategyB].losses += r.winsA;
    totals[r.strategyB].draws += r.draws;
    totals[r.strategyB].battles += r.totalBattles;
  }

  const ranked = Object.entries(totals)
    .map(([name, t]) => ({ name, ...t, rate: t.battles > 0 ? t.wins / t.battles : 0 }))
    .sort((a, b) => b.rate - a.rate);

  lines.push(
    '  ' + pad('Rank', 6) + pad('Strategy', 18) + pad('Win%', 8) + pad('W', 8) + pad('L', 8) + 'D'
  );
  lines.push('  ' + '-'.repeat(54));

  ranked.forEach((r, i) => {
    const rate = (r.rate * 100).toFixed(1);
    lines.push(
      '  ' +
        pad(String(i + 1), 6) +
        pad(r.name, 18) +
        pad(rate + '%', 8) +
        pad(String(r.wins), 8) +
        pad(String(r.losses), 8) +
        String(r.draws)
    );
  });

  lines.push('');
  lines.push('==========================================================');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Verbose battle display (from simulate.js)
// ---------------------------------------------------------------------------

function verboseBattle(
  monA: Bugmon,
  monB: Bugmon,
  movesData: readonly BattleMove[],
  typeChart: TypeChart,
  strategy: StrategyEntry
): SimulationResult {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${monA.name} (${monA.type}) vs ${monB.name} (${monB.type})`);
  console.log(`  Strategy: ${strategy.name}`);
  console.log(`${'='.repeat(50)}`);
  console.log(
    `  ${monA.name}: HP ${monA.hp} | ATK ${monA.attack} | DEF ${monA.defense} | SPD ${monA.speed}`
  );
  console.log(
    `  ${monB.name}: HP ${monB.hp} | ATK ${monB.attack} | DEF ${monB.defense} | SPD ${monB.speed}`
  );
  console.log();

  const rng = createRNG(Date.now());
  const result = runBattle(monA, monB, movesData, typeChart, strategy.fn, strategy.fn, rng);

  for (let idx = 0; idx < result.log.length; idx++) {
    const e = result.log[idx] as Record<string, unknown>;
    const prev = idx > 0 ? (result.log[idx - 1] as Record<string, unknown>) : undefined;
    if ((e.turn as number) > ((prev?.turn as number) ?? 0)) {
      console.log(`Turn ${e.turn}`);
    }

    if (e.healing) {
      console.log(`  ${e.attacker} used ${e.move}`);
      console.log(`  Healed ${e.healing} HP (HP: ${e.targetHP})`);
    } else {
      let effectText = '';
      if ((e.effectiveness as number) > 1.0) effectText = ' (super effective!)';
      else if ((e.effectiveness as number) < 1.0) effectText = ' (not very effective)';

      console.log(`  ${e.attacker} used ${e.move}`);
      console.log(`  Damage: ${e.damage}${effectText} (HP: ${e.targetHP})`);
    }
  }

  console.log();
  const winner = result.winner === 'A' ? monA.name : result.winner === 'B' ? monB.name : 'Draw';
  console.log(`Winner: ${winner} (${result.turns} turns)`);
  console.log();

  return result;
}

function runStatistical(
  monA: Bugmon,
  monB: Bugmon,
  movesData: readonly BattleMove[],
  typeChart: TypeChart,
  runs: number,
  strategy: StrategyEntry
): void {
  let winsA = 0;
  let winsB = 0;
  let totalTurns = 0;

  for (let i = 0; i < runs; i++) {
    const rng = createRNG(i);
    const result = runBattle(monA, monB, movesData, typeChart, strategy.fn, strategy.fn, rng);
    if (result.winner === 'A') winsA++;
    else if (result.winner === 'B') winsB++;
    totalTurns += result.turns;
  }

  console.log(`\n${monA.name} vs ${monB.name} \u2014 ${runs} battles (${strategy.name})`);
  console.log(`${'\u2500'.repeat(40)}`);
  console.log(`  ${monA.name} wins: ${winsA} (${((winsA / runs) * 100).toFixed(1)}%)`);
  console.log(`  ${monB.name} wins: ${winsB} (${((winsB / runs) * 100).toFixed(1)}%)`);
  console.log(`  Avg turns: ${(totalTurns / runs).toFixed(1)}`);
  console.log();
}

function roundRobin(
  monsters: readonly Bugmon[],
  movesData: readonly BattleMove[],
  typeChart: TypeChart,
  runs: number,
  strategy: StrategyEntry
): void {
  console.log(`\nFull Roster Round-Robin (${runs} battles each, ${strategy.name})\n`);

  const results: Record<string, { wins: number; losses: number }> = {};
  for (const mon of monsters) {
    results[mon.name] = { wins: 0, losses: 0 };
  }

  for (let i = 0; i < monsters.length; i++) {
    for (let j = i + 1; j < monsters.length; j++) {
      const monA = monsters[i];
      const monB = monsters[j];

      let winsA = 0;
      for (let r = 0; r < runs; r++) {
        const rng = createRNG(i * 10000 + j * 100 + r);
        const result = runBattle(monA, monB, movesData, typeChart, strategy.fn, strategy.fn, rng);
        if (result.winner === 'A') winsA++;
      }

      results[monA.name].wins += winsA;
      results[monA.name].losses += runs - winsA;
      results[monB.name].wins += runs - winsA;
      results[monB.name].losses += winsA;
    }
  }

  const ranked = Object.entries(results)
    .map(([name, r]) => ({
      name,
      wins: r.wins,
      losses: r.losses,
      rate: r.wins / (r.wins + r.losses),
    }))
    .sort((a, b) => b.rate - a.rate);

  console.log('Rank  Name                  Win Rate    W / L');
  console.log('\u2500'.repeat(55));
  ranked.forEach((r, i) => {
    const name = r.name.padEnd(20);
    const rate = (r.rate * 100).toFixed(1).padStart(5) + '%';
    const record = `${String(r.wins).padStart(4)} / ${r.losses}`;
    console.log(`  ${String(i + 1).padStart(2)}  ${name}  ${rate}    ${record}`);
  });
  console.log();
}

// ---------------------------------------------------------------------------
// Commander command registration
// ---------------------------------------------------------------------------

function findMonster(monsters: readonly Bugmon[], name: string): Bugmon {
  const mon = monsters.find((m) => m.name.toLowerCase() === name.toLowerCase());
  if (!mon) {
    console.error(`Unknown BugMon: "${name}"`);
    console.error(`Available: ${monsters.map((m) => m.name).join(', ')}`);
    process.exit(1);
  }
  return mon;
}

export function registerSimulateCommand(program: Command): void {
  program
    .command('simulate [monA] [monB]')
    .description('Run battle simulations for balance analysis')
    .option('--runs <n>', 'Number of battles for statistical analysis')
    .option('--all', 'Full roster round-robin')
    .option(
      '--compare [strategies...]',
      'Compare strategies (optionally specify two strategy keys)'
    )
    .option('--strategy <name>', 'AI strategy to use', 'mixed')
    .option('--strategy-key <name>', 'Alias for --strategy', 'mixed')
    .option('--battles <n>', 'Number of battles (for --all/--compare modes)', '10000')
    .option('--seed <n>', 'Random seed')
    .action(
      async (
        monAName: string | undefined,
        monBName: string | undefined,
        options: {
          runs?: string;
          all?: boolean;
          compare?: true | string[];
          strategy?: string;
          strategyKey?: string;
          battles?: string;
          seed?: string;
        }
      ) => {
        const { monsters, moves, types } = await loadData();
        const typeChart = types.effectiveness;

        const strategyKey = options.strategy || options.strategyKey || 'mixed';
        if (!STRATEGIES[strategyKey]) {
          console.error(`Unknown strategy: ${strategyKey}`);
          console.error(`Available: ${Object.keys(STRATEGIES).join(', ')}`);
          process.exit(1);
        }
        const strategy = STRATEGIES[strategyKey];
        const seed = options.seed ? parseInt(options.seed, 10) : Date.now();

        // --- Compare mode ---
        if (options.compare !== undefined) {
          const numBattles = parseInt(options.battles || '5000', 10);
          const compareArgs = Array.isArray(options.compare) ? options.compare : [];

          if (compareArgs.length >= 2) {
            const [keyA, keyB] = compareArgs;
            if (!STRATEGIES[keyA] || !STRATEGIES[keyB]) {
              console.error(`Unknown strategy. Available: ${Object.keys(STRATEGIES).join(', ')}`);
              process.exit(1);
            }

            console.log(
              `Comparing "${STRATEGIES[keyA].name}" vs "${STRATEGIES[keyB].name}" (${numBattles} battles, seed: ${seed})...`
            );
            console.log('');

            const startTime = performance.now();
            const result = compareStrategies(
              monsters,
              moves,
              typeChart,
              STRATEGIES[keyA].fn,
              STRATEGIES[keyB].fn,
              numBattles,
              seed,
              STRATEGIES[keyA].name,
              STRATEGIES[keyB].name
            );
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

            const report = generateComparisonReport({
              results: [result],
              strategyNames: [STRATEGIES[keyA].name, STRATEGIES[keyB].name],
            });
            console.log(report);
            console.log(`  Completed in ${elapsed}s`);
            console.log('');
          } else {
            console.log(
              `Comparing all ${Object.keys(STRATEGIES).length} strategies (${numBattles} battles each, seed: ${seed})...`
            );
            console.log('');

            const startTime = performance.now();
            const result = compareAllStrategies(
              monsters,
              moves,
              typeChart,
              STRATEGIES,
              numBattles,
              seed
            );
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

            const report = generateComparisonReport(result);
            console.log(report);
            console.log(`  Completed in ${elapsed}s`);
            console.log('');
          }
          return;
        }

        // --- Round-robin mode (--all) ---
        if (options.all) {
          const numBattles = parseInt(options.battles || '10000', 10);

          if (options.runs) {
            // --all --runs N: simple round-robin (from simulate.js)
            roundRobin(monsters, moves, typeChart, parseInt(options.runs, 10), strategy);
          } else {
            // --all --battles N: full statistical report (from simulation/cli.js)
            console.log(
              `Running ${numBattles} battles with "${strategy.name}" strategy (seed: ${seed})...`
            );
            console.log('');

            const startTime = performance.now();
            const result = simulate(
              monsters,
              moves,
              typeChart,
              strategy.fn,
              numBattles,
              seed,
              strategy.name
            );
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

            const report = generateReport(result);
            console.log(report);
            console.log(`  Completed in ${elapsed}s`);
            console.log('');
          }
          return;
        }

        // --- Specific matchup ---
        if (monAName && monBName) {
          const monA = findMonster(monsters, monAName);
          const monB = findMonster(monsters, monBName);

          if (options.runs) {
            runStatistical(monA, monB, moves, typeChart, parseInt(options.runs, 10), strategy);
          } else {
            verboseBattle(monA, monB, moves, typeChart, strategy);
          }
          return;
        }

        // --- Random matchup ---
        const a = Math.floor(Math.random() * monsters.length);
        let b = Math.floor(Math.random() * (monsters.length - 1));
        if (b >= a) b++;
        verboseBattle(monsters[a], monsters[b], moves, typeChart, strategy);
      }
    );
}

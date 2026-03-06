#!/usr/bin/env node
// Battle Simulator CLI
//
// Usage:
//   npm run simulate                          # random matchup
//   npm run simulate -- NullPointer Deadlock   # specific matchup
//   npm run simulate -- --all                  # full roster round-robin
//   npm run simulate -- --runs 1000            # statistical analysis

import { readFileSync } from 'fs';
import { simulateBattle, createBattleState, getTurnOrder, resolveMove, applyDamage, isFainted } from './battle/battle-core.js';

// Load game data
const monsters = JSON.parse(readFileSync('data/monsters.json', 'utf-8'));
const movesData = JSON.parse(readFileSync('data/moves.json', 'utf-8'));
const typeData = JSON.parse(readFileSync('data/types.json', 'utf-8'));

function findMonster(name) {
  const mon = monsters.find(m => m.name.toLowerCase() === name.toLowerCase());
  if (!mon) {
    console.error(`Unknown BugMon: "${name}"`);
    console.error(`Available: ${monsters.map(m => m.name).join(', ')}`);
    process.exit(1);
  }
  return mon;
}

function verboseBattle(monA, monB) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${monA.name} (${monA.type}) vs ${monB.name} (${monB.type})`);
  console.log(`${'='.repeat(50)}`);
  console.log(`  ${monA.name}: HP ${monA.hp} | ATK ${monA.attack} | DEF ${monA.defense} | SPD ${monA.speed}`);
  console.log(`  ${monB.name}: HP ${monB.hp} | ATK ${monB.attack} | DEF ${monB.defense} | SPD ${monB.speed}`);
  console.log();

  let state = createBattleState(monA, monB);

  while (!state.outcome && state.turn < 100) {
    const turn = state.turn + 1;

    // Pick random moves
    const moveIdA = monA.moves[Math.floor(Math.random() * monA.moves.length)];
    const moveIdB = monB.moves[Math.floor(Math.random() * monB.moves.length)];
    const moveA = movesData.find(m => m.id === moveIdA);
    const moveB = movesData.find(m => m.id === moveIdB);

    const first = getTurnOrder(state.playerMon, state.enemy);
    const attacks = first === 'player'
      ? [{ name: state.playerMon.name, mon: state.playerMon, move: moveA, target: state.enemy, side: 'player' },
         { name: state.enemy.name, mon: state.enemy, move: moveB, target: state.playerMon, side: 'enemy' }]
      : [{ name: state.enemy.name, mon: state.enemy, move: moveB, target: state.playerMon, side: 'enemy' },
         { name: state.playerMon.name, mon: state.playerMon, move: moveA, target: state.enemy, side: 'player' }];

    console.log(`Turn ${turn}`);

    let playerMon = { ...state.playerMon };
    let enemy = { ...state.enemy };

    for (const atk of attacks) {
      const currentAttacker = atk.side === 'player' ? playerMon : enemy;
      const currentDefender = atk.side === 'player' ? enemy : playerMon;

      if (isFainted(currentAttacker)) continue;

      const { damage, effectiveness } = resolveMove(currentAttacker, atk.move, currentDefender, typeData.effectiveness);

      let effectText = '';
      if (effectiveness > 1.0) effectText = ' (super effective!)';
      else if (effectiveness < 1.0) effectText = ' (not very effective)';

      console.log(`  ${currentAttacker.name} used ${atk.move.name}`);
      console.log(`  Damage: ${damage}${effectText}`);

      if (atk.side === 'player') {
        enemy = applyDamage(enemy, damage);
        console.log(`  ${enemy.name} HP: ${enemy.currentHP}/${monB.hp}`);
      } else {
        playerMon = applyDamage(playerMon, damage);
        console.log(`  ${playerMon.name} HP: ${playerMon.currentHP}/${monA.hp}`);
      }

      if (isFainted(atk.side === 'player' ? enemy : playerMon)) {
        const faintedName = atk.side === 'player' ? enemy.name : playerMon.name;
        console.log(`  ${faintedName} fainted!`);
        break;
      }
    }

    console.log();

    let outcome = null;
    if (isFainted(enemy)) outcome = 'win';
    else if (isFainted(playerMon)) outcome = 'lose';

    state = {
      playerMon,
      enemy,
      turn,
      log: state.log,
      outcome,
    };
  }

  const winner = state.outcome === 'win' ? monA.name : monB.name;
  console.log(`Winner: ${winner} (${state.turn} turns)`);
  console.log();

  return state;
}

function runStatistical(monA, monB, runs) {
  let winsA = 0;
  let winsB = 0;
  let totalTurns = 0;

  for (let i = 0; i < runs; i++) {
    const result = simulateBattle(monA, monB, movesData, typeData);
    if (result.outcome === 'win') winsA++;
    else winsB++;
    totalTurns += result.turn;
  }

  console.log(`\n${monA.name} vs ${monB.name} — ${runs} battles`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`  ${monA.name} wins: ${winsA} (${(winsA / runs * 100).toFixed(1)}%)`);
  console.log(`  ${monB.name} wins: ${winsB} (${(winsB / runs * 100).toFixed(1)}%)`);
  console.log(`  Avg turns: ${(totalTurns / runs).toFixed(1)}`);
  console.log();
}

function roundRobin(runs) {
  console.log(`\nFull Roster Round-Robin (${runs} battles each)\n`);

  const results = {};
  for (const mon of monsters) {
    results[mon.name] = { wins: 0, losses: 0 };
  }

  for (let i = 0; i < monsters.length; i++) {
    for (let j = i + 1; j < monsters.length; j++) {
      const monA = monsters[i];
      const monB = monsters[j];

      let winsA = 0;
      for (let r = 0; r < runs; r++) {
        const result = simulateBattle(monA, monB, movesData, typeData);
        if (result.outcome === 'win') winsA++;
      }

      results[monA.name].wins += winsA;
      results[monA.name].losses += runs - winsA;
      results[monB.name].wins += runs - winsA;
      results[monB.name].losses += winsA;
    }
  }

  // Sort by win rate
  const ranked = Object.entries(results)
    .map(([name, r]) => ({
      name,
      wins: r.wins,
      losses: r.losses,
      rate: r.wins / (r.wins + r.losses),
    }))
    .sort((a, b) => b.rate - a.rate);

  console.log('Rank  Name                  Win Rate    W / L');
  console.log('─'.repeat(55));
  ranked.forEach((r, i) => {
    const name = r.name.padEnd(20);
    const rate = (r.rate * 100).toFixed(1).padStart(5) + '%';
    const record = `${String(r.wins).padStart(4)} / ${r.losses}`;
    console.log(`  ${String(i + 1).padStart(2)}  ${name}  ${rate}    ${record}`);
  });
  console.log();
}

// Parse CLI args
const args = process.argv.slice(2);

if (args.includes('--all')) {
  const runsIdx = args.indexOf('--runs');
  const runs = runsIdx !== -1 ? parseInt(args[runsIdx + 1], 10) : 100;
  roundRobin(runs);
} else if (args.length >= 2 && !args[0].startsWith('-')) {
  const monA = findMonster(args[0]);
  const monB = findMonster(args[1]);
  const runsIdx = args.indexOf('--runs');

  if (runsIdx !== -1) {
    const runs = parseInt(args[runsIdx + 1], 10);
    runStatistical(monA, monB, runs);
  } else {
    verboseBattle(monA, monB);
  }
} else if (args.length === 0 || (args.length === 1 && args[0] === '--help')) {
  if (args[0] === '--help') {
    console.log(`
BugMon Battle Simulator

Usage:
  npm run simulate                              Random matchup (verbose)
  npm run simulate -- MonA MonB                 Specific matchup (verbose)
  npm run simulate -- MonA MonB --runs 1000     Statistical analysis
  npm run simulate -- --all                     Full roster round-robin
  npm run simulate -- --all --runs 500          Round-robin with custom sample

Available BugMon:
  ${monsters.map(m => m.name).join(', ')}
`);
  } else {
    // Random matchup
    const a = Math.floor(Math.random() * monsters.length);
    let b = Math.floor(Math.random() * (monsters.length - 1));
    if (b >= a) b++;
    verboseBattle(monsters[a], monsters[b]);
  }
}

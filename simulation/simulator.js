// Battle simulator — runs N battles and collects aggregate statistics

import { createRNG } from './rng.js';
import { runBattle } from './headlessBattle.js';

export function simulate(monsters, movesData, typeChart, strategy, numBattles, baseSeed, strategyName) {
  const stats = {};

  // Init stats for each monster
  for (const mon of monsters) {
    stats[mon.name] = {
      name: mon.name,
      type: mon.type,
      hp: mon.hp,
      attack: mon.attack,
      defense: mon.defense,
      speed: mon.speed,
      wins: 0,
      losses: 0,
      draws: 0,
      totalBattles: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalTurns: 0,
      matchups: {} // per-opponent breakdown
    };
  }

  let battleIndex = 0;

  // Round-robin: every monster fights every other monster
  for (let i = 0; i < monsters.length; i++) {
    for (let j = i + 1; j < monsters.length; j++) {
      const monA = monsters[i];
      const monB = monsters[j];

      // Run multiple battles per matchup for statistical significance
      const battlesPerMatchup = Math.max(1, Math.floor(numBattles / (monsters.length * (monsters.length - 1) / 2)));

      for (let k = 0; k < battlesPerMatchup; k++) {
        const seed = baseSeed + battleIndex;
        const rng = createRNG(seed);
        battleIndex++;

        const result = runBattle(monA, monB, movesData, typeChart, strategy, strategy, rng);

        const sA = stats[monA.name];
        const sB = stats[monB.name];

        // Init matchup tracking
        if (!sA.matchups[monB.name]) sA.matchups[monB.name] = { wins: 0, losses: 0, draws: 0 };
        if (!sB.matchups[monA.name]) sB.matchups[monA.name] = { wins: 0, losses: 0, draws: 0 };

        if (result.winner === 'A') {
          sA.wins++;
          sB.losses++;
          sA.matchups[monB.name].wins++;
          sB.matchups[monA.name].losses++;
        } else if (result.winner === 'B') {
          sB.wins++;
          sA.losses++;
          sB.matchups[monA.name].wins++;
          sA.matchups[monB.name].losses++;
        } else {
          sA.draws++;
          sB.draws++;
          sA.matchups[monB.name].draws++;
          sB.matchups[monA.name].draws++;
        }

        sA.totalBattles++;
        sB.totalBattles++;
        sA.totalDamageDealt += result.totalDamage.a;
        sB.totalDamageDealt += result.totalDamage.b;
        sA.totalDamageTaken += result.totalDamage.b;
        sB.totalDamageTaken += result.totalDamage.a;
        sA.totalTurns += result.turns;
        sB.totalTurns += result.turns;
      }
    }
  }

  return {
    stats,
    totalBattles: battleIndex,
    strategy: strategyName || 'custom'
  };
}

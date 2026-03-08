// Battle simulator — runs N battles and collects aggregate statistics.
// Pure orchestration logic, no Node.js APIs, no DOM.

import type { Bugmon, BattleMove, TypeChart } from '../core/types.js';
import type { Strategy, SimulationResult } from './battle.js';
import type { StrategyEntry } from './strategies.js';
import { simulateBattle } from './battle.js';
import { createRNG } from './rng.js';

export interface MatchupStats {
  wins: number;
  losses: number;
  draws: number;
}

export interface MonsterStats {
  name: string;
  type: string;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  wins: number;
  losses: number;
  draws: number;
  totalBattles: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalTurns: number;
  matchups: Record<string, MatchupStats>;
}

export interface SimulateResult {
  stats: Record<string, MonsterStats>;
  totalBattles: number;
  strategy: string;
}

export interface ComparisonMatchup {
  monA: string;
  monB: string;
  aWins: number;
  bWins: number;
  draws: number;
  total: number;
}

export interface CompareResult {
  strategyA: string;
  strategyB: string;
  winsA: number;
  winsB: number;
  totalBattles: number;
  draws: number;
  matchups: ComparisonMatchup[];
}

export interface CompareAllResult {
  results: CompareResult[];
  strategyNames: string[];
}

export function simulate(
  monsters: readonly Bugmon[],
  movesData: readonly BattleMove[],
  typeChart: TypeChart,
  strategy: Strategy,
  numBattles: number,
  baseSeed: number,
  strategyName?: string
): SimulateResult {
  const stats: Record<string, MonsterStats> = {};

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
      matchups: {},
    };
  }

  let battleIndex = 0;

  for (let i = 0; i < monsters.length; i++) {
    for (let j = i + 1; j < monsters.length; j++) {
      const monA = monsters[i];
      const monB = monsters[j];

      const battlesPerMatchup = Math.max(
        1,
        Math.floor(numBattles / ((monsters.length * (monsters.length - 1)) / 2))
      );

      for (let k = 0; k < battlesPerMatchup; k++) {
        const seed = baseSeed + battleIndex;
        const rng = createRNG(seed);
        battleIndex++;

        const result = simulateBattle(monA, monB, movesData, { effectiveness: typeChart }, 100, {
          strategyA: strategy,
          strategyB: strategy,
          rng,
        }) as SimulationResult;

        const sA = stats[monA.name];
        const sB = stats[monB.name];

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
    strategy: strategyName || 'custom',
  };
}

/**
 * Compare two strategies head-to-head across all matchups.
 * Strategy A controls monster A, strategy B controls monster B.
 */
export function compareStrategies(
  monsters: readonly Bugmon[],
  movesData: readonly BattleMove[],
  typeChart: TypeChart,
  strategyA: Strategy,
  strategyB: Strategy,
  numBattles: number,
  baseSeed: number,
  nameA: string,
  nameB: string
): CompareResult {
  const winsA = { total: 0, battles: 0 };
  const winsB = { total: 0, battles: 0 };
  let battleIndex = 0;

  const matchups: ComparisonMatchup[] = [];

  for (let i = 0; i < monsters.length; i++) {
    for (let j = i + 1; j < monsters.length; j++) {
      const monA = monsters[i];
      const monB = monsters[j];
      const battlesPerMatchup = Math.max(
        1,
        Math.floor(numBattles / ((monsters.length * (monsters.length - 1)) / 2))
      );

      let aWins = 0;
      let bWins = 0;

      for (let k = 0; k < battlesPerMatchup; k++) {
        const seed = baseSeed + battleIndex;
        const rng = createRNG(seed);
        battleIndex++;

        const result = simulateBattle(monA, monB, movesData, { effectiveness: typeChart }, 100, {
          strategyA,
          strategyB,
          rng,
        }) as SimulationResult;

        if (result.winner === 'A') aWins++;
        else if (result.winner === 'B') bWins++;
      }

      winsA.total += aWins;
      winsB.total += bWins;
      winsA.battles += battlesPerMatchup;
      winsB.battles += battlesPerMatchup;

      matchups.push({
        monA: monA.name,
        monB: monB.name,
        aWins,
        bWins,
        draws: battlesPerMatchup - aWins - bWins,
        total: battlesPerMatchup,
      });
    }
  }

  return {
    strategyA: nameA,
    strategyB: nameB,
    winsA: winsA.total,
    winsB: winsB.total,
    totalBattles: battleIndex,
    draws: battleIndex - winsA.total - winsB.total,
    matchups,
  };
}

/**
 * Run a full strategy comparison matrix — every strategy vs every other.
 */
export function compareAllStrategies(
  monsters: readonly Bugmon[],
  movesData: readonly BattleMove[],
  typeChart: TypeChart,
  strategies: Record<string, StrategyEntry>,
  numBattles: number,
  baseSeed: number
): CompareAllResult {
  const names = Object.keys(strategies);
  const results: CompareResult[] = [];

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const nameA = names[i];
      const nameB = names[j];
      const result = compareStrategies(
        monsters,
        movesData,
        typeChart,
        strategies[nameA].fn,
        strategies[nameB].fn,
        numBattles,
        baseSeed + (i * names.length + j) * 100000,
        strategies[nameA].name,
        strategies[nameB].name
      );
      results.push(result);
    }
  }

  return { results, strategyNames: names.map((n) => strategies[n].name) };
}

/**
 * Run a single battle between two BugMon with strategy-based move selection.
 * Thin wrapper around simulateBattle — replaces headlessBattle.js.
 */
export function runBattle(
  monA: Bugmon,
  monB: Bugmon,
  movesData: readonly BattleMove[],
  typeChart: TypeChart,
  strategyA: Strategy,
  strategyB: Strategy,
  rng: { random: () => number; seed: number }
): SimulationResult {
  return simulateBattle(monA, monB, movesData, { effectiveness: typeChart }, 100, {
    strategyA,
    strategyB,
    rng,
  }) as SimulationResult;
}

/**
 * Backward-compatible damage calculation for headless simulation.
 * Wraps domain/battle.ts calcDamage with seeded RNG adapter.
 */
export { calcDamage } from './battle.js';

// AI move selection strategies for battle simulation.
// Each strategy is a pure function: (attacker, defender, movesData, typeChart, rng) => move.
// No DOM, no Node.js APIs — pure domain logic.

import type { Bugmon, BattleMove, TypeChart, BattleRNG } from '../core/types.js';
import type { Strategy } from './battle.js';

function getMoves(mon: Bugmon, movesData: readonly BattleMove[]): BattleMove[] {
  return mon.moves
    .map((id) => movesData.find((m) => m.id === id))
    .filter((m): m is BattleMove => m !== undefined);
}

function getEffectiveness(
  moveType: string,
  defenderType: string,
  typeChart: TypeChart | null
): number {
  if (!typeChart || !moveType || !defenderType) return 1.0;
  return typeChart[moveType]?.[defenderType] ?? 1.0;
}

function estimateDamage(
  attacker: Bugmon,
  move: BattleMove,
  defender: Bugmon,
  typeChart: TypeChart | null
): number {
  if (move.category === 'heal') return 0;
  const base = move.power + attacker.attack - Math.floor(defender.defense / 2) + 2; // avg random
  const eff = getEffectiveness(move.type, defender.type, typeChart);
  return Math.max(1, Math.floor(base * eff));
}

/** Pick a random move */
export const randomStrategy: Strategy = (
  attacker: Bugmon,
  _defender: Bugmon,
  movesData: readonly BattleMove[],
  _typeChart: TypeChart | null,
  rng?: BattleRNG
): BattleMove => {
  const moves = getMoves(attacker, movesData);
  const rand = rng?.random ?? Math.random;
  return moves[Math.floor(rand() * moves.length)];
};

/** Always pick the move that deals the most estimated damage */
export const highestDamageStrategy: Strategy = (
  attacker: Bugmon,
  defender: Bugmon,
  movesData: readonly BattleMove[],
  typeChart: TypeChart | null
): BattleMove => {
  const moves = getMoves(attacker, movesData);
  let best = moves[0];
  let bestDmg = -1;

  for (const move of moves) {
    const dmg = estimateDamage(attacker, move, defender, typeChart);
    if (dmg > bestDmg) {
      bestDmg = dmg;
      best = move;
    }
  }
  return best;
};

/** Pick the move with the best type effectiveness, breaking ties by power */
export const typeAwareStrategy: Strategy = (
  attacker: Bugmon,
  defender: Bugmon,
  movesData: readonly BattleMove[],
  typeChart: TypeChart | null
): BattleMove => {
  const moves = getMoves(attacker, movesData);
  let best = moves[0];
  let bestEff = -1;
  let bestPower = -1;

  for (const move of moves) {
    const eff = getEffectiveness(move.type, defender.type, typeChart);
    if (eff > bestEff || (eff === bestEff && move.power > bestPower)) {
      bestEff = eff;
      bestPower = move.power;
      best = move;
    }
  }
  return best;
};

/** 70% chance pick highest damage, 30% chance pick random */
export const mixedStrategy: Strategy = (
  attacker: Bugmon,
  defender: Bugmon,
  movesData: readonly BattleMove[],
  typeChart: TypeChart | null,
  rng?: BattleRNG
): BattleMove => {
  const rand = rng?.random ?? Math.random;
  if (rand() < 0.7) {
    return highestDamageStrategy(attacker, defender, movesData, typeChart, rng);
  }
  return randomStrategy(attacker, defender, movesData, typeChart, rng);
};

/** Considers remaining HP — heals when low, otherwise picks highest damage */
export const hpAwareStrategy: Strategy = (
  attacker: Bugmon,
  defender: Bugmon,
  movesData: readonly BattleMove[],
  typeChart: TypeChart | null,
  rng?: BattleRNG
): BattleMove => {
  const moves = getMoves(attacker, movesData);
  const hpRatio = (attacker.currentHP ?? attacker.hp) / attacker.hp;

  if (hpRatio < 0.3) {
    const healMove = moves.find((m) => m.category === 'heal');
    if (healMove) return healMove;
  }

  return highestDamageStrategy(attacker, defender, movesData, typeChart, rng);
};

/** Prioritizes survival — heals when HP < 50%, otherwise picks type-aware damage */
export const defensiveStrategy: Strategy = (
  attacker: Bugmon,
  defender: Bugmon,
  movesData: readonly BattleMove[],
  typeChart: TypeChart | null
): BattleMove => {
  const moves = getMoves(attacker, movesData);
  const hpRatio = (attacker.currentHP ?? attacker.hp) / attacker.hp;

  if (hpRatio < 0.5) {
    const healMove = moves.find((m) => m.category === 'heal');
    if (healMove) return healMove;
  }

  let best = moves[0];
  let bestScore = -1;

  for (const move of moves) {
    if (move.category === 'heal') continue;
    const eff = getEffectiveness(move.type, defender.type, typeChart);
    const sameType = move.type === attacker.type ? 0.1 : 0;
    const score = eff + sameType;
    if (score > bestScore || (score === bestScore && move.power > best.power)) {
      bestScore = score;
      best = move;
    }
  }
  return best;
};

/** Phase-based — typeAware early, highestDamage mid, hpAware when desperate */
export const adaptiveStrategy: Strategy = (
  attacker: Bugmon,
  defender: Bugmon,
  movesData: readonly BattleMove[],
  typeChart: TypeChart | null,
  rng?: BattleRNG
): BattleMove => {
  const ownHpRatio = (attacker.currentHP ?? attacker.hp) / attacker.hp;
  const oppHpRatio = (defender.currentHP ?? defender.hp) / defender.hp;

  if (ownHpRatio < 0.3) {
    return hpAwareStrategy(attacker, defender, movesData, typeChart, rng);
  }

  if (oppHpRatio < 0.5) {
    return highestDamageStrategy(attacker, defender, movesData, typeChart, rng);
  }

  return typeAwareStrategy(attacker, defender, movesData, typeChart, rng);
};

export interface StrategyEntry {
  readonly fn: Strategy;
  readonly name: string;
}

export const STRATEGIES: Record<string, StrategyEntry> = {
  random: { fn: randomStrategy, name: 'Random' },
  highestDamage: { fn: highestDamageStrategy, name: 'Highest Damage' },
  typeAware: { fn: typeAwareStrategy, name: 'Type Aware' },
  mixed: { fn: mixedStrategy, name: 'Mixed (70/30)' },
  hpAware: { fn: hpAwareStrategy, name: 'HP Aware' },
  defensive: { fn: defensiveStrategy, name: 'Defensive' },
  adaptive: { fn: adaptiveStrategy, name: 'Adaptive' },
};

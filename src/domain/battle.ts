// Pure battle engine — no DOM, no audio, no Node.js-specific APIs
// Deterministic when RNG is injected. All functions are pure (no mutation).
// This is the single source of truth for all battle logic across CLI, browser, and simulation.

import type {
  Bugmon,
  BattleMove,
  BattleDamageResult,
  MoveResult,
  BattleState,
  BattleOutcome,
  BattleEvent,
  TypeChart,
  BattleRNG,
} from '../core/types.js';
import { MOVE_USED, PASSIVE_ACTIVATED, BUGMON_FAINTED } from './events.js';

// --- Passive ability thresholds ---
const PASSIVE_THRESHOLDS: Record<string, number> = { RandomFailure: 0.5, NonDeterministic: 0.25 };

function checkPassive(bugmon: Bugmon, passiveName: string, roll: number): boolean {
  const passive = bugmon.passive;
  if (!passive || passive.name !== passiveName) return false;
  return roll < (PASSIVE_THRESHOLDS[passiveName] ?? 0);
}

// --- Damage calculation ---

export function isHealMove(move: BattleMove): boolean {
  return move.category === 'heal';
}

export function calcHealing(
  move: BattleMove,
  bugmon: Bugmon,
): { healing: number } {
  const restored = Math.min(move.power, bugmon.hp - (bugmon.currentHP ?? bugmon.hp));
  return { healing: Math.max(0, restored) };
}

export function calcDamage(
  attacker: Bugmon,
  move: BattleMove,
  defender: Bugmon,
  typeChart: TypeChart | null,
  rng: BattleRNG = {},
): BattleDamageResult {
  const rand = rng.random ? rng.random : Math.random;
  const randomBonus = Math.floor(rand() * 3) + 1;
  let dmg = move.power + attacker.attack - Math.floor(defender.defense / 2) + randomBonus;

  let effectiveness = 1.0;
  if (typeChart && move.type && defender.type) {
    effectiveness = typeChart[move.type]?.[defender.type] ?? 1.0;
  }
  dmg = Math.floor(dmg * effectiveness);

  const critical = rand() < 1 / 16;
  if (critical) {
    dmg = Math.floor(dmg * 1.5);
  }

  return { damage: Math.max(1, dmg), effectiveness, critical };
}

// --- State creation ---

export function createBattleState(playerMon: Bugmon, enemyMon: Bugmon): BattleState {
  return {
    playerMon: { ...playerMon, currentHP: playerMon.currentHP ?? playerMon.hp },
    enemy: { ...enemyMon, currentHP: enemyMon.currentHP ?? enemyMon.hp },
    turn: 0,
    log: [],
    outcome: null,
  };
}

// --- Turn order ---

export function getTurnOrder(playerMon: Bugmon, enemyMon: Bugmon): 'player' | 'enemy' {
  return playerMon.speed >= enemyMon.speed ? 'player' : 'enemy';
}

// --- Move resolution (pure, no mutation) ---

export function resolveMove(
  attacker: Bugmon,
  move: BattleMove,
  defender: Bugmon,
  typeChart: TypeChart | null,
  rng: BattleRNG = {},
): MoveResult {
  if (isHealMove(move)) {
    return { ...calcHealing(move, attacker), damage: 0, effectiveness: 1.0, critical: false };
  }
  return calcDamage(attacker, move, defender, typeChart, rng);
}

// --- HP mutation (returns new object) ---

export function applyDamage(bugmon: Bugmon, damage: number): Bugmon {
  return { ...bugmon, currentHP: Math.max(0, bugmon.currentHP - damage) };
}

export function applyHealing(bugmon: Bugmon, amount: number): Bugmon {
  return { ...bugmon, currentHP: Math.min(bugmon.hp, bugmon.currentHP + amount) };
}

export function isFainted(bugmon: Bugmon): boolean {
  return bugmon.currentHP <= 0;
}

// --- Cache mechanics ---

export function cacheChance(enemyMon: Bugmon): number {
  const hpRatio = enemyMon.currentHP / enemyMon.hp;
  return (1 - hpRatio) * 0.5 + 0.1;
}

export function attemptCache(enemyMon: Bugmon, roll: number): boolean {
  return roll < cacheChance(enemyMon);
}

// --- Move selection ---

export function pickEnemyMove(
  enemy: Bugmon,
  movesData: readonly BattleMove[],
  roll: number,
): BattleMove | undefined {
  const moveId = enemy.moves[Math.floor(roll * enemy.moves.length)];
  return movesData.find((m) => m.id === moveId);
}

interface TurnResult {
  state: BattleState;
  events: BattleEvent[];
}

/**
 * Execute a full turn: player move vs enemy move.
 * Returns { state, events } — fully deterministic with injected rolls.
 */
export function executeTurn(
  state: BattleState,
  playerMove: BattleMove,
  enemyMove: BattleMove,
  typeChart: TypeChart | null,
  rolls: BattleRNG = {},
): TurnResult {
  const events: BattleEvent[] = [];
  let { playerMon, enemy } = state;
  const turn = state.turn + 1;

  const first = getTurnOrder(playerMon, enemy);
  const attackers =
    first === 'player'
      ? [
          { side: 'player' as const, move: playerMove },
          { side: 'enemy' as const, move: enemyMove },
        ]
      : [
          { side: 'enemy' as const, move: enemyMove },
          { side: 'player' as const, move: playerMove },
        ];

  function applyMoveAction(side: 'player' | 'enemy', move: BattleMove): boolean {
    const attacker = side === 'player' ? playerMon : enemy;
    const defender = side === 'player' ? enemy : playerMon;
    const result = resolveMove(attacker, move, defender, typeChart, rolls);

    if (result.healing !== undefined && result.healing >= 0) {
      events.push({
        type: MOVE_USED,
        side,
        attacker: attacker.name,
        move: move.name,
        damage: 0,
        healing: result.healing,
        effectiveness: 1.0,
      });
      if (side === 'player') playerMon = applyHealing(playerMon, result.healing);
      else enemy = applyHealing(enemy, result.healing);
      return false;
    }

    let { damage } = result;
    const { effectiveness, critical } = result;

    // RandomFailure: defender may negate damage
    const passiveRoll = rolls.passive?.() ?? Math.random();
    if (checkPassive(defender, 'RandomFailure', passiveRoll)) {
      damage = 0;
      events.push({
        type: PASSIVE_ACTIVATED,
        side: side === 'player' ? 'enemy' : 'player',
        passive: 'RandomFailure',
        message: `${defender.name}'s RandomFailure negated the damage!`,
      });
    }

    events.push({
      type: MOVE_USED,
      side,
      attacker: attacker.name,
      move: move.name,
      damage,
      effectiveness,
      critical,
    });

    if (side === 'player') enemy = applyDamage(enemy, damage);
    else playerMon = applyDamage(playerMon, damage);

    const target = side === 'player' ? enemy : playerMon;
    if (isFainted(target)) {
      const faintSide = side === 'player' ? 'enemy' : 'player';
      events.push({ type: BUGMON_FAINTED, side: faintSide, name: target.name });
      return true;
    }
    return false;
  }

  for (const action of attackers) {
    const currentAttacker = action.side === 'player' ? playerMon : enemy;
    if (isFainted(currentAttacker)) continue;

    const fainted = applyMoveAction(action.side, action.move);
    if (fainted) break;

    // NonDeterministic: attacker may act twice
    const updatedAttacker = action.side === 'player' ? playerMon : enemy;
    const updatedDefender = action.side === 'player' ? enemy : playerMon;
    if (!isFainted(updatedDefender)) {
      const doubleRoll = rolls.passive?.() ?? Math.random();
      if (checkPassive(updatedAttacker, 'NonDeterministic', doubleRoll)) {
        events.push({
          type: PASSIVE_ACTIVATED,
          side: action.side,
          passive: 'NonDeterministic',
          message: `${updatedAttacker.name}'s NonDeterministic triggered a bonus action!`,
        });
        const bonusFainted = applyMoveAction(action.side, action.move);
        if (bonusFainted) break;
      }
    }
  }

  let outcome: BattleOutcome = null;
  if (isFainted(enemy)) outcome = 'win';
  else if (isFainted(playerMon)) outcome = 'lose';

  return {
    state: {
      playerMon,
      enemy,
      turn,
      log: [...state.log, ...events],
      outcome,
    },
    events,
  };
}

/** Strategy function type for simulation */
type Strategy = (
  attacker: Bugmon,
  defender: Bugmon,
  movesData: readonly BattleMove[],
  typeChart: TypeChart | null,
  rng?: BattleRNG,
) => BattleMove;

interface SimulationOptions {
  strategyA?: Strategy;
  strategyB?: Strategy;
  rng?: BattleRNG;
}

interface SimulationResult {
  winner: 'A' | 'B' | 'draw';
  turns: number;
  monA: string;
  monB: string;
  remainingHP: { a: number; b: number };
  totalDamage: { a: number; b: number };
  log: BattleEvent[];
  seed?: number;
}

/**
 * Simulate a full battle between two BugMon.
 * Used by CLI simulator and round-robin analysis.
 */
export function simulateBattle(
  monA: Bugmon,
  monB: Bugmon,
  movesData: readonly BattleMove[],
  typeChart: TypeChart | Record<string, unknown>,
  maxTurns = 100,
  options: SimulationOptions = {},
): BattleState | SimulationResult {
  let state = createBattleState(monA, monB);
  const typeEffectiveness = typeChart
    ? ((typeChart as Record<string, unknown>).effectiveness as TypeChart) || (typeChart as TypeChart)
    : null;
  const { strategyA, strategyB, rng } = options;

  // If strategies are provided, run with strategy-based move selection (simulation mode)
  if (strategyA && strategyB) {
    const a: Bugmon = { ...monA, currentHP: monA.hp };
    const b: Bugmon = { ...monB, currentHP: monB.hp };
    const log: BattleEvent[] = [];
    let turns = 0;

    function doAttack(
      attacker: Bugmon,
      move: BattleMove,
      defender: Bugmon,
    ): { fainted: boolean; attacker: Bugmon; defender: Bugmon } {
      if (isHealMove(move)) {
        const healed = Math.min(move.power, attacker.hp - attacker.currentHP);
        const healedAttacker = { ...attacker, currentHP: Math.min(attacker.hp, attacker.currentHP + move.power) };
        log.push({
          type: MOVE_USED,
          side: '',
          turn: turns,
          attacker: attacker.name,
          move: move.name,
          damage: 0,
          healing: healed,
          effectiveness: 1.0,
          targetHP: healedAttacker.currentHP,
        });
        return { fainted: false, attacker: healedAttacker, defender };
      }

      const result = calcDamage(attacker, move, defender, typeEffectiveness, rng);
      let damage = result.damage;

      if (
        defender.passive?.name === 'RandomFailure' &&
        (rng ? rng.random!() : Math.random()) < 0.5
      ) {
        damage = 0;
        log.push({
          type: MOVE_USED,
          side: '',
          turn: turns,
          attacker: attacker.name,
          move: move.name,
          damage: 0,
          effectiveness: result.effectiveness,
          targetHP: defender.currentHP,
          passive: 'RandomFailure',
        });
        return { fainted: false, attacker, defender };
      }

      const damagedDefender = { ...defender, currentHP: defender.currentHP - damage };
      log.push({
        type: MOVE_USED,
        side: '',
        turn: turns,
        attacker: attacker.name,
        move: move.name,
        damage,
        effectiveness: result.effectiveness,
        targetHP: Math.max(0, damagedDefender.currentHP),
      });
      return { fainted: damagedDefender.currentHP <= 0, attacker, defender: damagedDefender };
    }

    let currentA = a;
    let currentB = b;

    while (currentA.currentHP > 0 && currentB.currentHP > 0 && turns < maxTurns) {
      turns++;
      const aFirst = currentA.speed >= currentB.speed;
      let first = aFirst ? currentA : currentB;
      let second = aFirst ? currentB : currentA;
      const firstStrat = aFirst ? strategyA : strategyB;
      const secondStrat = aFirst ? strategyB : strategyA;

      const firstMove = firstStrat(first, second, movesData, typeEffectiveness, rng);
      const r1 = doAttack(first, firstMove, second);
      first = r1.attacker;
      second = r1.defender;
      if (r1.fainted) {
        currentA = aFirst ? first : second;
        currentB = aFirst ? second : first;
        break;
      }

      if (
        first.passive?.name === 'NonDeterministic' &&
        (rng ? rng.random!() : Math.random()) < 0.25 &&
        second.currentHP > 0
      ) {
        const bonusMove = firstStrat(first, second, movesData, typeEffectiveness, rng);
        const rb = doAttack(first, bonusMove, second);
        first = rb.attacker;
        second = rb.defender;
        if (rb.fainted) {
          currentA = aFirst ? first : second;
          currentB = aFirst ? second : first;
          break;
        }
      }

      if (second.currentHP <= 0) {
        currentA = aFirst ? first : second;
        currentB = aFirst ? second : first;
        break;
      }

      const secondMove = secondStrat(second, first, movesData, typeEffectiveness, rng);
      const r2 = doAttack(second, secondMove, first);
      second = r2.attacker;
      first = r2.defender;

      if (
        second.passive?.name === 'NonDeterministic' &&
        (rng ? rng.random!() : Math.random()) < 0.25 &&
        first.currentHP > 0
      ) {
        const bonusMove = secondStrat(second, first, movesData, typeEffectiveness, rng);
        const rb2 = doAttack(second, bonusMove, first);
        second = rb2.attacker;
        first = rb2.defender;
      }

      currentA = aFirst ? first : second;
      currentB = aFirst ? second : first;
    }

    const winner = currentA.currentHP > 0 ? 'A' : currentB.currentHP > 0 ? 'B' : 'draw';
    return {
      winner,
      turns,
      monA: monA.name,
      monB: monB.name,
      remainingHP: { a: Math.max(0, currentA.currentHP), b: Math.max(0, currentB.currentHP) },
      totalDamage: {
        a: monB.hp - Math.max(0, currentB.currentHP),
        b: monA.hp - Math.max(0, currentA.currentHP),
      },
      log,
      seed: rng?.seed,
    };
  }

  // Simple mode: random move selection
  while (!state.outcome && state.turn < maxTurns) {
    const rand = rng ? () => rng.random!() : Math.random;
    const playerMoveId = monA.moves[Math.floor(rand() * monA.moves.length)];
    const enemyMoveId = monB.moves[Math.floor(rand() * monB.moves.length)];
    const playerMove = movesData.find((m) => m.id === playerMoveId)!;
    const enemyMove = movesData.find((m) => m.id === enemyMoveId)!;

    const result = executeTurn(state, playerMove, enemyMove, typeEffectiveness);
    state = result.state;
  }

  return state;
}

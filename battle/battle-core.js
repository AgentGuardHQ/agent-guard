// Pure battle engine - no UI, no audio, no DOM
//
// Operates entirely on plain data objects and returns state transitions.
// This enables: AI opponents, battle simulations, balance testing,
// multiplayer — all without touching UI code.
//
// Two APIs coexist here:
//   1. Original: executeTurn(state, playerMove, enemyMove, typeChart) — returns { state, events }
//   2. Spec-based: resolveTurn(state, actions, typeChart) — fully immutable, returns new BattleState
//
// Use whichever fits your caller. Both are pure and deterministic.

import { calcDamage } from './damage.js';

// Create a fresh battle state from two BugMon data objects
export function createBattleState(playerMon, enemyMon) {
  return {
    playerMon: { ...playerMon, currentHP: playerMon.currentHP ?? playerMon.hp },
    enemy: { ...enemyMon, currentHP: enemyMon.currentHP ?? enemyMon.hp },
    turn: 0,
    log: [],
    outcome: null, // null = ongoing, 'win', 'lose', 'run', 'capture'
  };
}

// Determine who goes first based on speed (ties favor player)
export function getTurnOrder(playerMon, enemyMon) {
  return playerMon.speed >= enemyMon.speed ? 'player' : 'enemy';
}

// Resolve a single move: attacker uses move against defender
// Returns { damage, effectiveness } — does NOT mutate state
export function resolveMove(attacker, move, defender, typeChart) {
  return calcDamage(attacker, move, defender, typeChart);
}

// Apply damage to a BugMon, returning updated copy
export function applyDamage(bugmon, damage) {
  return {
    ...bugmon,
    currentHP: Math.max(0, bugmon.currentHP - damage),
  };
}

// Check if a BugMon has fainted
export function isFainted(bugmon) {
  return bugmon.currentHP <= 0;
}

// Calculate capture probability
export function captureChance(enemyMon) {
  const hpRatio = enemyMon.currentHP / enemyMon.hp;
  return (1 - hpRatio) * 0.5 + 0.1;
}

// Attempt capture with given random value (0-1)
// Separating randomness makes this testable/deterministic
export function attemptCapture(enemyMon, roll) {
  const chance = captureChance(enemyMon);
  return roll < chance;
}

// Pick a random enemy move (given random value 0-1)
export function pickEnemyMove(enemy, movesData, roll) {
  const moveId = enemy.moves[Math.floor(roll * enemy.moves.length)];
  return movesData.find(m => m.id === moveId);
}

// Execute a full turn: player picks a move, enemy picks randomly
// Returns a TurnResult with all events that occurred
export function executeTurn(state, playerMove, enemyMove, typeChart, rolls = {}) {
  const events = [];
  let { playerMon, enemy } = state;
  const turn = state.turn + 1;

  const first = getTurnOrder(playerMon, enemy);
  const attackers = first === 'player'
    ? [{ side: 'player', attacker: playerMon, move: playerMove, defender: enemy },
       { side: 'enemy', attacker: enemy, move: enemyMove, defender: playerMon }]
    : [{ side: 'enemy', attacker: enemy, move: enemyMove, defender: playerMon },
       { side: 'player', attacker: playerMon, move: playerMove, defender: enemy }];

  for (const action of attackers) {
    // Re-read current HP (may have changed from first attack)
    const currentAttacker = action.side === 'player' ? playerMon : enemy;
    const currentDefender = action.side === 'player' ? enemy : playerMon;

    // Skip if attacker already fainted
    if (isFainted(currentAttacker)) continue;

    const { damage, effectiveness } = resolveMove(currentAttacker, action.move, currentDefender, typeChart);

    events.push({
      type: 'MOVE_USED',
      side: action.side,
      attacker: currentAttacker.name,
      move: action.move.name,
      damage,
      effectiveness,
    });

    if (action.side === 'player') {
      enemy = applyDamage(enemy, damage);
    } else {
      playerMon = applyDamage(playerMon, damage);
    }

    if (action.side === 'player' && isFainted(enemy)) {
      events.push({ type: 'BUGMON_FAINTED', side: 'enemy', name: enemy.name });
      break;
    }
    if (action.side === 'enemy' && isFainted(playerMon)) {
      events.push({ type: 'BUGMON_FAINTED', side: 'player', name: playerMon.name });
      break;
    }
  }

  let outcome = null;
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

// ─── Spec-based pure engine (immutable state, PP tracking, accuracy) ───

/**
 * @typedef {{ id: string, name: string, type: string, power: number, accuracy: number, pp: number }} MoveSpec
 * @typedef {{ id: string|number, name: string, type: string, maxHp: number, hp: number, attack: number, defense: number, speed: number, moves: MoveSpec[] }} BugMonSpec
 * @typedef {{ active: BugMonSpec }} BattleSide
 * @typedef {{ turn: number, player: BattleSide, enemy: BattleSide, log: string[], winner: 'player'|'enemy'|null }} PureBattleState
 * @typedef {{ actor: 'player'|'enemy', moveId: string }} ChosenAction
 */

/** Look up type effectiveness from a chart. Returns 1 if not found. */
export function getTypeMultiplier(moveType, defenderType, typeChart) {
  if (!typeChart) return 1;
  return typeChart[moveType]?.[defenderType] ?? 1;
}

/** Deep clone a battle state. */
export function cloneState(state) {
  return structuredClone(state);
}

/** Find a move on a BugMon by id. Throws if not found. */
export function findMove(bugmon, moveId) {
  const move = bugmon.moves.find((m) => m.id === moveId);
  if (!move) {
    throw new Error(`${bugmon.name} does not know move ${moveId}`);
  }
  return move;
}

/**
 * Deterministic damage formula — no randomness.
 * @param {BugMonSpec} attacker
 * @param {BugMonSpec} defender
 * @param {MoveSpec} move
 * @param {Record<string, Record<string, number>>} [typeChart]
 * @returns {number}
 */
export function calculateDamage(attacker, defender, move, typeChart) {
  const base = Math.max(1, move.power + attacker.attack - defender.defense);
  const multiplier = getTypeMultiplier(move.type, defender.type, typeChart);
  return Math.max(1, Math.floor(base * multiplier));
}

/**
 * Apply a single move. Returns new attacker, defender, and log entries.
 * Never mutates inputs. Defaults accuracy to 100, pp to 10 if not set.
 * @param {BugMonSpec} attacker
 * @param {BugMonSpec} defender
 * @param {MoveSpec} move
 * @param {Record<string, Record<string, number>>} [typeChart]
 * @returns {{ attacker: BugMonSpec, defender: BugMonSpec, log: string[] }}
 */
export function applyMove(attacker, defender, move, typeChart) {
  const log = [];
  const pp = move.pp ?? 10;
  const accuracy = move.accuracy ?? 100;

  if (pp <= 0) {
    log.push(`${attacker.name} tried to use ${move.name}, but it has no PP left.`);
    return { attacker, defender, log };
  }

  const updatedAttacker = {
    ...attacker,
    moves: attacker.moves.map((m) =>
      m.id === move.id ? { ...m, pp: (m.pp ?? 10) - 1 } : m
    ),
  };

  const hitRoll = 100; // deterministic — inject RNG later
  if (hitRoll > accuracy) {
    log.push(`${updatedAttacker.name} used ${move.name}, but it missed.`);
    return { attacker: updatedAttacker, defender, log };
  }

  const damage = calculateDamage(updatedAttacker, defender, move, typeChart);
  const multiplier = getTypeMultiplier(move.type, defender.type, typeChart);

  const updatedDefender = {
    ...defender,
    hp: Math.max(0, defender.hp - damage),
  };

  log.push(`${updatedAttacker.name} used ${move.name}.`);
  log.push(`${updatedDefender.name} took ${damage} damage.`);

  if (multiplier > 1) log.push('It was super effective.');
  if (multiplier < 1) log.push('It was not very effective.');
  if (updatedDefender.hp <= 0) log.push(`${updatedDefender.name} fainted.`);

  return { attacker: updatedAttacker, defender: updatedDefender, log };
}

/**
 * Resolve a full turn from two chosen actions. Pure function.
 * Uses BattleSide/PureBattleState shape (hp, not currentHP).
 * @param {PureBattleState} state
 * @param {[ChosenAction, ChosenAction]} actions
 * @param {Record<string, Record<string, number>>} [typeChart]
 * @returns {PureBattleState}
 */
export function resolveTurn(state, actions, typeChart) {
  if (state.winner) return state;

  const next = cloneState(state);
  next.turn += 1;
  next.log = [`Turn ${next.turn}`];

  const playerAction = actions.find((a) => a.actor === 'player');
  const enemyAction = actions.find((a) => a.actor === 'enemy');

  if (!playerAction || !enemyAction) {
    throw new Error('Both player and enemy actions are required');
  }

  const order = next.player.active.speed >= next.enemy.active.speed
    ? ['player', 'enemy']
    : ['enemy', 'player'];

  for (const actor of order) {
    if (next.winner) break;

    const attackerSide = actor === 'player' ? next.player : next.enemy;
    const defenderSide = actor === 'player' ? next.enemy : next.player;
    const action = actor === 'player' ? playerAction : enemyAction;

    if (attackerSide.active.hp <= 0 || defenderSide.active.hp <= 0) continue;

    const move = findMove(attackerSide.active, action.moveId);
    const result = applyMove(attackerSide.active, defenderSide.active, move, typeChart);

    attackerSide.active = result.attacker;
    defenderSide.active = result.defender;
    next.log.push(...result.log);

    if (next.enemy.active.hp <= 0) { next.winner = 'player'; break; }
    if (next.player.active.hp <= 0) { next.winner = 'enemy'; break; }
  }

  return next;
}

/**
 * Create a PureBattleState for the spec-based API.
 * Expects BugMon with embedded move objects (not just move IDs).
 * @param {BugMonSpec} playerMon
 * @param {BugMonSpec} enemyMon
 * @returns {PureBattleState}
 */
export function createPureBattleState(playerMon, enemyMon) {
  return {
    turn: 0,
    player: { active: structuredClone(playerMon) },
    enemy: { active: structuredClone(enemyMon) },
    log: [],
    winner: null,
  };
}

// ─── Original API (preserved for simulate.js and battleEngine.js) ─────

// Simulate a full battle between two BugMon (for CLI simulator)
export function simulateBattle(monA, monB, movesData, typeChart, maxTurns = 100) {
  let state = createBattleState(monA, monB);
  const typeEffectiveness = typeChart ? typeChart.effectiveness : null;

  while (!state.outcome && state.turn < maxTurns) {
    // Pick moves randomly
    const playerMoveId = monA.moves[Math.floor(Math.random() * monA.moves.length)];
    const enemyMoveId = monB.moves[Math.floor(Math.random() * monB.moves.length)];
    const playerMove = movesData.find(m => m.id === playerMoveId);
    const enemyMove = movesData.find(m => m.id === enemyMoveId);

    const result = executeTurn(state, playerMove, enemyMove, typeEffectiveness);
    state = result.state;
  }

  return state;
}

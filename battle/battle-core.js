// Pure battle engine - no UI, no audio, no DOM

import { calcDamage } from './damage.js';

// Create a fresh battle state from two BugMon data objects
export function createBattleState(playerMon, enemyMon) {
  return {
    playerMon: { ...playerMon, currentHP: playerMon.currentHP ?? playerMon.hp },
    enemy: { ...enemyMon, currentHP: enemyMon.currentHP ?? enemyMon.hp },
    turn: 0,
    log: [],
    outcome: null, // null = ongoing, 'win', 'lose', 'run', 'cache'
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

// Calculate cache probability
export function cacheChance(enemyMon) {
  const hpRatio = enemyMon.currentHP / enemyMon.hp;
  return (1 - hpRatio) * 0.5 + 0.1;
}

// Attempt cache with given random value (0-1)
// Separating randomness makes this testable/deterministic
export function attemptCache(enemyMon, roll) {
  const chance = cacheChance(enemyMon);
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

// AI move selection strategies for battle simulation
// Each strategy is a function: (attacker, defender, movesData, typeChart, rng) => move

function getMoves(mon, movesData) {
  return mon.moves
    .map(id => movesData.find(m => m.id === id))
    .filter(Boolean);
}

function getEffectiveness(moveType, defenderType, typeChart) {
  if (!typeChart || !moveType || !defenderType) return 1.0;
  return typeChart[moveType]?.[defenderType] ?? 1.0;
}

function estimateDamage(attacker, move, defender, typeChart) {
  const base = move.power + attacker.attack - Math.floor(defender.defense / 2) + 2; // avg random
  const eff = getEffectiveness(move.type, defender.type, typeChart);
  return Math.max(1, Math.floor(base * eff));
}

// Strategy: pick a random move
export function randomStrategy(attacker, defender, movesData, typeChart, rng) {
  const moves = getMoves(attacker, movesData);
  return rng.pick(moves);
}

// Strategy: always pick the move that deals the most estimated damage
export function highestDamageStrategy(attacker, defender, movesData, typeChart, rng) {
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
}

// Strategy: pick the move with the best type effectiveness, breaking ties by power
export function typeAwareStrategy(attacker, defender, movesData, typeChart, rng) {
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
}

// Strategy: 70% chance pick highest damage, 30% chance pick random (simulates imperfect play)
export function mixedStrategy(attacker, defender, movesData, typeChart, rng) {
  if (rng.random() < 0.7) {
    return highestDamageStrategy(attacker, defender, movesData, typeChart, rng);
  }
  return randomStrategy(attacker, defender, movesData, typeChart, rng);
}

export const STRATEGIES = {
  random: { fn: randomStrategy, name: 'Random' },
  highestDamage: { fn: highestDamageStrategy, name: 'Highest Damage' },
  typeAware: { fn: typeAwareStrategy, name: 'Type Aware' },
  mixed: { fn: mixedStrategy, name: 'Mixed (70/30)' }
};

// Headless battle engine for simulation
// No DOM, no audio, no rendering — pure game logic with seeded RNG

export function calcDamageHeadless(attacker, move, defender, typeChart, rng) {
  const random = rng.int(1, 3);
  let dmg = move.power + attacker.attack - Math.floor(defender.defense / 2) + random;

  let effectiveness = 1.0;
  if (typeChart && move.type && defender.type) {
    effectiveness = typeChart[move.type]?.[defender.type] ?? 1.0;
  }
  dmg = Math.floor(dmg * effectiveness);

  return { damage: Math.max(1, dmg), effectiveness };
}

export function runBattle(monA, monB, movesData, typeChart, strategyA, strategyB, rng) {
  const a = { ...monA, currentHP: monA.hp };
  const b = { ...monB, currentHP: monB.hp };

  const log = [];
  let turns = 0;
  const MAX_TURNS = 100;

  while (a.currentHP > 0 && b.currentHP > 0 && turns < MAX_TURNS) {
    turns++;

    // Determine turn order by speed (ties: A goes first)
    const aFirst = a.speed >= b.speed;
    const first = aFirst ? a : b;
    const second = aFirst ? b : a;
    const firstStrategy = aFirst ? strategyA : strategyB;
    const secondStrategy = aFirst ? strategyB : strategyA;

    // First attacker's turn
    const firstMove = firstStrategy(first, second, movesData, typeChart, rng);
    const firstResult = calcDamageHeadless(first, firstMove, second, typeChart, rng);
    second.currentHP -= firstResult.damage;

    log.push({
      turn: turns,
      attacker: first.name,
      move: firstMove.name,
      damage: firstResult.damage,
      effectiveness: firstResult.effectiveness,
      targetHP: Math.max(0, second.currentHP)
    });

    if (second.currentHP <= 0) break;

    // Second attacker's turn
    const secondMove = secondStrategy(second, first, movesData, typeChart, rng);
    const secondResult = calcDamageHeadless(second, secondMove, first, typeChart, rng);
    first.currentHP -= secondResult.damage;

    log.push({
      turn: turns,
      attacker: second.name,
      move: secondMove.name,
      damage: secondResult.damage,
      effectiveness: secondResult.effectiveness,
      targetHP: Math.max(0, first.currentHP)
    });
  }

  const winner = a.currentHP > 0 ? 'A' : b.currentHP > 0 ? 'B' : 'draw';

  return {
    winner,
    turns,
    monA: monA.name,
    monB: monB.name,
    remainingHP: {
      a: Math.max(0, a.currentHP),
      b: Math.max(0, b.currentHP)
    },
    totalDamage: {
      a: monB.hp - Math.max(0, b.currentHP),
      b: monA.hp - Math.max(0, a.currentHP)
    },
    log,
    seed: rng.seed
  };
}

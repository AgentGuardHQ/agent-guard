// Damage calculation with type effectiveness and critical hits
export function calcDamage(attacker, move, defender, typeChart) {
  const random = Math.floor(Math.random() * 3) + 1;
  let dmg = move.power + attacker.attack - Math.floor(defender.defense / 2) + random;

  let effectiveness = 1.0;
  if (typeChart && move.type && defender.type) {
    effectiveness = typeChart[move.type]?.[defender.type] ?? 1.0;
  }
  dmg = Math.floor(dmg * effectiveness);

  // Critical hit: 1/16 chance (~6.25%) for 1.5x damage
  const critical = Math.random() < 1 / 16;
  if (critical) {
    dmg = Math.floor(dmg * 1.5);
  }

  return { damage: Math.max(1, dmg), effectiveness, critical };
}

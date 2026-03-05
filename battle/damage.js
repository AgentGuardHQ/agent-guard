// Damage calculation
export function calcDamage(attacker, move, defender) {
  const random = Math.floor(Math.random() * 3) + 1;
  const dmg = move.power + attacker.attack - Math.floor(defender.defense / 2) + random;
  return Math.max(1, dmg);
}

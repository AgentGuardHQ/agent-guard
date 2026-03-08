// Pure encounter logic — no DOM, no audio
// Returns encounter data; callers handle audio/UI.
//
// TODO(roadmap/phase-3): Add idle/active encounter mode (severity 1-2 auto-resolve, 3+ require input)
// Encounter difficulty scaling implemented — see scaleEncounter()
// TODO(roadmap/phase-3): Add session escalation (unresolved errors compound difficulty)
// TODO(roadmap/ts-migration): Migrate to TypeScript (src/domain/)

const RARITY_WEIGHTS = {
  common: 10,
  uncommon: 5,
  rare: 2,
  legendary: 1
};

export { RARITY_WEIGHTS };

/**
 * Check if an encounter should trigger on this tile.
 * @param {number} tile - Tile type (2 = tall grass)
 * @param {() => number} [rand] - RNG function (defaults to Math.random)
 * @returns {boolean}
 */
export function shouldEncounter(tile, rand = Math.random) {
  if (tile !== 2) return false;
  return rand() <= 0.10;
}

/**
 * Pick a weighted random monster from the roster.
 * @param {object[]} monsters - Array of monster definitions
 * @param {() => number} [rand] - RNG function (defaults to Math.random)
 * @returns {object} Monster template
 */
export function pickWeightedRandom(monsters, rand = Math.random) {
  let totalWeight = 0;
  for (const mon of monsters) {
    totalWeight += RARITY_WEIGHTS[mon.rarity] || RARITY_WEIGHTS.common;
  }

  let roll = rand() * totalWeight;
  for (const mon of monsters) {
    roll -= RARITY_WEIGHTS[mon.rarity] || RARITY_WEIGHTS.common;
    if (roll <= 0) return mon;
  }

  return monsters[monsters.length - 1];
}

/**
 * Scale a monster's stats based on session context.
 * @param {object} monster - Monster template (or instance with currentHP)
 * @param {{ playerLevel?: number, encounterCount?: number }} [context]
 * @returns {object} Scaled monster (new object, never mutates input)
 */
export function scaleEncounter(monster, context = {}) {
  const playerLevel = context.playerLevel || 1;
  const encounterCount = context.encounterCount || 0;

  // Level scaling: +10% HP per player level above 1
  const levelScale = 1 + (playerLevel - 1) * 0.1;
  // Session scaling: +2% HP per 5 encounters (caps at +20%)
  const sessionScale = 1 + Math.min(Math.floor(encounterCount / 5) * 0.02, 0.2);

  const scale = levelScale * sessionScale;

  return {
    ...monster,
    hp: Math.floor(monster.hp * scale),
    currentHP: Math.floor((monster.currentHP || monster.hp) * scale),
  };
}

/**
 * Generate a wild encounter.
 * @param {number} tile - Current tile type
 * @param {object[]} monsters - Available monster roster
 * @param {() => number} [rand] - RNG function
 * @param {{ playerLevel?: number, encounterCount?: number }} [context] - Session context for difficulty scaling
 * @returns {object|null} Wild monster instance or null
 */
export function checkEncounter(tile, monsters, rand = Math.random, context) {
  if (!shouldEncounter(tile, rand)) return null;

  const template = pickWeightedRandom(monsters, rand);
  const instance = { ...template, currentHP: template.hp };
  return context ? scaleEncounter(instance, context) : instance;
}

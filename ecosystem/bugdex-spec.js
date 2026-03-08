// BugDex Spec — canonical schema for BugDex entries
// This defines the format for community-contributed BugMon.
// All entries (monsters.json, community submissions) must conform.

/**
 * BugDex Entry Schema
 *
 * Required fields:
 *   id          - string   Unique slug identifier (e.g., "null-goblin")
 *   name        - string   Display name (e.g., "Null Goblin")
 *   errorType   - string   The JS/runtime error type it represents
 *   type        - string   One of the 7 game types
 *   rarity      - string   common | uncommon | rare | legendary | evolved
 *   hp          - number   Base hit points (10-100)
 *   attack      - number   Attack stat (1-20)
 *   defense     - number   Defense stat (1-20)
 *   speed       - number   Speed stat (1-15)
 *   moves       - string[] Array of move IDs (1-4 moves)
 *   description - string   What this bug is and when it occurs
 *
 * Optional fields:
 *   sprite      - string   Sprite filename (without extension)
 *   color       - string   Hex color for fallback rendering
 *   habitat     - string   Where this bug commonly occurs
 *   weakness    - string   What fixes or prevents this bug
 *   fixTip      - string   Practical fix advice for developers
 *   evolution   - string   Name of evolved form (if any)
 *   evolvesTo   - number   Monster ID of evolved form (if any)
 *   evolvedFrom - number   Monster ID of pre-evolution (if evolved)
 *   passive     - string   Passive ability description (if any)
 *   errorPatterns - string[] Strings to match in error messages
 *   theme       - string   Thematic category (e.g., "runtime error")
 */

export const VALID_TYPES = [
  'frontend',
  'backend',
  'devops',
  'testing',
  'architecture',
  'security',
  'ai',
];

export const VALID_RARITIES = ['common', 'uncommon', 'rare', 'legendary', 'evolved'];

const STAT_RANGES = {
  hp: { min: 10, max: 100 },
  attack: { min: 1, max: 20 },
  defense: { min: 1, max: 20 },
  speed: { min: 1, max: 15 },
};

/**
 * Validate a BugDex entry against the schema.
 *
 * @param {object} entry - The BugDex entry to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateBugDexEntry(entry) {
  const errors = [];

  // Required string fields
  const requiredStrings = ['name', 'errorType', 'type', 'rarity', 'description'];
  for (const field of requiredStrings) {
    if (typeof entry[field] !== 'string' || entry[field].length === 0) {
      errors.push(`Missing or invalid required field: ${field}`);
    }
  }

  // ID can be string or number
  if (entry.id === undefined || entry.id === null) {
    errors.push('Missing required field: id');
  }

  // Type validation
  if (entry.type && !VALID_TYPES.includes(entry.type)) {
    errors.push(`Invalid type: "${entry.type}". Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  // Rarity validation
  if (entry.rarity && !VALID_RARITIES.includes(entry.rarity)) {
    errors.push(`Invalid rarity: "${entry.rarity}". Must be one of: ${VALID_RARITIES.join(', ')}`);
  }

  // Stat range validation
  for (const [stat, range] of Object.entries(STAT_RANGES)) {
    if (typeof entry[stat] !== 'number') {
      errors.push(`${stat} must be a number`);
    } else if (entry[stat] < range.min || entry[stat] > range.max) {
      errors.push(`${stat} must be between ${range.min} and ${range.max}, got ${entry[stat]}`);
    }
  }

  // Moves validation
  if (!Array.isArray(entry.moves) || entry.moves.length === 0) {
    errors.push('moves must be a non-empty array of move IDs');
  } else if (entry.moves.length > 4) {
    errors.push('moves cannot have more than 4 entries');
  }

  // Sprite format (if provided)
  if (entry.sprite !== undefined && entry.sprite !== null) {
    if (typeof entry.sprite !== 'string') {
      errors.push('sprite must be a string (filename without extension)');
    }
  }

  // Color format (if provided)
  if (entry.color && !/^#[0-9a-fA-F]{6}$/.test(entry.color)) {
    errors.push(`Invalid color format: "${entry.color}". Must be hex like #ff0000`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * The full BugDex schema definition for documentation/tooling.
 */
export const BUGDEX_SCHEMA = {
  type: 'object',
  required: [
    'id',
    'name',
    'errorType',
    'type',
    'rarity',
    'hp',
    'attack',
    'defense',
    'speed',
    'moves',
    'description',
  ],
  properties: {
    id: { type: ['string', 'number'], description: 'Unique identifier' },
    name: { type: 'string', description: 'Display name' },
    errorType: { type: 'string', description: 'JS/runtime error type it represents' },
    type: { type: 'string', enum: VALID_TYPES, description: 'Game type category' },
    rarity: { type: 'string', enum: VALID_RARITIES, description: 'Rarity tier' },
    hp: { type: 'number', minimum: 10, maximum: 100, description: 'Base hit points' },
    attack: { type: 'number', minimum: 1, maximum: 20, description: 'Attack stat' },
    defense: { type: 'number', minimum: 1, maximum: 20, description: 'Defense stat' },
    speed: { type: 'number', minimum: 1, maximum: 15, description: 'Speed stat' },
    moves: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 4,
      description: 'Move IDs',
    },
    description: { type: 'string', description: 'What this bug is and when it occurs' },
    sprite: { type: 'string', description: 'Sprite filename (32x32 PNG, no extension)' },
    color: {
      type: 'string',
      pattern: '^#[0-9a-fA-F]{6}$',
      description: 'Hex color for fallback rendering',
    },
    habitat: { type: 'string', description: 'Where this bug commonly occurs' },
    weakness: { type: 'string', description: 'What fixes or prevents this bug' },
    fixTip: { type: 'string', description: 'Practical developer fix advice' },
    errorPatterns: {
      type: 'array',
      items: { type: 'string' },
      description: 'Strings to match in error messages',
    },
  },
};

// Browser persistence — save/load game state to localStorage
// Handles: party, BugDex (seen/storage), player position, dev events

const SAVE_KEY = 'bugmon_save';
const SAVE_VERSION = 1;

/**
 * Save game state to localStorage.
 * @param {object} player - Player object from world/player.js
 * @param {object} [extra] - Additional data (bugdex seen, storage, stats)
 */
export function saveGame(player, extra = {}) {
  const state = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    player: {
      x: player.x,
      y: player.y,
      dir: player.dir,
      party: player.party.map(serializeMon),
    },
    bugdex: {
      seen: extra.seen || {},
      storage: (extra.storage || []).map(serializeMon),
      stats: extra.stats || { totalEncounters: 0, totalCached: 0, xp: 0, level: 1 },
    },
  };

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    console.error('[BugMon] Failed to save game');
    return false;
  }
}

/**
 * Load game state from localStorage.
 * @returns {object|null} Saved state or null if none exists
 */
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state.version || !state.player) return null;
    return state;
  } catch {
    console.error('[BugMon] Failed to load save');
    return null;
  }
}

/**
 * Check if a save exists.
 */
export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

/**
 * Delete save data.
 */
export function deleteSave() {
  localStorage.removeItem(SAVE_KEY);
}

/**
 * Apply loaded save data to the player object.
 * @param {object} player - Player object (mutated in place)
 * @param {object} saveData - From loadGame()
 */
export function applySave(player, saveData) {
  if (!saveData?.player) return;
  player.x = saveData.player.x;
  player.y = saveData.player.y;
  player.dir = saveData.player.dir;
  player.party.length = 0;
  for (const mon of saveData.player.party) {
    player.party.push(mon);
  }
}

/**
 * Get BugDex data from save.
 * @returns {object} { seen, storage, stats }
 */
export function getSavedBugDex() {
  const save = loadGame();
  return save?.bugdex || { seen: {}, storage: [], stats: {} };
}

/**
 * Record a cached BugMon in the browser BugDex.
 * @param {object} monster - The cached BugMon
 */
export function recordBrowserCache(monster) {
  const save = loadGame();
  if (!save) return;

  if (!save.bugdex) save.bugdex = { seen: {}, storage: [], stats: {} };
  save.bugdex.seen[monster.id] = (save.bugdex.seen[monster.id] || 0) + 1;

  if (!save.bugdex.stats.totalCached) save.bugdex.stats.totalCached = 0;
  save.bugdex.stats.totalCached++;

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch { /* storage full */ }
}

function serializeMon(mon) {
  return {
    id: mon.id,
    name: mon.name,
    type: mon.type,
    hp: mon.hp,
    currentHP: mon.currentHP ?? mon.hp,
    attack: mon.attack,
    defense: mon.defense,
    speed: mon.speed,
    moves: mon.moves,
    color: mon.color,
    sprite: mon.sprite,
    rarity: mon.rarity,
    evolution: mon.evolution,
    evolvesTo: mon.evolvesTo,
  };
}

/**
 * Export save state as a portable JSON object (for sync).
 */
export function exportState() {
  const save = loadGame();
  return save || null;
}

/**
 * Import state from CLI sync (merges with existing save).
 * @param {object} cliState - State from CLI sync server
 */
export function importFromCLI(cliState) {
  if (!cliState) return;

  const existing = loadGame();
  const merged = existing || {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    player: { x: 1, y: 1, dir: 'down', party: [] },
    bugdex: { seen: {}, storage: [], stats: {} },
  };

  // Merge party — CLI party takes priority if it has entries
  if (cliState.party && cliState.party.length > 0) {
    merged.player.party = cliState.party.map(serializeMon);
  }

  // Merge storage — deduplicate by adding new ones
  if (cliState.storage) {
    const existingIds = new Set((merged.bugdex.storage || []).map(m => `${m.id}-${m.cachedAt || m.caughtAt || ''}`));
    for (const mon of cliState.storage) {
      const key = `${mon.id}-${mon.cachedAt || mon.caughtAt || ''}`;
      if (!existingIds.has(key)) {
        merged.bugdex.storage.push(serializeMon(mon));
      }
    }
  }

  // Merge seen — take higher counts
  if (cliState.seen) {
    for (const [id, count] of Object.entries(cliState.seen)) {
      merged.bugdex.seen[id] = Math.max(merged.bugdex.seen[id] || 0, count);
    }
  }

  // Merge stats — take higher values
  if (cliState.stats) {
    const s = merged.bugdex.stats;
    s.totalEncounters = Math.max(s.totalEncounters || 0, cliState.stats.totalEncounters || 0);
    s.totalCached = Math.max(s.totalCached || 0, cliState.stats.totalCached || cliState.stats.totalCaught || 0);
    s.xp = Math.max(s.xp || 0, cliState.stats.xp || 0);
    s.level = Math.max(s.level || 1, cliState.stats.level || 1);
  }

  merged.timestamp = Date.now();

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(merged));
  } catch { /* storage full */ }

  return merged;
}

// Browser persistence — save/load game state to localStorage

const SAVE_KEY = 'bugmon_save';
const SAVE_VERSION = 1;

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
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state.version || !state.player) return null;
    return state;
  } catch {
    return null;
  }
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

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

export function recordBrowserCache(monster) {
  const save = loadGame();
  if (!save) return;

  if (!save.bugdex) save.bugdex = { seen: {}, storage: [], stats: {} };
  save.bugdex.seen[monster.id] = (save.bugdex.seen[monster.id] || 0) + 1;

  if (!save.bugdex.stats.totalCached) save.bugdex.stats.totalCached = 0;
  save.bugdex.stats.totalCached++;

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* storage full */
  }
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

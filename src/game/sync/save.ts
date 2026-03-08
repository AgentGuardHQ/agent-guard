// Browser persistence — save/load game state to localStorage

const SAVE_KEY = 'bugmon_save';
const SAVE_VERSION = 1;

interface MonLike {
  id: number;
  name: string;
  type: string;
  hp: number;
  currentHP?: number;
  attack: number;
  defense: number;
  speed: number;
  moves: string[];
  color?: string;
  sprite?: string;
  rarity?: string;
  evolution?: unknown;
  evolvesTo?: number;
  [key: string]: unknown;
}

interface PlayerLike {
  x: number;
  y: number;
  dir: string;
  party: MonLike[];
}

interface SaveExtra {
  seen?: Record<number, number>;
  storage?: MonLike[];
  stats?: Record<string, unknown>;
}

interface SaveData {
  version: number;
  timestamp: number;
  player: {
    x: number;
    y: number;
    dir: string;
    party: MonLike[];
  };
  bugdex: {
    seen: Record<number, number>;
    storage: MonLike[];
    stats: Record<string, unknown>;
  };
}

export function saveGame(player: PlayerLike, extra: SaveExtra = {}): boolean {
  const state: SaveData = {
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

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as SaveData;
    if (!state.version || !state.player) return null;
    return state;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function applySave(player: PlayerLike, saveData: SaveData): void {
  if (!saveData?.player) return;
  player.x = saveData.player.x;
  player.y = saveData.player.y;
  player.dir = saveData.player.dir;
  player.party.length = 0;
  for (const mon of saveData.player.party) {
    player.party.push(mon);
  }
}

export function recordBrowserCache(monster: MonLike): void {
  const save = loadGame();
  if (!save) return;

  if (!save.bugdex) save.bugdex = { seen: {}, storage: [], stats: {} };
  save.bugdex.seen[monster.id] = (save.bugdex.seen[monster.id] || 0) + 1;

  const stats = save.bugdex.stats as Record<string, number>;
  if (!stats.totalCached) stats.totalCached = 0;
  stats.totalCached++;

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* storage full */
  }
}

function serializeMon(mon: MonLike): MonLike {
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

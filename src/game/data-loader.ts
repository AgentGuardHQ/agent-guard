// Game data loader — consolidates all data imports and setter calls.
// Keeps game.ts focused on game loop and rendering.

import { setMapData } from './world/map.js';
import { setMonstersData } from './world/encounters.js';
import { setMovesData, setTypeData } from './battle/battle-engine.js';
import { setEvolutionData, setMonstersDataForEvolution } from './evolution/evolution.js';
import { initTracker } from './evolution/tracker.js';
import { preloadAll } from './sprites/sprites.js';
import { initTileTextures } from './sprites/tiles.js';
import type { GameMon } from './world/player.js';

// @ts-expect-error — JS data modules (no .d.ts), bundled by esbuild
import { MONSTERS as MONSTERS_DATA } from '../../ecosystem/data/monsters.js';
// @ts-expect-error — JS data module
import { MOVES as MOVES_DATA } from '../../ecosystem/data/moves.js';
// @ts-expect-error — JS data module
import { TYPES as TYPES_DATA } from '../../ecosystem/data/types.js';
// @ts-expect-error — JS data module
import { EVOLUTIONS as EVOLUTIONS_DATA } from '../../ecosystem/data/evolutions.js';
// @ts-expect-error — JS data module
import { MAP_DATA } from '../../ecosystem/data/mapData.js';

interface MonsterData extends GameMon {
  sprite?: string;
}

interface TypesData {
  effectiveness?: Record<string, Record<string, number>>;
  typeColors?: Record<string, string>;
  [key: string]: unknown;
}

interface MoveData {
  id: string;
  name: string;
  power: number;
  type: string;
}

export interface LoadedGameData {
  monsters: MonsterData[];
  moves: MoveData[];
  types: TypesData;
  evolutions: unknown;
  map: { width: number; height: number; tiles: number[][] };
}

/**
 * Load all game data, initialize subsystem setters, preload sprites.
 * Returns the loaded data for use by game loop.
 */
export async function loadGameData(): Promise<LoadedGameData> {
  const monsters = MONSTERS_DATA as MonsterData[];
  const moves = MOVES_DATA as MoveData[];
  const types = TYPES_DATA as TypesData;
  const evolutions = EVOLUTIONS_DATA as unknown;
  const map = MAP_DATA as { width: number; height: number; tiles: number[][] };

  // Wire data into subsystems
  setMonstersData(monsters);
  setMovesData(moves);
  setTypeData(types);
  setEvolutionData(evolutions);
  setMonstersDataForEvolution(monsters);
  setMapData(map);

  // Initialize progression tracker
  initTracker();
  const { importFromFile } = await import('./evolution/tracker.js');
  await importFromFile();

  // Preload sprites and tile textures
  await preloadAll(monsters);
  initTileTextures();

  return { monsters, moves, types, evolutions, map };
}

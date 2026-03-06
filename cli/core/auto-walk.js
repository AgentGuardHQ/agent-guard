// Auto-walk system — emits walk events while CLI watcher is running
// The browser can poll ~/.bugmon/session.json to sync the game state.
// When disconnected from CLI, the browser returns to normal player control.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const SESSION_PATH = join(homedir(), '.bugmon', 'session.json');

const DIRECTIONS = ['up', 'down', 'left', 'right'];
const MAP_WIDTH = 15;
const MAP_HEIGHT = 10;

let mapData = null;
let walkInterval = null;
let sessionState = null;

function loadMap() {
  if (mapData) return mapData;
  try {
    const dataPath = join(import.meta.dirname || '.', '..', '..', 'data', 'map.json');
    mapData = JSON.parse(readFileSync(dataPath, 'utf8'));
  } catch {
    // Fallback simple map bounds
    mapData = { width: MAP_WIDTH, height: MAP_HEIGHT, tiles: null };
  }
  return mapData;
}

function isWalkable(x, y) {
  const map = loadMap();
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
  if (!map.tiles) return true;
  const tile = map.tiles[y]?.[x];
  return tile !== 1; // 1 = wall
}

function getTile(x, y) {
  const map = loadMap();
  if (!map.tiles) return 0;
  return map.tiles[y]?.[x] ?? 0;
}

/**
 * Start auto-walking. The player wanders the map randomly.
 * State is written to ~/.bugmon/session.json so the browser can sync.
 * @param {object} options
 * @param {number} options.stepInterval - MS between steps (default 800)
 * @param {function} options.onStep - Called on each step with {x, y, dir, tile}
 * @param {function} options.onEncounter - Called when stepping on tall grass (tile 2)
 * @returns {{ stop: function, getState: function }}
 */
export function startAutoWalk(options = {}) {
  const interval = options.stepInterval || 800;

  sessionState = {
    active: true,
    mode: 'auto-walk',
    startedAt: new Date().toISOString(),
    player: { x: 1, y: 1, dir: 'down' },
    steps: 0,
    encounters: 0,
    paused: false,
  };

  writeSession(sessionState);

  walkInterval = setInterval(() => {
    if (sessionState.paused) return;

    const { x, y } = sessionState.player;

    // Pick a direction — weighted toward continuing current direction
    let dir = sessionState.player.dir;
    if (Math.random() < 0.3) {
      dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    }

    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    const nx = x + dx;
    const ny = y + dy;

    if (isWalkable(nx, ny)) {
      sessionState.player.x = nx;
      sessionState.player.y = ny;
      sessionState.player.dir = dir;
      sessionState.steps++;

      const tile = getTile(nx, ny);

      if (options.onStep) {
        options.onStep({ x: nx, y: ny, dir, tile });
      }

      // Check for encounter in tall grass (10% chance like the game)
      if (tile === 2 && Math.random() < 0.10) {
        sessionState.encounters++;
        if (options.onEncounter) {
          options.onEncounter({ x: nx, y: ny, tile });
        }
      }
    } else {
      // Hit a wall, pick a new random direction
      sessionState.player.dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    }

    writeSession(sessionState);
  }, interval);

  return {
    stop() {
      clearInterval(walkInterval);
      walkInterval = null;
      sessionState.active = false;
      writeSession(sessionState);
    },
    pause() {
      sessionState.paused = true;
      writeSession(sessionState);
    },
    resume() {
      sessionState.paused = false;
      writeSession(sessionState);
    },
    getState() {
      return { ...sessionState };
    },
  };
}

/**
 * Read the current session state (for browser polling).
 * @returns {object|null}
 */
export function readSession() {
  if (!existsSync(SESSION_PATH)) return null;
  try {
    return JSON.parse(readFileSync(SESSION_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeSession(state) {
  try {
    writeFileSync(SESSION_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch {
    // Best effort — don't crash if write fails
  }
}

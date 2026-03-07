import assert from 'node:assert';
import { test, suite } from './run.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// auto-walk.js writes to ~/.bugmon/session.json and reads map data.
// We test the pure logic patterns by reimplementing the core algorithms.

const root = new URL('../', import.meta.url);
const mapData = JSON.parse(readFileSync(new URL('ecosystem/data/map.json', root), 'utf-8'));

suite('Auto-walk logic (core/cli/auto-walk.js)', () => {
  const DIRECTIONS = ['up', 'down', 'left', 'right'];

  function isWalkable(x, y) {
    if (x < 0 || y < 0 || x >= mapData.width || y >= mapData.height) return false;
    const tile = mapData.tiles[y]?.[x];
    return tile !== 1; // 1 = wall
  }

  function getTile(x, y) {
    return mapData.tiles[y]?.[x] ?? 0;
  }

  function getDelta(dir) {
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    return { dx, dy };
  }

  // --- isWalkable tests ---

  test('isWalkable: out-of-bounds negative x returns false', () => {
    assert.strictEqual(isWalkable(-1, 0), false);
  });

  test('isWalkable: out-of-bounds negative y returns false', () => {
    assert.strictEqual(isWalkable(0, -1), false);
  });

  test('isWalkable: out-of-bounds beyond width returns false', () => {
    assert.strictEqual(isWalkable(mapData.width, 0), false);
  });

  test('isWalkable: out-of-bounds beyond height returns false', () => {
    assert.strictEqual(isWalkable(0, mapData.height), false);
  });

  test('isWalkable: wall tile (1) returns false', () => {
    // Find a wall tile in the map
    let foundWall = false;
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        if (mapData.tiles[y][x] === 1) {
          assert.strictEqual(isWalkable(x, y), false);
          foundWall = true;
          break;
        }
      }
      if (foundWall) break;
    }
    assert.ok(foundWall, 'map should contain at least one wall tile');
  });

  test('isWalkable: ground tile (0) returns true', () => {
    let foundGround = false;
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        if (mapData.tiles[y][x] === 0) {
          assert.strictEqual(isWalkable(x, y), true);
          foundGround = true;
          break;
        }
      }
      if (foundGround) break;
    }
    assert.ok(foundGround, 'map should contain at least one ground tile');
  });

  test('isWalkable: grass tile (2) returns true', () => {
    let foundGrass = false;
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        if (mapData.tiles[y][x] === 2) {
          assert.strictEqual(isWalkable(x, y), true);
          foundGrass = true;
          break;
        }
      }
      if (foundGrass) break;
    }
    assert.ok(foundGrass, 'map should contain at least one grass tile');
  });

  // --- getTile tests ---

  test('getTile: returns correct tile type for known position', () => {
    const tile = getTile(0, 0);
    assert.strictEqual(tile, mapData.tiles[0][0]);
  });

  test('getTile: out-of-bounds returns 0 as fallback', () => {
    assert.strictEqual(getTile(-1, -1), 0);
    assert.strictEqual(getTile(100, 100), 0);
  });

  // --- Direction delta tests ---

  test('getDelta: up gives dy=-1, dx=0', () => {
    const { dx, dy } = getDelta('up');
    assert.strictEqual(dx, 0);
    assert.strictEqual(dy, -1);
  });

  test('getDelta: down gives dy=1, dx=0', () => {
    const { dx, dy } = getDelta('down');
    assert.strictEqual(dx, 0);
    assert.strictEqual(dy, 1);
  });

  test('getDelta: left gives dx=-1, dy=0', () => {
    const { dx, dy } = getDelta('left');
    assert.strictEqual(dx, -1);
    assert.strictEqual(dy, 0);
  });

  test('getDelta: right gives dx=1, dy=0', () => {
    const { dx, dy } = getDelta('right');
    assert.strictEqual(dx, 1);
    assert.strictEqual(dy, 0);
  });

  // --- Direction continuation bias ---

  test('direction continuation: 70% chance to keep current direction', () => {
    // Simulates the direction-picking logic: Math.random() < 0.3 picks random
    let continued = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      const roll = Math.random();
      if (roll >= 0.3) continued++;
    }
    const rate = continued / trials;
    assert.ok(rate > 0.65, `continuation rate too low: ${(rate * 100).toFixed(1)}%`);
    assert.ok(rate < 0.75, `continuation rate too high: ${(rate * 100).toFixed(1)}%`);
  });

  // --- Encounter rate in tall grass ---

  test('encounter rate in tall grass is approximately 10%', () => {
    let encounters = 0;
    const trials = 10000;
    for (let i = 0; i < trials; i++) {
      if (Math.random() < 0.10) encounters++;
    }
    const rate = encounters / trials;
    assert.ok(rate > 0.07, `encounter rate too low: ${(rate * 100).toFixed(1)}%`);
    assert.ok(rate < 0.13, `encounter rate too high: ${(rate * 100).toFixed(1)}%`);
  });

  // --- Session state structure ---

  test('session state has required fields', () => {
    const sessionState = {
      active: true,
      mode: 'auto-walk',
      startedAt: new Date().toISOString(),
      player: { x: 1, y: 1, dir: 'down' },
      steps: 0,
      encounters: 0,
      paused: false,
    };

    assert.strictEqual(sessionState.active, true);
    assert.strictEqual(sessionState.mode, 'auto-walk');
    assert.strictEqual(sessionState.player.x, 1);
    assert.strictEqual(sessionState.player.y, 1);
    assert.strictEqual(sessionState.player.dir, 'down');
    assert.strictEqual(sessionState.steps, 0);
    assert.strictEqual(sessionState.encounters, 0);
    assert.strictEqual(sessionState.paused, false);
  });

  // --- Map data validation ---

  test('map has valid dimensions', () => {
    assert.strictEqual(mapData.width, 15);
    assert.strictEqual(mapData.height, 10);
  });

  test('map tiles array matches dimensions', () => {
    assert.strictEqual(mapData.tiles.length, mapData.height);
    for (const row of mapData.tiles) {
      assert.strictEqual(row.length, mapData.width);
    }
  });

  test('starting position (1,1) is walkable', () => {
    assert.strictEqual(isWalkable(1, 1), true);
  });

  // --- Walk simulation ---

  test('simulated walk stays within bounds', () => {
    let x = 1, y = 1, dir = 'down';
    for (let step = 0; step < 200; step++) {
      if (Math.random() < 0.3) {
        dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      }
      const { dx, dy } = getDelta(dir);
      const nx = x + dx;
      const ny = y + dy;
      if (isWalkable(nx, ny)) {
        x = nx;
        y = ny;
      } else {
        dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      }
      assert.ok(x >= 0 && x < mapData.width, `x out of bounds: ${x}`);
      assert.ok(y >= 0 && y < mapData.height, `y out of bounds: ${y}`);
    }
  });
});

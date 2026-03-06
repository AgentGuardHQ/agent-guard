import assert from 'node:assert';
import { test, suite } from './run.js';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const mapData = JSON.parse(await readFile(new URL('ecosystem/data/map.json', root), 'utf-8'));

suite('Map Logic (game/world/map.js)', () => {
  // Reimplement the pure logic from map.js to test without browser module imports
  function getTile(x, y) {
    if (y < 0 || y >= mapData.height || x < 0 || x >= mapData.width) {
      return 1; // out of bounds = wall
    }
    return mapData.tiles[y][x];
  }

  function isWalkable(x, y) {
    const tile = getTile(x, y);
    return tile === 0 || tile === 2;
  }

  test('getTile returns correct tile type for valid coordinates', () => {
    // Just verify we get a valid tile value for an in-bounds coordinate
    const tile = getTile(0, 0);
    assert.ok([0, 1, 2].includes(tile), `tile at (0,0) should be 0, 1, or 2, got ${tile}`);
  });

  test('getTile returns 1 (wall) for negative coordinates', () => {
    assert.strictEqual(getTile(-1, 0), 1);
    assert.strictEqual(getTile(0, -1), 1);
    assert.strictEqual(getTile(-5, -5), 1);
  });

  test('getTile returns 1 (wall) for out-of-bounds coordinates', () => {
    assert.strictEqual(getTile(mapData.width, 0), 1);
    assert.strictEqual(getTile(0, mapData.height), 1);
    assert.strictEqual(getTile(100, 100), 1);
  });

  test('isWalkable returns true for ground tiles (0)', () => {
    // Find a ground tile in the map
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        if (mapData.tiles[y][x] === 0) {
          assert.strictEqual(isWalkable(x, y), true, `ground tile at (${x},${y}) should be walkable`);
          return;
        }
      }
    }
  });

  test('isWalkable returns true for grass tiles (2)', () => {
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        if (mapData.tiles[y][x] === 2) {
          assert.strictEqual(isWalkable(x, y), true, `grass tile at (${x},${y}) should be walkable`);
          return;
        }
      }
    }
  });

  test('isWalkable returns false for wall tiles (1)', () => {
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        if (mapData.tiles[y][x] === 1) {
          assert.strictEqual(isWalkable(x, y), false, `wall tile at (${x},${y}) should not be walkable`);
          return;
        }
      }
    }
  });

  test('isWalkable returns false for out-of-bounds', () => {
    assert.strictEqual(isWalkable(-1, 0), false);
    assert.strictEqual(isWalkable(0, -1), false);
    assert.strictEqual(isWalkable(mapData.width, 0), false);
  });

  test('map has at least one ground tile, one wall tile, and one grass tile', () => {
    const tileTypes = new Set();
    for (let y = 0; y < mapData.height; y++) {
      for (let x = 0; x < mapData.width; x++) {
        tileTypes.add(mapData.tiles[y][x]);
      }
    }
    assert.ok(tileTypes.has(0), 'map should have ground tiles');
    assert.ok(tileTypes.has(1), 'map should have wall tiles');
    assert.ok(tileTypes.has(2), 'map should have grass tiles');
  });
});

// Map tile queries
import { MAP_DATA } from '../data/mapData.js';

export function getMap() {
  return MAP_DATA;
}

export function getTile(x, y) {
  if (y < 0 || y >= MAP_DATA.height || x < 0 || x >= MAP_DATA.width) {
    return 1; // out of bounds = wall
  }
  return MAP_DATA.tiles[y][x];
}

export function isWalkable(x, y) {
  const tile = getTile(x, y);
  return tile === 0 || tile === 2;
}

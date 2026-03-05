// Map loading and tile queries
let mapData = null;

export async function loadMap() {
  const res = await fetch('data/map.json');
  mapData = await res.json();
  return mapData;
}

export function getMap() {
  return mapData;
}

export function getTile(x, y) {
  if (!mapData || y < 0 || y >= mapData.height || x < 0 || x >= mapData.width) {
    return 1; // out of bounds = wall
  }
  return mapData.tiles[y][x];
}

export function isWalkable(x, y) {
  const tile = getTile(x, y);
  return tile === 0 || tile === 2;
}

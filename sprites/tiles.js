// Procedural tile textures
const TILE = 32;

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function createGroundTile() {
  const c = mkCanvas(TILE, TILE);
  const ctx = c.getContext('2d');
  const rng = mulberry32(42);
  ctx.fillStyle = '#c2b280';
  ctx.fillRect(0, 0, TILE, TILE);
  for (let y = 0; y < TILE; y += 2) {
    for (let x = 0; x < TILE; x += 2) {
      const o = (rng() - 0.5) * 24 | 0;
      ctx.fillStyle = `rgb(${194 + o},${178 + o},${128 + o})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  return c;
}

function createWallTile() {
  const c = mkCanvas(TILE, TILE);
  const ctx = c.getContext('2d');
  const rng = mulberry32(99);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, 0, TILE, TILE);
  for (let row = 0; row * 9 < TILE; row++) {
    const by = row * 9;
    const off = (row % 2) * 8;
    for (let col = -1; col * 16 + off < TILE; col++) {
      const bx = col * 16 + off;
      if (bx + 15 <= 0) continue;
      const v = (rng() - 0.5) * 20 | 0;
      ctx.fillStyle = `rgb(${85 + v},${85 + v},${85 + v})`;
      const dx = Math.max(0, bx), dw = Math.min(bx + 15, TILE) - dx;
      ctx.fillRect(dx, by, dw, 8);
    }
  }
  return c;
}

function createGrassTile(swayIdx) {
  const c = mkCanvas(TILE, TILE);
  const ctx = c.getContext('2d');
  const rng = mulberry32(77);
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < 12; i++) {
    const bx = (rng() * 28 | 0) + 2;
    const bh = (rng() * 12 | 0) + 10;
    const sway = Math.sin(swayIdx * Math.PI / 2 + bx * 0.15) * 2.5;
    const g = (rng() * 60 | 0) + 100;
    ctx.fillStyle = `rgb(${g * 0.2 | 0},${g},${g * 0.15 | 0})`;
    ctx.beginPath();
    ctx.moveTo(bx - 2, TILE);
    ctx.lineTo(bx + 2, TILE);
    ctx.lineTo(bx + sway, TILE - bh);
    ctx.fill();
  }
  return c;
}

function createBattleBackground() {
  const c = mkCanvas(480, 240);
  const ctx = c.getContext('2d');
  const rng = mulberry32(123);
  const sky = ctx.createLinearGradient(0, 0, 0, 140);
  sky.addColorStop(0, '#0a0a1e');
  sky.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 480, 140);
  for (let i = 0; i < 25; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rng() * 0.4 + 0.3})`;
    ctx.fillRect(rng() * 480 | 0, rng() * 110 | 0, rng() < 0.3 ? 2 : 1, 1);
  }
  const gnd = ctx.createLinearGradient(0, 140, 0, 240);
  gnd.addColorStop(0, '#1a2a1a');
  gnd.addColorStop(1, '#0a150a');
  ctx.fillStyle = gnd;
  ctx.fillRect(0, 140, 480, 100);
  return c;
}

let groundTile = null, wallTile = null, grassFrames = [], battleBg = null;

export function initTileTextures() {
  groundTile = createGroundTile();
  wallTile = createWallTile();
  grassFrames = [0, 1, 2, 3].map(i => createGrassTile(i));
  battleBg = createBattleBackground();
}

export function getTileTexture(type) {
  return type === 'wall' ? wallTile : groundTile;
}

export function getGrassFrame(frameCount) {
  return grassFrames[Math.floor(frameCount / 15) % 4];
}

export function getBattleBackground() { return battleBg; }

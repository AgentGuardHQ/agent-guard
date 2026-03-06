// Procedural tile textures and battle background
// All art is generated via canvas drawing — no image files needed

const TILE = 32;

// Seeded PRNG for deterministic noise patterns (no flicker between frames)
function mulberry32(seed) {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// --- Ground tile: sandy dirt with subtle noise and pebbles ---
function createGroundTile() {
  const c = createCanvas(TILE, TILE);
  const ctx = c.getContext('2d');
  const rng = mulberry32(42);

  // Base fill
  ctx.fillStyle = '#c2b280';
  ctx.fillRect(0, 0, TILE, TILE);

  // Subtle noise: vary brightness per 2x2 block
  for (let y = 0; y < TILE; y += 2) {
    for (let x = 0; x < TILE; x += 2) {
      const offset = Math.floor((rng() - 0.5) * 24);
      const r = 194 + offset;
      const g = 178 + offset;
      const b = 128 + offset;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Pebble dots
  for (let i = 0; i < 4; i++) {
    const px = Math.floor(rng() * 30) + 1;
    const py = Math.floor(rng() * 30) + 1;
    const shade = Math.floor(rng() * 40) + 120;
    ctx.fillStyle = `rgb(${shade},${shade - 10},${shade - 20})`;
    ctx.fillRect(px, py, 2, 2);
  }

  return c;
}

// --- Wall tile: brick pattern with mortar and per-brick variation ---
function createWallTile() {
  const c = createCanvas(TILE, TILE);
  const ctx = c.getContext('2d');
  const rng = mulberry32(99);

  const brickH = 8;
  const brickW = 15;
  const mortar = 1;

  // Mortar base
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, 0, TILE, TILE);

  // Draw bricks
  for (let row = 0; row * (brickH + mortar) < TILE; row++) {
    const by = row * (brickH + mortar);
    const offsetX = (row % 2) * Math.floor(brickW / 2 + mortar);

    for (let col = -1; col * (brickW + mortar) + offsetX < TILE; col++) {
      const bx = col * (brickW + mortar) + offsetX;
      if (bx + brickW <= 0) continue;

      // Per-brick color variation
      const variation = Math.floor((rng() - 0.5) * 20);
      const r = 85 + variation;
      const g = 85 + variation;
      const b = 85 + variation;
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      const drawX = Math.max(0, bx);
      const drawW = Math.min(bx + brickW, TILE) - drawX;
      ctx.fillRect(drawX, by, drawW, brickH);

      // Top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(drawX, by, drawW, 1);

      // Bottom shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(drawX, by + brickH - 1, drawW, 1);
    }
  }

  return c;
}

// --- Grass tile: tall blades with sway animation ---
function createGrassTile(swayIndex) {
  const c = createCanvas(TILE, TILE);
  const ctx = c.getContext('2d');
  const rng = mulberry32(77);

  // Base green fill
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0, 0, TILE, TILE);

  // Darker undergrowth texture
  for (let y = 0; y < TILE; y += 4) {
    for (let x = 0; x < TILE; x += 4) {
      if (rng() < 0.3) {
        ctx.fillStyle = 'rgba(0,80,0,0.25)';
        ctx.fillRect(x, y, 4, 4);
      }
    }
  }

  // Grass blades
  const bladeCount = 12;
  for (let i = 0; i < bladeCount; i++) {
    const bx = Math.floor(rng() * 28) + 2;
    const bladeH = Math.floor(rng() * 12) + 10;
    const baseY = TILE;
    const tipSway = Math.sin(swayIndex * Math.PI / 2 + bx * 0.15) * 2.5;

    // Blade color variation
    const g = Math.floor(rng() * 60) + 100;
    ctx.fillStyle = `rgb(${Math.floor(g * 0.2)},${g},${Math.floor(g * 0.15)})`;

    // Draw blade as triangle
    ctx.beginPath();
    ctx.moveTo(bx - 2, baseY);
    ctx.lineTo(bx + 2, baseY);
    ctx.lineTo(bx + tipSway, baseY - bladeH);
    ctx.fill();
  }

  return c;
}

// --- Battle background: dark sky with stars + ground plane ---
function createBattleBackground() {
  const c = createCanvas(480, 240);
  const ctx = c.getContext('2d');
  const rng = mulberry32(123);

  // Sky gradient (top 140px)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 140);
  skyGrad.addColorStop(0, '#0a0a1e');
  skyGrad.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 480, 140);

  // Stars
  for (let i = 0; i < 25; i++) {
    const sx = Math.floor(rng() * 480);
    const sy = Math.floor(rng() * 110);
    const alpha = rng() * 0.4 + 0.3;
    const size = rng() < 0.3 ? 2 : 1;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(sx, sy, size, size);
  }

  // Ground plane gradient (140-240)
  const groundGrad = ctx.createLinearGradient(0, 140, 0, 240);
  groundGrad.addColorStop(0, '#1a2a1a');
  groundGrad.addColorStop(1, '#0a150a');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, 140, 480, 100);

  // Subtle horizontal terrain streaks
  for (let i = 0; i < 8; i++) {
    const sy = 150 + Math.floor(rng() * 80);
    ctx.fillStyle = `rgba(30,50,30,${rng() * 0.3 + 0.1})`;
    ctx.fillRect(0, sy, 480, 1);
  }

  // Grass tufts along horizon
  for (let i = 0; i < 15; i++) {
    const tx = Math.floor(rng() * 470);
    const th = Math.floor(rng() * 8) + 4;
    const tw = Math.floor(rng() * 4) + 2;
    ctx.fillStyle = `rgb(${20 + Math.floor(rng() * 15)},${50 + Math.floor(rng() * 20)},${20 + Math.floor(rng() * 10)})`;
    ctx.beginPath();
    ctx.moveTo(tx, 140);
    ctx.lineTo(tx + tw, 140);
    ctx.lineTo(tx + tw / 2, 140 - th);
    ctx.fill();
  }

  // Subtle corner vignette
  const vigGrad = ctx.createRadialGradient(240, 120, 100, 240, 120, 340);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, 480, 240);

  return c;
}

// --- Cache and public API ---
let groundTile = null;
let wallTile = null;
let grassFrames = [];
let battleBg = null;

export function initTileTextures() {
  groundTile = createGroundTile();
  wallTile = createWallTile();
  grassFrames = [
    createGrassTile(0),
    createGrassTile(1),
    createGrassTile(2),
    createGrassTile(3)
  ];
  battleBg = createBattleBackground();
}

export function getTileTexture(type) {
  if (type === 'wall') return wallTile;
  return groundTile;
}

export function getGrassFrame(frameCount) {
  const idx = Math.floor(frameCount / 15) % 4;
  return grassFrames[idx];
}

export function getBattleBackground() {
  return battleBg;
}

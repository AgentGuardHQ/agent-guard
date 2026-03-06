// Procedural monster sprite generator (simplified)
const monsterCache = new Map();

function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  return '#' + [r + amt, g + amt, b + amt].map(c => Math.max(0, Math.min(255, c | 0)).toString(16).padStart(2, '0')).join('');
}

export function generateMonster(monsterId, color, size) {
  const key = `${monsterId}_${color}_${size}`;
  if (monsterCache.has(key)) return monsterCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(monsterId * 7919 + 31);
  const px = size / 10;

  // Generate symmetric body on 5x10 grid
  const grid = Array.from({length: 10}, () => new Uint8Array(5));
  const bodyTop = 1 + (rand() * 2 | 0);
  const bodyBot = 7 + (rand() * 2 | 0);

  for (let y = bodyTop; y <= bodyBot; y++) {
    const p = (y - bodyTop) / (bodyBot - bodyTop);
    const w = Math.max(2, Math.min(5, p < 0.3 ? 3 : p < 0.7 ? 4 : 3));
    for (let x = 0; x < w; x++) grid[y][x] = 1;
  }

  // Draw mirrored
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 5; x++) {
      if (!grid[y][x]) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * px, y * px, px + 0.5, px + 0.5);
      ctx.fillRect((9 - x) * px, y * px, px + 0.5, px + 0.5);
    }
  }

  // Eyes
  const eyeY = (bodyTop + 1) * px + px * 0.2;
  const ew = px * 0.8;
  ctx.fillStyle = '#fff';
  ctx.fillRect(2 * px + px * 0.2, eyeY, ew, ew);
  ctx.fillRect(7 * px + px * 0.2, eyeY, ew, ew);
  ctx.fillStyle = '#111';
  const ps = ew * 0.5, po = (ew - ps) / 2;
  ctx.fillRect(2 * px + px * 0.2 + po, eyeY + po, ps, ps);
  ctx.fillRect(7 * px + px * 0.2 + po, eyeY + po, ps, ps);

  monsterCache.set(key, canvas);
  return canvas;
}

export function generateEgg(monsterId, color, size) {
  const key = `egg_${monsterId}_${color}_${size}`;
  if (monsterCache.has(key)) return monsterCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2 + size * 0.05;
  const rx = size * 0.3, ry = size * 0.38;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = shade(color, -50);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Highlight
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.25, cy - ry * 0.35, size * 0.04, size * 0.07, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();

  monsterCache.set(key, canvas);
  return canvas;
}

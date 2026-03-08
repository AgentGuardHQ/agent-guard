// Image-based sprite loader
// Drop PNG files into sprites/ and reference them by filename in monsters.json
// Falls back to colored squares if an image hasn't been added yet

const spriteCache = {};
const loadPromises = {};

export function preloadSprite(name) {
  if (loadPromises[name]) return loadPromises[name];

  loadPromises[name] = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      spriteCache[name] = img;
      resolve(img);
    };
    img.onerror = () => {
      spriteCache[name] = null; // mark as failed, use fallback
      resolve(null);
    };
    img.src = `sprites/${name}.png`;
  });

  return loadPromises[name];
}

export function getSprite(name) {
  return spriteCache[name] || null;
}

export function drawSprite(ctx, name, x, y, width, height) {
  const img = spriteCache[name];
  if (img) {
    ctx.imageSmoothingEnabled = false; // keep pixel art crisp
    ctx.drawImage(img, x, y, width, height);
    return true;
  }
  return false; // caller should draw fallback
}

// Preload all sprites for a set of monsters + the player
export async function preloadAll(monsters) {
  const names = monsters.map((m) => m.sprite).filter(Boolean);
  names.push('player_down', 'player_up', 'player_left', 'player_right');
  await Promise.all(names.map(preloadSprite));
}

// Image-based sprite loader

const spriteCache: Record<string, HTMLImageElement | null> = {};
const loadPromises: Record<string, Promise<HTMLImageElement | null>> = {};

export function preloadSprite(name: string): Promise<HTMLImageElement | null> {
  if (name in loadPromises) return loadPromises[name];

  loadPromises[name] = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      spriteCache[name] = img;
      resolve(img);
    };
    img.onerror = () => {
      spriteCache[name] = null;
      resolve(null);
    };
    img.src = `sprites/${name}.png`;
  });

  return loadPromises[name];
}

export function getSprite(name: string): HTMLImageElement | null {
  return spriteCache[name] || null;
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  const img = spriteCache[name];
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, width, height);
    return true;
  }
  return false;
}

export async function preloadAll(monsters: Array<{ sprite?: string }>): Promise<void> {
  const names = monsters.map((m) => m.sprite).filter(Boolean) as string[];
  names.push('player_down', 'player_up', 'player_left', 'player_right');
  await Promise.all(names.map(preloadSprite));
}

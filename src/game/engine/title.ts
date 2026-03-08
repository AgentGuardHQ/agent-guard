// Title screen

import { wasPressed } from './input.js';
import { hasSave } from '../sync/save.js';
import { playMenuNav, playMenuConfirm } from '../audio/sound.js';

let menuIndex = 0;
let elapsed = 0;
let initialized = false;

function initTitle(): void {
  if (initialized) return;
  initialized = true;
  menuIndex = 0;
  elapsed = 0;
}

export function updateTitle(dt: number): 'continue' | 'new' | null {
  initTitle();
  elapsed += dt;

  const canContinue = hasSave();
  const optionCount = canContinue ? 2 : 1;

  if (wasPressed('ArrowUp') || wasPressed('ArrowLeft')) {
    menuIndex = Math.max(0, menuIndex - 1);
    playMenuNav();
  }
  if (wasPressed('ArrowDown') || wasPressed('ArrowRight')) {
    menuIndex = Math.min(optionCount - 1, menuIndex + 1);
    playMenuNav();
  }

  if (wasPressed('Enter') || wasPressed(' ')) {
    playMenuConfirm();
    initialized = false;
    if (canContinue && menuIndex === 0) return 'continue';
    return 'new';
  }
  return null;
}

export function drawTitle(ctx: CanvasRenderingContext2D): void {
  const t = elapsed / 1000;

  ctx.fillStyle = '#08081a';
  ctx.fillRect(0, 0, 480, 320);

  // Stars (deterministic from index)
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  for (let i = 0; i < 40; i++) {
    const h = (i * 9301 + 49297) % 233280;
    ctx.fillRect(h % 480, (h * 7 + i * 131) % 320, 1, 1);
  }

  // Title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px monospace';
  ctx.shadowColor = '#e94560';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#e94560';
  ctx.fillText('BUGMON', 240, 70);
  ctx.shadowBlur = 0;

  // Tagline
  ctx.font = '11px monospace';
  ctx.fillStyle = `rgba(0,255,255,${0.4 + Math.sin(t * 2.2) * 0.15})`;
  ctx.fillText("// Gotta Cache 'Em All", 240, 100);

  // Menu
  const canContinue = hasSave();
  const options = canContinue ? ['CONTINUE', 'NEW GAME'] : ['NEW GAME'];

  options.forEach((opt, i) => {
    const y = 155 + i * 30;
    const sel = i === menuIndex;
    if (sel) {
      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 1;
      ctx.shadowColor = '#e94560';
      ctx.shadowBlur = 8;
      ctx.strokeRect(175, y - 11, 130, 22);
      ctx.shadowBlur = 0;
    }
    ctx.font = sel ? 'bold 13px monospace' : '12px monospace';
    ctx.fillStyle = sel ? '#fff' : 'rgba(255,255,255,0.35)';
    ctx.fillText(opt, 240, y);
  });

  // Prompt
  if (Math.sin(t * 3) > 0) {
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText('[ENTER] to select', 240, 230);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

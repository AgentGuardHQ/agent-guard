// Title screen — themed with Press Start 2P / VT323 fonts

import { wasPressed } from './input.js';
import { hasSave } from '../sync/save.js';
import { playMenuNav, playMenuConfirm } from '../audio/sound.js';
import { Color, Font, CANVAS_W, CANVAS_H, applyGlow, clearGlow } from '../theme.js';

let menuIndex = 0;
let elapsed = 0;
let initialized = false;

function initTitle(): void {
  if (initialized) return;
  initialized = true;
  menuIndex = 0;
  elapsed = 0;
}

export type TitleResult = 'continue' | 'new' | 'grimoire' | null;

export function updateTitle(dt: number): TitleResult {
  initTitle();
  elapsed += dt;

  const canContinue = hasSave();
  const options = getOptions(canContinue);

  if (wasPressed('ArrowUp') || wasPressed('ArrowLeft')) {
    menuIndex = Math.max(0, menuIndex - 1);
    playMenuNav();
  }
  if (wasPressed('ArrowDown') || wasPressed('ArrowRight')) {
    menuIndex = Math.min(options.length - 1, menuIndex + 1);
    playMenuNav();
  }

  if (wasPressed('Enter') || wasPressed(' ')) {
    playMenuConfirm();
    initialized = false;
    const selected = options[menuIndex];
    if (selected === 'CONTINUE') return 'continue';
    if (selected === 'NEW GAME') return 'new';
    if (selected === 'GRIMOIRE') return 'grimoire';
  }
  return null;
}

function getOptions(canContinue: boolean): string[] {
  if (canContinue) return ['CONTINUE', 'NEW GAME', 'GRIMOIRE'];
  return ['NEW GAME', 'GRIMOIRE'];
}

export function drawTitle(ctx: CanvasRenderingContext2D): void {
  const t = elapsed / 1000;

  // Background
  ctx.fillStyle = Color.bgDeep;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Stars (deterministic from index)
  for (let i = 0; i < 50; i++) {
    const h = (i * 9301 + 49297) % 233280;
    const x = h % CANVAS_W;
    const y = (h * 7 + i * 131) % CANVAS_H;
    const brightness = 0.2 + (((i * 7919) % 100) / 100) * 0.5;
    // Twinkling
    const twinkle = Math.sin(t * 1.5 + i * 0.7) * 0.15;
    ctx.fillStyle = `rgba(255,255,255,${(brightness + twinkle).toFixed(2)})`;
    const size = ((i * 1301) % 3) === 0 ? 2 : 1;
    ctx.fillRect(x, y, size, size);
  }
  // A few cyan-tinted stars
  for (let i = 0; i < 8; i++) {
    const h = (i * 4271 + 17389) % 233280;
    ctx.fillStyle = `rgba(0,255,255,${(0.15 + Math.sin(t * 2 + i) * 0.1).toFixed(2)})`;
    ctx.fillRect(h % CANVAS_W, (h * 3 + i * 97) % CANVAS_H, 1, 1);
  }

  // Title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = Font.titleLg;
  applyGlow(ctx, Color.accentPrimary, 16);
  ctx.fillStyle = Color.accentPrimary;
  ctx.fillText('BUGMON', CANVAS_W / 2, 65);
  clearGlow(ctx);

  // Tagline
  ctx.font = Font.uiMd;
  const tagAlpha = 0.4 + Math.sin(t * 2.2) * 0.15;
  ctx.fillStyle = `rgba(0,255,255,${tagAlpha.toFixed(2)})`;
  ctx.fillText("// Gotta Cache 'Em All", CANVAS_W / 2, 95);

  // Version / roguelike label
  ctx.font = Font.uiSm;
  ctx.fillStyle = Color.textDisabled;
  ctx.fillText('Roguelike Debugging RPG', CANVAS_W / 2, 115);

  // Menu
  const canContinue = hasSave();
  const options = getOptions(canContinue);

  options.forEach((opt, i) => {
    const y = 155 + i * 28;
    const sel = i === menuIndex;

    if (sel) {
      // Selection box with glow
      applyGlow(ctx, Color.accentPrimary, 8);
      ctx.strokeStyle = Color.accentPrimary;
      ctx.lineWidth = 1;
      ctx.strokeRect(CANVAS_W / 2 - 72, y - 10, 144, 20);
      clearGlow(ctx);

      // Selection arrow
      ctx.font = Font.bodySm;
      ctx.fillStyle = Color.accentPrimary;
      ctx.fillText('▸', CANVAS_W / 2 - 66, y + 1);
    }

    ctx.font = sel ? Font.bodySm : Font.uiMd;
    ctx.fillStyle = sel ? Color.textWhite : Color.textDisabled;
    ctx.fillText(opt, CANVAS_W / 2, y);
  });

  // Blinking prompt
  if (Math.sin(t * 3) > 0) {
    ctx.font = Font.uiSm;
    ctx.fillStyle = Color.textDisabled;
    ctx.fillText('[ENTER] to select', CANVAS_W / 2, 245);
  }

  // Footer
  ctx.font = Font.uiSm;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillText('Zero-dep browser game  |  Canvas 2D + Web Audio', CANVAS_W / 2, CANVAS_H - 12);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

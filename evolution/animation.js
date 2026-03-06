// Evolution animation - simplified
import { playEvolution } from '../audio/sound.js';
import { drawSprite } from '../sprites/sprites.js';

let evoAnim = null;
const PHASES = [2000, 3000, 1500, 2000]; // announce, flash, reveal, complete
const TOTAL = PHASES.reduce((a, b) => a + b, 0);

export function startEvolutionAnimation(fromMon, toMon) {
  evoAnim = { fromMon, toMon, timer: 0, done: false };
  playEvolution();
  return evoAnim;
}

export function updateEvolutionAnimation(dt) {
  if (!evoAnim || evoAnim.done) return false;
  evoAnim.timer += dt;
  if (evoAnim.timer >= TOTAL) { evoAnim.done = true; return true; }
  return false;
}

export function drawEvolutionAnimation(ctx, w, h) {
  if (!evoAnim) return;
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2 - 20, sz = 96;
  const t = evoAnim.timer;
  const { fromMon, toMon } = evoAnim;

  if (t < PHASES[0]) {
    // Announce
    drawMon(ctx, fromMon, cx, cy, sz, 1);
    drawText(ctx, `What? ${fromMon.name} is evolving!`, cx, h - 50);
  } else if (t < PHASES[0] + PHASES[1]) {
    // Flash between forms
    const p = (t - PHASES[0]) / PHASES[1];
    const speed = 4 + p * 20;
    const showNew = Math.sin((t - PHASES[0]) * 0.01 * speed) > 0;
    const mon = showNew ? toMon : fromMon;
    drawMon(ctx, mon, cx, cy, sz * (1 + p * 0.2), 1);
    if (p > 0.8) {
      ctx.fillStyle = `rgba(255,255,255,${((p - 0.8) * 5).toFixed(2)})`;
      ctx.fillRect(0, 0, w, h);
    }
  } else if (t < PHASES[0] + PHASES[1] + PHASES[2]) {
    // Reveal
    const p = (t - PHASES[0] - PHASES[1]) / PHASES[2];
    if (p < 0.3) {
      ctx.fillStyle = `rgba(255,255,255,${(1 - p / 0.3).toFixed(2)})`;
      ctx.fillRect(0, 0, w, h);
    }
    drawMon(ctx, toMon, cx, cy, sz * 1.2, Math.min(1, p * 2));
  } else {
    // Complete
    drawMon(ctx, toMon, cx, cy, sz * 1.2, 1);
    drawText(ctx, `${fromMon.name} evolved into ${toMon.name}!`, cx, h - 50);
  }
}

function drawMon(ctx, mon, cx, cy, size, alpha) {
  ctx.globalAlpha = alpha;
  const x = cx - size / 2, y = cy - size / 2;
  if (!mon.sprite || !drawSprite(ctx, mon.sprite, x, y, size, size)) {
    ctx.fillStyle = mon.color;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

function drawText(ctx, text, x, y) {
  ctx.fillStyle = '#fff';
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

export function getEvolutionAnimation() { return evoAnim; }
export function clearEvolutionAnimation() { evoAnim = null; }

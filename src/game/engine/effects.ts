// Battle visual effects — floating damage numbers, HP drain, screen shake
//
// Usage: call spawn functions during battle events, call updateEffects(dt)
// each frame, call drawEffects(ctx) during render. Effects self-remove
// when their duration expires.

import { Color, Font, Timing, CANVAS_H, applyGlow, clearGlow } from '../theme.js';

// ── Floating text (damage numbers, "Super effective!", etc.) ─────────────

interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  elapsed: number;
  duration: number;
  size: 'sm' | 'md' | 'lg';
  glow?: string;
}

const floatingTexts: FloatingText[] = [];

export function spawnDamageNumber(
  damage: number,
  x: number,
  y: number,
  options?: { critical?: boolean; effectiveness?: number }
): void {
  const critical = options?.critical ?? false;
  const eff = options?.effectiveness ?? 1.0;

  let color: string = Color.textWhite;
  let size: FloatingText['size'] = 'md';
  let glow: string | undefined;

  if (critical) {
    color = Color.warning;
    size = 'lg';
    glow = Color.warning;
  }
  if (eff > 1.0) {
    color = Color.accentPrimary;
    glow = Color.accentPrimary;
  } else if (eff < 1.0) {
    color = Color.textSecondary;
    size = 'sm';
  }

  floatingTexts.push({
    text: `${damage}`,
    x,
    y,
    color,
    elapsed: 0,
    duration: Timing.damageFloatDuration,
    size,
    glow,
  });
}

export function spawnFloatingLabel(
  text: string,
  x: number,
  y: number,
  color?: string
): void {
  floatingTexts.push({
    text,
    x,
    y,
    color: color ?? Color.accentCyan,
    elapsed: 0,
    duration: Timing.damageFloatDuration + 200,
    size: 'sm',
  });
}

// ── Screen shake ─────────────────────────────────────────────────────────

interface ShakeState {
  intensity: number;
  elapsed: number;
  duration: number;
}

let shake: ShakeState | null = null;

export function triggerShake(intensity?: number, duration?: number): void {
  shake = {
    intensity: intensity ?? Timing.shakeIntensity,
    elapsed: 0,
    duration: duration ?? Timing.shakeDefault,
  };
}

export function getShakeOffset(): { x: number; y: number } {
  if (!shake) return { x: 0, y: 0 };
  const progress = shake.elapsed / shake.duration;
  const decay = 1 - progress;
  const freq = 30;
  const ox = Math.round(Math.sin(shake.elapsed * freq * 0.01) * shake.intensity * decay);
  const oy = Math.round(Math.cos(shake.elapsed * freq * 0.013) * shake.intensity * decay * 0.6);
  return { x: ox, y: oy };
}

// ── HP bar animation ─────────────────────────────────────────────────────

interface HPAnim {
  target: 'player' | 'enemy';
  from: number;
  to: number;
  elapsed: number;
  duration: number;
}

const hpAnims: HPAnim[] = [];

export function animateHP(
  target: 'player' | 'enemy',
  fromHP: number,
  toHP: number
): void {
  // Remove any existing animation for this target
  const idx = hpAnims.findIndex((a) => a.target === target);
  if (idx >= 0) hpAnims.splice(idx, 1);

  hpAnims.push({
    target,
    from: fromHP,
    to: toHP,
    elapsed: 0,
    duration: Timing.hpDrainDuration,
  });
}

export function getDisplayHP(target: 'player' | 'enemy', actualHP: number): number {
  const anim = hpAnims.find((a) => a.target === target);
  if (!anim) return actualHP;
  const t = Math.min(1, anim.elapsed / anim.duration);
  // Ease-out cubic
  const ease = 1 - Math.pow(1 - t, 3);
  return anim.from + (anim.to - anim.from) * ease;
}

// ── Sprite flash (damage taken indicator) ────────────────────────────────

interface SpriteFlash {
  target: 'player' | 'enemy';
  elapsed: number;
  duration: number;
}

let spriteFlash: SpriteFlash | null = null;

export function triggerSpriteFlash(target: 'player' | 'enemy'): void {
  spriteFlash = { target, elapsed: 0, duration: Timing.medium };
}

export function getSpriteAlpha(target: 'player' | 'enemy'): number {
  if (!spriteFlash || spriteFlash.target !== target) return 1;
  // Blink 3 times during duration
  const phase = (spriteFlash.elapsed / spriteFlash.duration) * 6;
  return Math.sin(phase * Math.PI) > 0 ? 0.3 : 1;
}

// ── Idle encounter feed ──────────────────────────────────────────────────

interface IdleFeedEntry {
  text: string;
  elapsed: number;
}

const idleFeed: IdleFeedEntry[] = [];
const MAX_FEED = 4;

export function pushIdleFeed(text: string): void {
  idleFeed.unshift({ text, elapsed: 0 });
  if (idleFeed.length > MAX_FEED) idleFeed.pop();
}

// ── Update all effects ───────────────────────────────────────────────────

export function updateEffects(dt: number): void {
  // Floating text
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].elapsed += dt;
    if (floatingTexts[i].elapsed >= floatingTexts[i].duration) {
      floatingTexts.splice(i, 1);
    }
  }

  // Screen shake
  if (shake) {
    shake.elapsed += dt;
    if (shake.elapsed >= shake.duration) shake = null;
  }

  // HP animations
  for (let i = hpAnims.length - 1; i >= 0; i--) {
    hpAnims[i].elapsed += dt;
    if (hpAnims[i].elapsed >= hpAnims[i].duration) {
      hpAnims.splice(i, 1);
    }
  }

  // Sprite flash
  if (spriteFlash) {
    spriteFlash.elapsed += dt;
    if (spriteFlash.elapsed >= spriteFlash.duration) spriteFlash = null;
  }

  // Idle feed
  for (let i = idleFeed.length - 1; i >= 0; i--) {
    idleFeed[i].elapsed += dt;
    if (idleFeed[i].elapsed >= Timing.idleFeedFade) {
      idleFeed.splice(i, 1);
    }
  }
}

// ── Draw floating text ───────────────────────────────────────────────────

export function drawFloatingTexts(ctx: CanvasRenderingContext2D): void {
  for (const ft of floatingTexts) {
    const t = ft.elapsed / ft.duration;
    const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    const yOff = t * -30; // float upward

    ctx.globalAlpha = alpha;
    if (ft.glow) applyGlow(ctx, ft.glow, 8);

    if (ft.size === 'lg') ctx.font = Font.bodyLg;
    else if (ft.size === 'md') ctx.font = Font.bodyMd;
    else ctx.font = Font.bodySm;

    ctx.fillStyle = ft.color;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y + yOff);

    if (ft.glow) clearGlow(ctx);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'left';
}

// ── Draw idle feed ───────────────────────────────────────────────────────

export function drawIdleFeed(ctx: CanvasRenderingContext2D): void {
  if (idleFeed.length === 0) return;
  ctx.font = Font.uiSm;
  for (let i = 0; i < idleFeed.length; i++) {
    const entry = idleFeed[i];
    const t = entry.elapsed / Timing.idleFeedFade;
    const alpha = t < 0.7 ? 0.7 : 0.7 * (1 - (t - 0.7) / 0.3);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = Color.textSecondary;
    ctx.fillText(entry.text, 6, CANVAS_H - 10 - i * 16);
  }
  ctx.globalAlpha = 1;
}

// ── Reset all effects (on battle end, state change) ──────────────────────

export function clearBattleEffects(): void {
  floatingTexts.length = 0;
  shake = null;
  hpAnims.length = 0;
  spriteFlash = null;
}

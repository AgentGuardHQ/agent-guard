// Evolution animation - visual sequence when a BugMon evolves
// Shows the old form morphing into the new form with particle effects

import { playEvolution } from '../audio/sound.js';
import { drawSprite } from '../sprites/sprites.js';

let evoAnim = null;

const PHASE_DURATIONS = {
  announce: 2000,    // "What? NullPointer is evolving!"
  flash: 3000,       // Flashing between old/new forms with increasing speed
  reveal: 1500,      // New form revealed with burst
  complete: 2000     // "NullPointer evolved into OptionalChaining!"
};

const TOTAL_DURATION = PHASE_DURATIONS.announce + PHASE_DURATIONS.flash +
                       PHASE_DURATIONS.reveal + PHASE_DURATIONS.complete;

export function startEvolutionAnimation(fromMon, toMon) {
  evoAnim = {
    fromMon,
    toMon,
    timer: 0,
    phase: 'announce',
    done: false
  };
  playEvolution();
  return evoAnim;
}

export function updateEvolutionAnimation(dt) {
  if (!evoAnim || evoAnim.done) return false;

  evoAnim.timer += dt;

  if (evoAnim.timer < PHASE_DURATIONS.announce) {
    evoAnim.phase = 'announce';
  } else if (evoAnim.timer < PHASE_DURATIONS.announce + PHASE_DURATIONS.flash) {
    evoAnim.phase = 'flash';
  } else if (evoAnim.timer < PHASE_DURATIONS.announce + PHASE_DURATIONS.flash + PHASE_DURATIONS.reveal) {
    evoAnim.phase = 'reveal';
  } else if (evoAnim.timer < TOTAL_DURATION) {
    evoAnim.phase = 'complete';
  } else {
    evoAnim.done = true;
    return true; // signal animation complete
  }

  return false;
}

export function drawEvolutionAnimation(ctx, width, height) {
  if (!evoAnim) return;

  // Dark background
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2 - 20;
  const spriteSize = 96;

  if (evoAnim.phase === 'announce') {
    // Show old form with pulsing glow
    const pulse = Math.sin(evoAnim.timer * 0.005) * 0.3 + 0.7;
    drawEvoGlow(ctx, centerX, centerY, evoAnim.fromMon.color, pulse * 40);
    drawEvoSprite(ctx, evoAnim.fromMon, centerX, centerY, spriteSize, 1.0);

    // Text
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`What? ${evoAnim.fromMon.name} is evolving!`, centerX, height - 50);
    ctx.textAlign = 'left';

  } else if (evoAnim.phase === 'flash') {
    // Flash between old and new with increasing speed
    const flashTime = evoAnim.timer - PHASE_DURATIONS.announce;
    const progress = flashTime / PHASE_DURATIONS.flash;
    const speed = 4 + progress * 20; // starts slow, gets faster
    const showNew = Math.sin(flashTime * 0.01 * speed) > 0;

    // Intense glow that builds
    const glowSize = 30 + progress * 60;
    const glowColor = showNew ? evoAnim.toMon.color : evoAnim.fromMon.color;
    drawEvoGlow(ctx, centerX, centerY, glowColor, glowSize);

    // Particles
    drawEvoParticles(ctx, centerX, centerY, progress, evoAnim.fromMon.color, evoAnim.toMon.color);

    // Alternate sprites
    const mon = showNew ? evoAnim.toMon : evoAnim.fromMon;
    const scale = 1.0 + progress * 0.2;
    drawEvoSprite(ctx, mon, centerX, centerY, spriteSize * scale, 1.0);

    // White overlay builds near end
    if (progress > 0.8) {
      const whiteAlpha = (progress - 0.8) * 5; // 0 to 1 over last 20%
      ctx.fillStyle = `rgba(255, 255, 255, ${whiteAlpha.toFixed(2)})`;
      ctx.fillRect(0, 0, width, height);
    }

  } else if (evoAnim.phase === 'reveal') {
    // White flash fading to reveal new form
    const revealTime = evoAnim.timer - PHASE_DURATIONS.announce - PHASE_DURATIONS.flash;
    const progress = revealTime / PHASE_DURATIONS.reveal;

    // Fading white overlay
    if (progress < 0.3) {
      const whiteAlpha = 1.0 - (progress / 0.3);
      ctx.fillStyle = `rgba(255, 255, 255, ${whiteAlpha.toFixed(2)})`;
      ctx.fillRect(0, 0, width, height);
    }

    // New form with celebration particles
    drawEvoGlow(ctx, centerX, centerY, evoAnim.toMon.color, 50);
    drawEvoSprite(ctx, evoAnim.toMon, centerX, centerY, spriteSize * 1.2, Math.min(1.0, progress * 2));

    // Sparkle particles
    drawSparkles(ctx, centerX, centerY, progress);

  } else if (evoAnim.phase === 'complete') {
    // Show new form with completion message
    drawEvoGlow(ctx, centerX, centerY, evoAnim.toMon.color, 35);
    drawEvoSprite(ctx, evoAnim.toMon, centerX, centerY, spriteSize * 1.2, 1.0);
    drawSparkles(ctx, centerX, centerY, 1.0);

    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${evoAnim.fromMon.name} evolved into ${evoAnim.toMon.name}!`, centerX, height - 50);
    ctx.textAlign = 'left';
  }
}

function drawEvoSprite(ctx, mon, cx, cy, size, alpha) {
  ctx.globalAlpha = alpha;
  const x = cx - size / 2;
  const y = cy - size / 2;
  if (!mon.sprite || !drawSprite(ctx, mon.sprite, x, y, size, size)) {
    ctx.fillStyle = mon.color;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1.0;
}

function drawEvoGlow(ctx, cx, cy, color, radius) {
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, color + '80');
  gradient.addColorStop(0.5, color + '30');
  gradient.addColorStop(1, color + '00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawEvoParticles(ctx, cx, cy, progress, fromColor, toColor) {
  const count = Math.floor(progress * 20);
  const time = Date.now() * 0.003;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + time;
    const dist = 40 + Math.sin(time + i) * 20 + progress * 30;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const size = 2 + Math.sin(time * 2 + i) * 1.5;
    ctx.fillStyle = i % 2 === 0 ? fromColor : toColor;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSparkles(ctx, cx, cy, progress) {
  const time = Date.now() * 0.004;
  const count = 12;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + time * 0.5;
    const dist = 50 + Math.sin(time + i * 0.7) * 25;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist * 0.7;
    const size = 1.5 + Math.sin(time * 3 + i) * 1;
    const alpha = 0.5 + Math.sin(time * 2 + i) * 0.5;
    ctx.fillStyle = `rgba(255, 255, 200, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function getEvolutionAnimation() {
  return evoAnim;
}

export function clearEvolutionAnimation() {
  evoAnim = null;
}

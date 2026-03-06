// Title screen — retro-futurism pixel art with neon glow, CRT scanlines, synthwave grid
import { wasPressed } from './input.js';
import { STATES } from './state.js';
import { hasSave } from '../sync/save.js';
import { generateMonster } from '../sprites/monsterGen.js';
import { playMenuNav, playMenuConfirm } from '../audio/sound.js';

let menuIndex = 0;
let elapsed = 0;
let floaters = [];
let initialized = false;
let starfieldCanvas = null;
let gridCanvas = null;
let reducedMotion = false;

// Retro-futurism neon palette (from ui-ux-pro-max design system)
const NEON = {
  pink: '#e94560',
  cyan: '#00FFFF',
  blue: '#0080FF',
  purple: '#7C3AED',
  hotPink: '#FF006E',
  bg: '#0F0F23',
  bgDeep: '#08081a',
  text: '#E2E8F0',
  textDim: 'rgba(255,255,255,0.35)',
};

const MON_COLORS = [
  '#e74c3c', '#f39c12', '#2ecc71', '#3498db',
  '#9b59b6', '#1abc9c', '#e67e22', '#ec407a'
];

function initTitle() {
  if (initialized) return;
  initialized = true;
  menuIndex = 0;
  elapsed = 0;

  // Respect reduced motion preference
  reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false;

  // Floating BugMon silhouettes
  floaters = [];
  for (let i = 0; i < 8; i++) {
    floaters.push({
      x: Math.random() * 480,
      y: Math.random() * 160 + 30,
      vx: (Math.random() - 0.5) * (reducedMotion ? 0.05 : 0.25),
      vy: (Math.random() - 0.5) * (reducedMotion ? 0.03 : 0.12),
      id: Math.floor(Math.random() * 20) + 1,
      color: MON_COLORS[i % MON_COLORS.length],
      size: 28 + Math.floor(Math.random() * 20),
      alpha: 0.06 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2
    });
  }

  // Pre-render starfield
  starfieldCanvas = document.createElement('canvas');
  starfieldCanvas.width = 480;
  starfieldCanvas.height = 320;
  const sctx = starfieldCanvas.getContext('2d');
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 480;
    const y = Math.random() * 320;
    const r = Math.random() * 1.2 + 0.3;
    const brightness = Math.random();
    if (brightness > 0.8) {
      sctx.fillStyle = `rgba(0, 255, 255, ${Math.random() * 0.4 + 0.1})`;
    } else {
      sctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.25 + 0.05})`;
    }
    sctx.beginPath();
    sctx.arc(x, y, r, 0, Math.PI * 2);
    sctx.fill();
  }

  // Pre-render perspective grid
  gridCanvas = document.createElement('canvas');
  gridCanvas.width = 480;
  gridCanvas.height = 100;
  const gctx = gridCanvas.getContext('2d');
  gctx.strokeStyle = 'rgba(233, 69, 96, 0.15)';
  gctx.lineWidth = 1;
  // Horizontal lines with perspective
  for (let i = 0; i < 12; i++) {
    const y = i * i * 0.8;
    if (y > 100) break;
    gctx.globalAlpha = 0.3 - (y / 100) * 0.2;
    gctx.beginPath();
    gctx.moveTo(0, y);
    gctx.lineTo(480, y);
    gctx.stroke();
  }
  // Vertical lines converging to center
  gctx.globalAlpha = 1;
  for (let i = -8; i <= 8; i++) {
    const topX = 240 + i * 8;
    const botX = 240 + i * 40;
    gctx.strokeStyle = `rgba(233, 69, 96, ${0.08 + (1 - Math.abs(i) / 8) * 0.08})`;
    gctx.beginPath();
    gctx.moveTo(topX, 0);
    gctx.lineTo(botX, 100);
    gctx.stroke();
  }
}

// Pixel-art block letter renderer for "BUGMON"
const PIXEL_FONT = {
  B: [0b1110, 0b1001, 0b1110, 0b1001, 0b1110],
  U: [0b1001, 0b1001, 0b1001, 0b1001, 0b0110],
  G: [0b0110, 0b1000, 0b1011, 0b1001, 0b0110],
  M: [0b10001, 0b11011, 0b10101, 0b10001, 0b10001],
  O: [0b0110, 0b1001, 0b1001, 0b1001, 0b0110],
  N: [0b1001, 0b1101, 0b1011, 0b1001, 0b1001],
};
const LETTER_WIDTHS = { B: 4, U: 4, G: 4, M: 5, O: 4, N: 4 };

function drawPixelTitle(ctx, x, y, pixelSize, t) {
  const word = 'BUGMON';
  const gap = 2; // gap between letters in pixels
  // Calculate total width
  let totalWidth = 0;
  for (const ch of word) {
    totalWidth += (LETTER_WIDTHS[ch] || 4) + gap;
  }
  totalWidth -= gap;
  const startX = x - (totalWidth * pixelSize) / 2;

  let curX = startX;
  for (let li = 0; li < word.length; li++) {
    const ch = word[li];
    const rows = PIXEL_FONT[ch];
    const w = LETTER_WIDTHS[ch] || 4;

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < w; col++) {
        if (rows[row] & (1 << (w - 1 - col))) {
          const px = curX + col * pixelSize;
          const py = y + row * pixelSize;

          // Neon glow layer (pink/cyan shift)
          if (!reducedMotion) {
            ctx.fillStyle = `rgba(0, 255, 255, ${0.15 + Math.sin(t * 2 + li * 0.5) * 0.05})`;
            ctx.fillRect(px - 2, py - 2, pixelSize + 4, pixelSize + 4);
          }

          // Main pixel
          const hue = (li / word.length) * 30; // subtle warm shift across letters
          ctx.fillStyle = `hsl(${350 + hue}, 80%, ${55 + Math.sin(t * 1.5 + li) * 5}%)`;
          ctx.fillRect(px, py, pixelSize, pixelSize);

          // Highlight top-left
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(px, py, pixelSize, 1);
          ctx.fillRect(px, py, 1, pixelSize);
        }
      }
    }
    curX += (w + gap) * pixelSize;
  }
}

export function updateTitle(dt) {
  initTitle();
  elapsed += dt;

  // Update floaters
  if (!reducedMotion) {
    for (const f of floaters) {
      f.x += f.vx;
      f.y += f.vy + Math.sin(elapsed / 1200 + f.phase) * 0.08;
      if (f.x < -f.size) f.x = 480 + f.size;
      if (f.x > 480 + f.size) f.x = -f.size;
      if (f.y < 10) f.vy = Math.abs(f.vy);
      if (f.y > 200) f.vy = -Math.abs(f.vy);
    }
  }

  // Menu navigation
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
    if (canContinue && menuIndex === 0) {
      resetTitle();
      return 'continue';
    } else {
      resetTitle();
      return 'new';
    }
  }

  return null;
}

export function drawTitle(ctx) {
  const t = elapsed / 1000;

  // Deep black background
  ctx.fillStyle = NEON.bgDeep;
  ctx.fillRect(0, 0, 480, 320);

  // Vignette
  const vignetteGrad = ctx.createRadialGradient(240, 160, 80, 240, 160, 340);
  vignetteGrad.addColorStop(0, 'rgba(15, 15, 35, 0)');
  vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, 480, 320);

  // Starfield
  if (starfieldCanvas) {
    const twinkle = reducedMotion ? 0.7 : 0.55 + Math.sin(t * 0.7) * 0.15;
    ctx.globalAlpha = twinkle;
    ctx.drawImage(starfieldCanvas, 0, 0);
    ctx.globalAlpha = 1;
  }

  // Perspective grid at bottom (synthwave floor)
  if (gridCanvas) {
    const gridShift = reducedMotion ? 0 : (t * 15) % 12;
    ctx.save();
    ctx.translate(0, 220 + gridShift);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(gridCanvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Floating BugMon silhouettes
  for (const f of floaters) {
    ctx.globalAlpha = f.alpha;
    try {
      const sprite = generateMonster(f.id, f.color, f.size);
      ctx.drawImage(sprite, f.x - f.size / 2, f.y - f.size / 2);
    } catch (e) {
      ctx.fillStyle = f.color;
      ctx.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
    }
  }
  ctx.globalAlpha = 1;

  // CRT scanlines (stronger per design system)
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < 320; y += 2) {
    ctx.fillRect(0, y, 480, 1);
  }

  // Horizontal neon line above title
  const lineGlow = reducedMotion ? 0.5 : 0.3 + Math.sin(t * 1.8) * 0.2;
  ctx.strokeStyle = `rgba(0, 255, 255, ${lineGlow * 0.4})`;
  ctx.lineWidth = 1;
  ctx.shadowColor = NEON.cyan;
  ctx.shadowBlur = reducedMotion ? 4 : 8;
  ctx.beginPath();
  ctx.moveTo(140, 48);
  ctx.lineTo(340, 48);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Pixel-art title "BUGMON"
  drawPixelTitle(ctx, 240, 58, 6, reducedMotion ? 0 : t);

  // Chromatic aberration / glitch (occasional)
  if (!reducedMotion) {
    const glitchPhase = Math.sin(t * 7.3) * Math.sin(t * 13.7);
    if (glitchPhase > 0.92) {
      ctx.globalAlpha = 0.2;
      drawPixelTitle(ctx, 242, 57, 6, t);
      ctx.globalAlpha = 0.15;
      ctx.globalCompositeOperation = 'screen';
      drawPixelTitle(ctx, 238, 59, 6, t);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }

  // Neon line below title
  ctx.strokeStyle = `rgba(233, 69, 96, ${lineGlow * 0.5})`;
  ctx.shadowColor = NEON.pink;
  ctx.shadowBlur = reducedMotion ? 4 : 10;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(160, 96);
  ctx.lineTo(320, 96);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Tagline
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '11px monospace';
  const tagPulse = reducedMotion ? 0.5 : 0.4 + Math.sin(t * 2.2) * 0.15;
  ctx.fillStyle = `rgba(0, 255, 255, ${tagPulse})`;
  ctx.shadowColor = NEON.cyan;
  ctx.shadowBlur = reducedMotion ? 2 : 6;
  ctx.fillText('// Gotta Cache \'Em All', 240, 110);
  ctx.shadowBlur = 0;

  // Menu
  const canContinue = hasSave();
  const options = canContinue ? ['CONTINUE', 'NEW GAME'] : ['NEW GAME'];
  const menuY = 155;

  options.forEach((opt, i) => {
    const y = menuY + i * 30;
    const selected = i === menuIndex;
    const bounce = selected && !reducedMotion ? Math.sin(t * 5) * 1.5 : 0;

    if (selected) {
      // Selection box with neon border
      const boxW = 130;
      const boxH = 22;
      const boxX = 240 - boxW / 2;
      const boxY = y - boxH / 2 + bounce;

      // Glow background
      ctx.fillStyle = 'rgba(233, 69, 96, 0.08)';
      ctx.fillRect(boxX, boxY, boxW, boxH);

      // Neon border
      ctx.strokeStyle = `rgba(233, 69, 96, ${0.6 + Math.sin(t * 3) * 0.2})`;
      ctx.lineWidth = 1;
      ctx.shadowColor = NEON.pink;
      ctx.shadowBlur = reducedMotion ? 3 : 8;
      ctx.strokeRect(boxX, boxY, boxW, boxH);
      ctx.shadowBlur = 0;

      // Arrow indicator
      ctx.fillStyle = NEON.pink;
      ctx.font = '10px monospace';
      ctx.fillText('\u25B6', boxX + 10, y + 1 + bounce);
    }

    ctx.font = selected ? 'bold 13px monospace' : '12px monospace';
    ctx.fillStyle = selected ? '#fff' : NEON.textDim;
    if (selected) {
      ctx.shadowColor = NEON.pink;
      ctx.shadowBlur = reducedMotion ? 2 : 6;
    }
    ctx.fillText(opt, 240, y + 1 + bounce);
    ctx.shadowBlur = 0;
  });

  // Blinking prompt
  if (!reducedMotion) {
    const blink = Math.sin(t * 3) > 0;
    if (blink) {
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillText('[ENTER] to select   [\u2190\u2192] to navigate', 240, 230);
    }
  } else {
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText('[ENTER] to select   [\u2190\u2192] to navigate', 240, 230);
  }

  // Bottom decorative elements
  // Left terminal prompt
  ctx.textAlign = 'left';
  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
  ctx.fillText('$ bugmon --version 1.0', 12, 300);

  // Right git status
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(233, 69, 96, 0.15)';
  ctx.fillText('branch: main *', 468, 300);

  // Bottom center credit
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillText('github.com/jpleva91/BugMon', 240, 312);

  // Reset text alignment
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function resetTitle() {
  initialized = false;
  floaters = [];
  starfieldCanvas = null;
  gridCanvas = null;
}

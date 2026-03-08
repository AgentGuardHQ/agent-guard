// BugMon Design System — centralized design tokens
// All rendering code should import from here instead of hardcoding values.
//
// Fonts: Press Start 2P (display/titles), VT323 (body/menus), monospace (fallback)
// Style: Retro-futurism — dark backgrounds, neon accents, pixel art, CRT feel

// ── Canvas dimensions ────────────────────────────────────────────────────
export const CANVAS_W = 480;
export const CANVAS_H = 320;
export const TILE = 32;

// ── Core palette ─────────────────────────────────────────────────────────
export const Color = {
  bgDeep: '#08081a',
  bgPrimary: '#0F0F23',
  bgSurface: '#16213e',
  bgSurfaceHover: '#1e2d4d',

  textPrimary: '#E2E8F0',
  textSecondary: '#94A3B8',
  textDisabled: 'rgba(255,255,255,0.35)',
  textWhite: '#ffffff',

  accentPrimary: '#e94560',
  accentSecondary: '#7C3AED',
  accentCyan: '#00FFFF',

  borderDefault: 'rgba(255,255,255,0.12)',
  borderAccent: '#e94560',

  // Status
  hpHigh: '#2ecc71',
  hpMedium: '#f39c12',
  hpLow: '#e74c3c',
  xpFill: '#7C3AED',
  success: '#2ecc71',
  warning: '#f39c12',
  danger: '#e74c3c',

  // Player fallback
  playerDefault: '#3498db',
  playerAccent: '#2980b9',

  // HP bar background
  hpBarBg: '#333333',

  // Overlay
  hudBg: 'rgba(0,0,0,0.75)',
  overlayDark: 'rgba(0,0,0,0.85)',
} as const;

// ── Type colors (canonical — used everywhere) ────────────────────────────
export const TypeColor: Record<string, string> = {
  frontend: '#3498db',
  backend: '#e74c3c',
  devops: '#2ecc71',
  testing: '#f39c12',
  architecture: '#9b59b6',
  security: '#1abc9c',
  ai: '#00d2ff',
};

export function typeGlow(type: string): string {
  const c = TypeColor[type];
  if (!c) return 'rgba(255,255,255,0.3)';
  const r = parseInt(c.slice(1, 3), 16);
  const g = parseInt(c.slice(3, 5), 16);
  const b = parseInt(c.slice(5, 7), 16);
  return `rgba(${r},${g},${b},0.4)`;
}

// ── Typography ───────────────────────────────────────────────────────────
// Font families — loaded via Google Fonts in index.html
const FONT_DISPLAY = "'Press Start 2P', monospace";
const FONT_BODY = "'VT323', monospace";
const FONT_FALLBACK = 'monospace';

export const Font = {
  // Display — titles, boss names, level-up (use at multiples of 8)
  titleLg: `24px ${FONT_DISPLAY}`,
  titleMd: `16px ${FONT_DISPLAY}`,
  titleSm: `8px ${FONT_DISPLAY}`,

  // Body — menus, battle text, dialog
  bodyLg: `22px ${FONT_BODY}`,
  bodyMd: `18px ${FONT_BODY}`,
  bodySm: `16px ${FONT_BODY}`,

  // UI — HUD, stats, labels
  uiLg: `16px ${FONT_BODY}`,
  uiMd: `14px ${FONT_BODY}`,
  uiSm: `12px ${FONT_BODY}`,

  // Code — error messages, stack traces (terminal feel)
  code: `12px ${FONT_FALLBACK}`,

  // Raw families for custom assembly
  display: FONT_DISPLAY,
  body: FONT_BODY,
  fallback: FONT_FALLBACK,
} as const;

// ── Spacing ──────────────────────────────────────────────────────────────
export const Space = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  hudHeight: 28,
  menuHeight: 80,
  spriteBattle: 64,
  spriteOverworld: 32,
} as const;

// ── Animation timing (ms) ────────────────────────────────────────────────
export const Timing = {
  instant: 50,
  fast: 150,
  medium: 300,
  slow: 600,
  dramatic: 1000,
  messageDuration: 1500,
  hpDrainDuration: 400,
  damageFloatDuration: 800,
  shakeDefault: 200,
  shakeIntensity: 4,
  idleFeedFade: 3000,
} as const;

// ── HP bar helper ────────────────────────────────────────────────────────
export function hpColor(current: number, max: number): string {
  const pct = current / max;
  if (pct > 0.5) return Color.hpHigh;
  if (pct > 0.2) return Color.hpMedium;
  return Color.hpLow;
}

// ── Neon glow helper (for Canvas shadowBlur) ─────────────────────────────
export function applyGlow(
  ctx: CanvasRenderingContext2D,
  color: string,
  blur: number
): void {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

export function clearGlow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

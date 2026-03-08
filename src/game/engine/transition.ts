// Battle transition — flash and fade

import { playTransitionFlash } from '../audio/sound.js';

interface WildMon {
  color?: string;
  [key: string]: unknown;
}

interface TransitionState {
  wildMon: WildMon;
  phase: number;
  timer: number;
  done: boolean;
}

function hexToRgb(hex: string | undefined): { r: number; g: number; b: number } {
  if (!hex || hex[0] !== '#') return { r: 255, g: 255, b: 255 };
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

let transition: TransitionState | null = null;

const TRANSITION_PHASES = [60, 80, 60, 80, 80, 300, 200];
const TRANSITION_TYPES = ['flash', 'pause', 'flash', 'pause', 'flash', 'fade', 'hold'];

export function startTransition(wildMon: WildMon): void {
  transition = { wildMon, phase: 0, timer: 0, done: false };
  playTransitionFlash();
}

export function updateTransition(dt: number): WildMon | null {
  if (!transition || transition.done) return null;
  transition.timer += dt;
  if (transition.timer >= TRANSITION_PHASES[transition.phase]) {
    transition.timer = 0;
    transition.phase++;
    if (
      transition.phase < TRANSITION_PHASES.length &&
      TRANSITION_TYPES[transition.phase] === 'flash'
    )
      playTransitionFlash();
    if (transition.phase >= TRANSITION_PHASES.length) {
      transition.done = true;
      const mon = transition.wildMon;
      transition = null;
      return mon;
    }
  }
  return null;
}

export function drawTransitionOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  mapDrawFn: () => void,
): void {
  if (!transition) return;
  mapDrawFn();
  const type = TRANSITION_TYPES[transition.phase];
  const p = transition.timer / TRANSITION_PHASES[transition.phase];
  if (type === 'flash') {
    const i = p < 0.5 ? p * 2 : (1 - p) * 2;
    const { r, g, b } = hexToRgb(transition.wildMon.color);
    ctx.fillStyle = `rgba(${r},${g},${b},${(i * 0.9).toFixed(2)})`;
    ctx.fillRect(0, 0, w, h);
  } else if (type === 'fade') {
    ctx.fillStyle = `rgba(0,0,0,${p.toFixed(2)})`;
    ctx.fillRect(0, 0, w, h);
  } else if (type === 'hold') {
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(0, 0, w, h);
  }
}

// Keyboard + touch input handler

import { unlock } from '../audio/sound.js';

const keys: Record<string, boolean> = {};
let justPressed: Record<string, boolean> = {};

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    unlock();
    if (!keys[e.key]) {
      justPressed[e.key] = true;
    }
    keys[e.key] = true;
    e.preventDefault();
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    keys[e.key] = false;
  });
}

export function simulatePress(key: string): void {
  unlock();
  if (!keys[key]) {
    justPressed[key] = true;
  }
  keys[key] = true;
}

export function simulateRelease(key: string): void {
  keys[key] = false;
}

export function isDown(key: string): boolean {
  return !!keys[key];
}

export function wasPressed(key: string): boolean {
  return !!justPressed[key];
}

export function clearJustPressed(): void {
  justPressed = {};
}

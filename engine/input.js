// Keyboard + touch input handler
import { unlock } from '../audio/sound.js';

const keys = {};
let justPressed = {};

window.addEventListener('keydown', (e) => {
  unlock();
  if (!keys[e.key]) {
    justPressed[e.key] = true;
  }
  keys[e.key] = true;
  e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Virtual button press (called by touch controls)
export function simulatePress(key) {
  unlock();
  if (!keys[key]) {
    justPressed[key] = true;
  }
  keys[key] = true;
}

export function simulateRelease(key) {
  keys[key] = false;
}

export function isDown(key) {
  return !!keys[key];
}

export function wasPressed(key) {
  return !!justPressed[key];
}

export function clearJustPressed() {
  justPressed = {};
}

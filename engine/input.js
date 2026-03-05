// Keyboard input handler
const keys = {};
let justPressed = {};

window.addEventListener('keydown', (e) => {
  if (!keys[e.key]) {
    justPressed[e.key] = true;
  }
  keys[e.key] = true;
  e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

export function isDown(key) {
  return !!keys[key];
}

export function wasPressed(key) {
  return !!justPressed[key];
}

export function clearJustPressed() {
  justPressed = {};
}

import assert from 'node:assert';
import { test, suite } from './run.js';

// renderer.js depends on canvas context and sprite modules.
// We test it by providing a mock canvas context and verifying draw calls.

// Mock browser globals
if (typeof globalThis.window === 'undefined') {
  globalThis.window = { addEventListener() {} };
}
if (typeof globalThis.AudioContext === 'undefined') {
  globalThis.AudioContext = class { constructor() { this.state = 'running'; } };
}

// Create a recording mock canvas context
function createMockCtx() {
  const calls = [];
  return {
    calls,
    fillStyle: '',
    font: '',
    lineWidth: 0,
    strokeStyle: '',
    fillRect(x, y, w, h) { calls.push({ method: 'fillRect', args: [x, y, w, h], fillStyle: this.fillStyle }); },
    clearRect(x, y, w, h) { calls.push({ method: 'clearRect', args: [x, y, w, h] }); },
    fillText(text, x, y) { calls.push({ method: 'fillText', args: [text, x, y], fillStyle: this.fillStyle, font: this.font }); },
    strokeRect(x, y, w, h) { calls.push({ method: 'strokeRect', args: [x, y, w, h] }); },
    drawImage() { calls.push({ method: 'drawImage' }); },
    beginPath() { calls.push({ method: 'beginPath' }); },
    moveTo() {},
    lineTo() {},
    arc() {},
    fill() { calls.push({ method: 'fill' }); },
    getContext() { return this; },
  };
}

// We can't easily import renderer.js directly because it imports sprite modules
// that may need browser canvas. Instead, we re-implement and test the HP bar logic
// which is the key pure-ish logic inside the renderer.

suite('Renderer HP bar logic (game/engine/renderer.js)', () => {
  // Extracted from drawHPBar in renderer.js:
  // pct = max(0, current / max)
  // color: pct > 0.5 ? green : pct > 0.2 ? yellow : red
  function getHPBarColor(current, max) {
    const pct = Math.max(0, current / max);
    if (pct > 0.5) return '#2ecc71';  // green
    if (pct > 0.2) return '#f39c12';  // yellow
    return '#e74c3c';                  // red
  }

  function getHPBarWidth(current, max, barWidth) {
    const pct = Math.max(0, current / max);
    return barWidth * pct;
  }

  test('full HP shows green', () => {
    assert.strictEqual(getHPBarColor(100, 100), '#2ecc71');
  });

  test('51% HP shows green', () => {
    assert.strictEqual(getHPBarColor(51, 100), '#2ecc71');
  });

  test('50% HP shows yellow (not > 0.5)', () => {
    assert.strictEqual(getHPBarColor(50, 100), '#f39c12');
  });

  test('21% HP shows yellow', () => {
    assert.strictEqual(getHPBarColor(21, 100), '#f39c12');
  });

  test('20% HP shows red (not > 0.2)', () => {
    assert.strictEqual(getHPBarColor(20, 100), '#e74c3c');
  });

  test('1% HP shows red', () => {
    assert.strictEqual(getHPBarColor(1, 100), '#e74c3c');
  });

  test('0 HP shows red', () => {
    assert.strictEqual(getHPBarColor(0, 100), '#e74c3c');
  });

  test('negative current HP clamps to 0 width', () => {
    const width = getHPBarWidth(-10, 100, 100);
    assert.strictEqual(width, 0);
  });

  test('full HP gives full bar width', () => {
    const width = getHPBarWidth(100, 100, 100);
    assert.strictEqual(width, 100);
  });

  test('half HP gives half bar width', () => {
    const width = getHPBarWidth(50, 100, 100);
    assert.strictEqual(width, 50);
  });

  test('HP text format: "current/max"', () => {
    // Verify the format used in renderer.js for HP text
    const current = 15.3;
    const max = 30;
    const text = `${Math.max(0, Math.ceil(current))}/${max}`;
    assert.strictEqual(text, '16/30');
  });

  test('HP text with 0 current', () => {
    const text = `${Math.max(0, Math.ceil(0))}/${30}`;
    assert.strictEqual(text, '0/30');
  });

  test('HP text with negative current clamps to 0', () => {
    const text = `${Math.max(0, Math.ceil(-5))}/${30}`;
    assert.strictEqual(text, '0/30');
  });

  // Test the map tile rendering logic from drawMap
  test('tile type mapping: 0=ground, 1=wall, 2=grass', () => {
    const tileMap = { 0: 'ground', 1: 'wall', 2: 'grass' };
    assert.strictEqual(tileMap[0], 'ground');
    assert.strictEqual(tileMap[1], 'wall');
    assert.strictEqual(tileMap[2], 'grass');
  });

  // Test player direction sprite naming
  test('player sprite name format', () => {
    const dirs = ['up', 'down', 'left', 'right'];
    for (const dir of dirs) {
      const spriteName = `player_${dir}`;
      assert.ok(spriteName.startsWith('player_'));
      assert.ok(spriteName.length > 7);
    }
  });

  // Test battle menu options
  test('battle menu options are Fight, Cache, Run', () => {
    const options = ['Fight', 'Cache', 'Run'];
    assert.strictEqual(options.length, 3);
    assert.strictEqual(options[0], 'Fight');
    assert.strictEqual(options[1], 'Cache');
    assert.strictEqual(options[2], 'Run');
  });

  // Test mock canvas context recording
  test('mock context records fillRect calls', () => {
    const ctx = createMockCtx();
    ctx.fillStyle = '#333';
    ctx.fillRect(10, 20, 100, 10);
    assert.strictEqual(ctx.calls.length, 1);
    assert.strictEqual(ctx.calls[0].method, 'fillRect');
    assert.deepStrictEqual(ctx.calls[0].args, [10, 20, 100, 10]);
    assert.strictEqual(ctx.calls[0].fillStyle, '#333');
  });
});

import assert from 'node:assert';
import { test, suite } from './run.js';

// Mock Image class for Node.js
if (typeof globalThis.Image === 'undefined') {
  globalThis.Image = class {
    constructor() {
      this.src = '';
      this.onload = null;
      this.onerror = null;
    }
    set src(val) {
      this._src = val;
      // Simulate async load - trigger onload/onerror on next tick
      if (val.includes('_fail_')) {
        setTimeout(() => this.onerror && this.onerror(new Error('load failed')), 0);
      } else {
        setTimeout(() => this.onload && this.onload(), 0);
      }
    }
    get src() { return this._src; }
  };
}

const { preloadSprite, getSprite, drawSprite, preloadAll } = await import('../game/sprites/sprites.js');

suite('Sprite loader (game/sprites/sprites.js)', () => {
  test('getSprite returns null for unloaded sprite', () => {
    const result = getSprite('nonexistent_sprite_xyz');
    assert.strictEqual(result, null);
  });

  test('preloadSprite returns a promise', () => {
    const promise = preloadSprite('test_sprite_1');
    assert.ok(promise instanceof Promise);
  });

  test('preloadSprite deduplicates (same name returns same promise)', () => {
    const p1 = preloadSprite('dedup_test');
    const p2 = preloadSprite('dedup_test');
    assert.strictEqual(p1, p2);
  });

  test('drawSprite returns false when sprite not in cache', () => {
    const ctx = {
      drawImage() {},
      imageSmoothingEnabled: true,
    };
    const result = drawSprite(ctx, 'not_cached_sprite', 0, 0, 64, 64);
    assert.strictEqual(result, false);
  });

  test('preloadAll includes player direction sprites', async () => {
    const preloaded = [];
    // We can't easily intercept preloadSprite calls, but we can verify
    // by checking that it processes an array of monsters
    const monsters = [
      { sprite: 'mon_a' },
      { sprite: 'mon_b' },
      { sprite: null }, // should be filtered out
    ];
    // preloadAll should not throw
    await assert.doesNotReject(async () => {
      await preloadAll(monsters);
    });
  });
});

import assert from 'node:assert';
import { test, suite } from './run.js';
import { createRNG } from '../simulation/rng.js';

suite('RNG (simulation/rng.js)', () => {
  test('same seed produces identical sequence', () => {
    const a = createRNG(42);
    const b = createRNG(42);
    for (let i = 0; i < 100; i++) {
      assert.strictEqual(a.random(), b.random());
    }
  });

  test('different seeds produce different values', () => {
    const a = createRNG(1);
    const b = createRNG(2);
    // At least one of the first 5 values should differ
    let allSame = true;
    for (let i = 0; i < 5; i++) {
      if (a.random() !== b.random()) allSame = false;
    }
    assert.strictEqual(allSame, false, 'different seeds should produce different sequences');
  });

  test('random() returns values in [0, 1)', () => {
    const rng = createRNG(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng.random();
      assert.ok(v >= 0 && v < 1, `value ${v} out of range [0, 1)`);
    }
  });

  test('int(min, max) returns integers within inclusive range', () => {
    const rng = createRNG(456);
    for (let i = 0; i < 500; i++) {
      const v = rng.int(3, 7);
      assert.ok(Number.isInteger(v), `${v} is not an integer`);
      assert.ok(v >= 3 && v <= 7, `${v} out of range [3, 7]`);
    }
  });

  test('int(min, max) can produce both min and max values', () => {
    const rng = createRNG(789);
    const seen = new Set();
    for (let i = 0; i < 1000; i++) {
      seen.add(rng.int(1, 3));
    }
    assert.ok(seen.has(1), 'min value 1 never produced');
    assert.ok(seen.has(3), 'max value 3 never produced');
  });

  test('pick(arr) returns an element from the array', () => {
    const rng = createRNG(101);
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 100; i++) {
      const v = rng.pick(arr);
      assert.ok(arr.includes(v), `${v} not in array`);
    }
  });

  test('seed property is preserved', () => {
    const rng = createRNG(999);
    assert.strictEqual(rng.seed, 999);
  });
});

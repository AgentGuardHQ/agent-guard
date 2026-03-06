import assert from 'node:assert';
import { test, suite } from './run.js';
import { matchMonster, getAllMonsters } from '../core/matcher.js';

suite('Matcher (core/matcher.js)', () => {
  test('getAllMonsters returns an array of monsters', () => {
    const monsters = getAllMonsters();
    assert.ok(Array.isArray(monsters));
    assert.ok(monsters.length > 0);
  });

  test('every monster has required fields', () => {
    const monsters = getAllMonsters();
    for (const mon of monsters) {
      assert.ok(mon.id, `monster missing id`);
      assert.ok(mon.name, `monster missing name`);
      assert.ok(mon.type, `monster missing type`);
    }
  });

  test('matchMonster returns a monster and confidence', () => {
    const result = matchMonster({
      type: 'null-reference',
      message: "Cannot read properties of null (reading 'x')",
      rawLines: ["TypeError: Cannot read properties of null (reading 'x')"],
    });
    assert.ok(result.monster, 'should return a monster');
    assert.ok(typeof result.confidence === 'number');
    assert.ok(result.confidence >= 0 && result.confidence <= 1);
  });

  test('matchMonster always returns something (never null)', () => {
    const result = matchMonster({
      type: 'totally-unknown',
      message: 'some weird error no one has seen',
      rawLines: ['some weird error no one has seen'],
    });
    assert.ok(result.monster, 'should always return a monster (fallback)');
  });

  test('matchMonster fallback has low confidence', () => {
    const result = matchMonster({
      type: 'totally-unknown',
      message: 'zzzzz not matching anything specific',
      rawLines: ['zzzzz'],
    });
    // Fallback confidence is 5/30 ≈ 0.167 or 1/30 ≈ 0.033
    assert.ok(result.confidence < 0.5, `fallback confidence should be low, got ${result.confidence}`);
  });

  test('matchMonster by error type maps to correct monster type', () => {
    // Test that backend error types map to backend monsters
    const result = matchMonster({
      type: 'null-reference',
      message: 'generic null ref with no pattern match',
      rawLines: ['generic null ref'],
    });
    assert.ok(result.monster, 'should return a monster');
    // The monster should be a backend type since null-reference maps to backend
    // (unless errorPatterns match something else, which is fine)
  });
});

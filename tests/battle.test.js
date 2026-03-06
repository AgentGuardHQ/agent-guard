import assert from 'node:assert';
import { test, suite } from './run.js';
import { runBattle } from '../simulation/headlessBattle.js';
import { randomStrategy, highestDamageStrategy } from '../simulation/strategies.js';
import { createRNG } from '../simulation/rng.js';

suite('Headless Battle (simulation/headlessBattle.js)', () => {
  const movesData = [
    { id: 'segfault', name: 'Segfault', power: 8, type: 'memory' },
    { id: 'hotfix', name: 'Hotfix', power: 6, type: 'logic' },
    { id: 'deadlockGrip', name: 'Deadlock Grip', power: 10, type: 'logic' },
    { id: 'threadBlock', name: 'Thread Block', power: 7, type: 'runtime' }
  ];

  const typeChart = {
    memory: { runtime: 1.5, logic: 0.5 },
    runtime: { logic: 1.5, memory: 0.5 },
    logic: { memory: 1.5, runtime: 0.5 }
  };

  const monA = { name: 'NullPointer', type: 'memory', hp: 30, attack: 8, defense: 4, speed: 6, moves: ['segfault', 'hotfix'] };
  const monB = { name: 'Deadlock', type: 'logic', hp: 35, attack: 7, defense: 8, speed: 3, moves: ['deadlockGrip', 'threadBlock'] };

  test('battle produces a deterministic result with same seed', () => {
    const r1 = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, createRNG(42));
    const r2 = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, createRNG(42));
    assert.strictEqual(r1.winner, r2.winner);
    assert.strictEqual(r1.turns, r2.turns);
    assert.strictEqual(r1.remainingHP.a, r2.remainingHP.a);
    assert.strictEqual(r1.remainingHP.b, r2.remainingHP.b);
  });

  test('different seeds can produce different outcomes', () => {
    const results = new Set();
    for (let seed = 0; seed < 100; seed++) {
      const r = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, createRNG(seed));
      results.add(r.winner);
    }
    // With enough seeds we should see at least A and B win
    assert.ok(results.size > 1, 'different seeds should produce varied outcomes');
  });

  test('faster monster acts first (speed determines turn order)', () => {
    // monA speed=6, monB speed=3, so monA should always be first attacker
    const rng = createRNG(42);
    const result = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    assert.ok(result.log.length > 0, 'should have turn log entries');
    assert.strictEqual(result.log[0].attacker, 'NullPointer', 'faster monster should attack first');
  });

  test('battle ends when one monster reaches 0 HP', () => {
    const rng = createRNG(42);
    const result = runBattle(monA, monB, movesData, typeChart, highestDamageStrategy, highestDamageStrategy, rng);
    if (result.winner === 'A') {
      assert.strictEqual(result.remainingHP.b, 0, 'loser should have 0 HP');
      assert.ok(result.remainingHP.a > 0, 'winner should have HP remaining');
    } else if (result.winner === 'B') {
      assert.strictEqual(result.remainingHP.a, 0, 'loser should have 0 HP');
      assert.ok(result.remainingHP.b > 0, 'winner should have HP remaining');
    }
  });

  test('winner is correctly identified', () => {
    const rng = createRNG(42);
    const result = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    assert.ok(['A', 'B', 'draw'].includes(result.winner), `winner should be A, B, or draw, got ${result.winner}`);
  });

  test('total damage stats are consistent with HP changes', () => {
    const rng = createRNG(42);
    const result = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    // totalDamage.a = damage dealt BY A to B = monB.hp - remainingHP.b
    assert.strictEqual(result.totalDamage.a, monB.hp - result.remainingHP.b, 'A total damage should match B HP loss');
    assert.strictEqual(result.totalDamage.b, monA.hp - result.remainingHP.a, 'B total damage should match A HP loss');
  });

  test('turn log records correct info', () => {
    const rng = createRNG(42);
    const result = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    for (const entry of result.log) {
      assert.ok(entry.turn > 0, 'turn number should be positive');
      assert.ok(typeof entry.attacker === 'string', 'attacker should be a string');
      assert.ok(typeof entry.move === 'string', 'move should be a string');
      assert.ok(entry.damage >= 1, 'damage should be at least 1');
      assert.ok(entry.targetHP >= 0, 'target HP should be non-negative');
      assert.ok([0.5, 1.0, 1.5].includes(entry.effectiveness), `effectiveness should be 0.5, 1.0, or 1.5, got ${entry.effectiveness}`);
    }
  });

  test('result contains monster names', () => {
    const rng = createRNG(42);
    const result = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    assert.strictEqual(result.monA, 'NullPointer');
    assert.strictEqual(result.monB, 'Deadlock');
  });

  test('high HP monster vs low HP monster - high HP has advantage', () => {
    const bigMon = { ...monA, hp: 100 };
    const smallMon = { ...monB, hp: 10 };
    let bigWins = 0;
    for (let seed = 0; seed < 50; seed++) {
      const r = runBattle(bigMon, smallMon, movesData, typeChart, randomStrategy, randomStrategy, createRNG(seed));
      if (r.winner === 'A') bigWins++;
    }
    assert.ok(bigWins > 25, `high HP monster should win majority, won ${bigWins}/50`);
  });
});

import assert from 'node:assert';
import { test, suite } from './run.js';
import { runBattle } from '../simulation/headlessBattle.js';
import { randomStrategy, highestDamageStrategy } from '../simulation/strategies.js';
import { createRNG } from '../simulation/rng.js';

suite('Headless Battle (simulation/headlessBattle.js)', () => {
  const movesData = [
    { id: 'segfault', name: 'SegFault', power: 10, type: 'backend' },
    { id: 'unhandledexception', name: 'UnhandledException', power: 8, type: 'backend' },
    { id: 'layoutshift', name: 'LayoutShift', power: 7, type: 'frontend' },
    { id: 'zindexwar', name: 'ZIndexWar', power: 9, type: 'frontend' }
  ];

  const typeChart = {
    backend:  { frontend: 0.5, backend: 1.0, devops: 1.5, testing: 1.0, architecture: 1.5, security: 0.5, ai: 1.0 },
    frontend: { frontend: 1.0, backend: 1.5, devops: 1.0, testing: 1.5, architecture: 0.5, security: 1.0, ai: 0.5 },
    devops:   { frontend: 1.0, backend: 0.5, devops: 1.0, testing: 1.5, architecture: 1.0, security: 1.5, ai: 0.5 }
  };

  const monA = { name: 'NullPointer', type: 'backend', hp: 30, attack: 8, defense: 4, speed: 6, moves: ['segfault', 'unhandledexception'] };
  const monB = { name: 'CSSGlitch', type: 'frontend', hp: 35, attack: 7, defense: 8, speed: 3, moves: ['layoutshift', 'zindexwar'] };

  test('battle produces a deterministic result with same seed', () => {
    const r1 = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, createRNG(42));
    const r2 = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, createRNG(42));
    assert.strictEqual(r1.winner, r2.winner);
    assert.strictEqual(r1.turns, r2.turns);
    assert.strictEqual(r1.remainingHP.a, r2.remainingHP.a);
    assert.strictEqual(r1.remainingHP.b, r2.remainingHP.b);
  });

  test('different seeds can produce different turn counts', () => {
    // Use monsters with multiple moves of varied power so randomStrategy picks differently
    const variedMoves = [
      { id: 'm1', name: 'Weak', power: 3, type: 'backend' },
      { id: 'm2', name: 'Strong', power: 14, type: 'backend' }
    ];
    const varA = { name: 'VarA', type: 'backend', hp: 50, attack: 6, defense: 4, speed: 5, moves: ['m1', 'm2'] };
    const varB = { name: 'VarB', type: 'backend', hp: 50, attack: 6, defense: 4, speed: 4, moves: ['m1', 'm2'] };
    const turnCounts = new Set();
    for (let seed = 0; seed < 200; seed++) {
      const r = runBattle(varA, varB, variedMoves, typeChart, randomStrategy, randomStrategy, createRNG(seed));
      turnCounts.add(r.turns);
    }
    assert.ok(turnCounts.size > 1, 'different seeds should produce varied turn counts');
  });

  test('faster monster acts first (speed determines turn order)', () => {
    // monA speed=6, monB speed=3, so monA should always be first attacker
    const rng = createRNG(42);
    const result = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    assert.ok(result.log.length > 0, 'should have turn log entries');
    assert.strictEqual(result.log[0].attacker, monA.name, 'faster monster should attack first');
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
    assert.strictEqual(result.monA, monA.name);
    assert.strictEqual(result.monB, monB.name);
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

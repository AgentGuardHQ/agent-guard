import assert from 'node:assert';
import { test, suite } from './run.js';
import { calcDamageHeadless, runBattle } from '../simulation/headlessBattle.js';
import { createRNG } from '../simulation/rng.js';
import { randomStrategy, highestDamageStrategy } from '../simulation/strategies.js';

suite('Headless Battle (simulation/headlessBattle.js)', () => {
  const typeChart = {
    backend:  { frontend: 0.5, backend: 1.0, devops: 1.5 },
    frontend: { frontend: 1.0, backend: 1.5, devops: 1.0 },
  };

  const movesData = [
    { id: 'segfault', name: 'SegFault', power: 10, type: 'backend' },
    { id: 'layoutshift', name: 'LayoutShift', power: 7, type: 'frontend' },
    { id: 'hotfix', name: 'Hotfix', power: 12, type: 'devops', category: 'heal' },
  ];

  const monA = { id: 1, name: 'NullPointer', type: 'backend', hp: 30, attack: 8, defense: 4, speed: 6, moves: ['segfault'] };
  const monB = { id: 2, name: 'CSSGlitch', type: 'frontend', hp: 35, attack: 7, defense: 8, speed: 3, moves: ['layoutshift'] };

  test('calcDamageHeadless produces positive damage', () => {
    const rng = createRNG(42);
    const result = calcDamageHeadless(monA, movesData[0], monB, typeChart, rng);
    assert.ok(result.damage >= 1, `damage should be >= 1, got ${result.damage}`);
    assert.ok(typeof result.effectiveness === 'number');
  });

  test('calcDamageHeadless applies type effectiveness', () => {
    const rng = createRNG(42);
    // backend vs frontend = 0.5x
    const result = calcDamageHeadless(monA, movesData[0], monB, typeChart, rng);
    assert.strictEqual(result.effectiveness, 0.5);
  });

  test('calcDamageHeadless minimum damage is 1', () => {
    const rng = createRNG(42);
    const tankMon = { ...monB, defense: 200 };
    const result = calcDamageHeadless(monA, movesData[0], tankMon, typeChart, rng);
    assert.strictEqual(result.damage, 1);
  });

  test('calcDamageHeadless handles missing type chart', () => {
    const rng = createRNG(42);
    const result = calcDamageHeadless(monA, movesData[0], monB, null, rng);
    assert.strictEqual(result.effectiveness, 1.0);
    assert.ok(result.damage >= 1);
  });

  test('calcDamageHeadless handles type not in chart', () => {
    const rng = createRNG(42);
    const unknownMon = { ...monB, type: 'unknown' };
    const result = calcDamageHeadless(monA, movesData[0], unknownMon, typeChart, rng);
    assert.strictEqual(result.effectiveness, 1.0);
  });

  test('runBattle determines a winner', () => {
    const rng = createRNG(42);
    const result = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    assert.ok(['A', 'B', 'draw'].includes(result.winner));
    assert.ok(result.turns > 0);
    assert.strictEqual(result.monA, 'NullPointer');
    assert.strictEqual(result.monB, 'CSSGlitch');
  });

  test('runBattle faster monster goes first (ties favor A)', () => {
    const rng = createRNG(42);
    const sameSpdA = { ...monA, speed: 5 };
    const sameSpdB = { ...monB, speed: 5 };
    const result = runBattle(sameSpdA, sameSpdB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    // First log entry should be from monA (speed tie favors A)
    assert.strictEqual(result.log[0].attacker, sameSpdA.name);
  });

  test('runBattle caps at MAX_TURNS (100)', () => {
    // High HP monsters that can't KO each other in 100 turns
    const tankA = { id: 1, name: 'TankA', type: 'backend', hp: 99999, attack: 1, defense: 200, speed: 5, moves: ['segfault'] };
    const tankB = { id: 2, name: 'TankB', type: 'frontend', hp: 99999, attack: 1, defense: 200, speed: 5, moves: ['layoutshift'] };
    const rng = createRNG(42);
    const result = runBattle(tankA, tankB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    assert.strictEqual(result.turns, 100);
    // Both survive, so neither fainted — current impl defaults winner to 'A'
    assert.ok(result.remainingHP.a > 0);
    assert.ok(result.remainingHP.b > 0);
  });

  test('runBattle handles heal moves', () => {
    const healerA = { ...monA, moves: ['hotfix'], currentHP: 10 };
    const rng = createRNG(42);
    const result = runBattle(healerA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    // Healer uses hotfix; look for a heal entry in the log
    const healEntry = result.log.find(e => e.healing !== undefined && e.healing > 0);
    // Heal move should cap at max HP
    if (healEntry) {
      assert.strictEqual(healEntry.damage, 0);
    }
    assert.ok(result.turns > 0);
  });

  test('runBattle handles RandomFailure passive', () => {
    const flakyMon = {
      id: 11, name: 'FlakyTest', type: 'testing', hp: 24, attack: 7, defense: 4, speed: 2,
      moves: ['segfault'], passive: { name: 'RandomFailure', description: '50% chance to ignore damage' }
    };
    // Run multiple battles to see RandomFailure trigger
    let negated = false;
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRNG(seed);
      const result = runBattle(monA, flakyMon, movesData, typeChart, randomStrategy, randomStrategy, rng);
      if (result.log.some(e => e.passive === 'RandomFailure')) {
        negated = true;
        break;
      }
    }
    assert.ok(negated, 'RandomFailure should trigger in at least one of 50 seeds');
  });

  test('runBattle handles NonDeterministic passive (bonus attack)', () => {
    const raceMon = {
      id: 3, name: 'RaceCondition', type: 'backend', hp: 25, attack: 6, defense: 3, speed: 10,
      moves: ['segfault'], passive: { name: 'NonDeterministic', description: 'Randomly acts twice per turn' }
    };
    // Run multiple battles to see NonDeterministic trigger
    let bonusAttack = false;
    for (let seed = 0; seed < 100; seed++) {
      const rng = createRNG(seed);
      const result = runBattle(raceMon, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
      // Count attacks by RaceCondition per turn
      const turnMap = {};
      for (const entry of result.log) {
        if (entry.attacker === 'RaceCondition' && entry.damage > 0) {
          turnMap[entry.turn] = (turnMap[entry.turn] || 0) + 1;
        }
      }
      if (Object.values(turnMap).some(c => c > 1)) {
        bonusAttack = true;
        break;
      }
    }
    assert.ok(bonusAttack, 'NonDeterministic should grant bonus attack in at least one of 100 seeds');
  });

  test('runBattle log entries have correct structure', () => {
    const rng = createRNG(42);
    const result = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    assert.ok(result.log.length > 0);
    const entry = result.log[0];
    assert.ok('turn' in entry);
    assert.ok('attacker' in entry);
    assert.ok('move' in entry);
    assert.ok('damage' in entry);
    assert.ok('effectiveness' in entry);
    assert.ok('targetHP' in entry);
  });

  test('runBattle returns seed for reproducibility', () => {
    const rng = createRNG(12345);
    const result = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    assert.strictEqual(result.seed, 12345);
  });

  test('runBattle remainingHP and totalDamage are consistent', () => {
    const rng = createRNG(42);
    const result = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng);
    // remainingHP.a + totalDamage.b should equal monA.hp (damage dealt to A = monA.hp - remaining)
    assert.strictEqual(result.remainingHP.a + result.totalDamage.b, monA.hp);
    assert.strictEqual(result.remainingHP.b + result.totalDamage.a, monB.hp);
  });

  test('runBattle is deterministic with same seed', () => {
    const rng1 = createRNG(999);
    const rng2 = createRNG(999);
    const result1 = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng1);
    const result2 = runBattle(monA, monB, movesData, typeChart, randomStrategy, randomStrategy, rng2);
    assert.strictEqual(result1.winner, result2.winner);
    assert.strictEqual(result1.turns, result2.turns);
    assert.deepStrictEqual(result1.remainingHP, result2.remainingHP);
  });
});

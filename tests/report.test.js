import assert from 'node:assert';
import { test, suite } from './run.js';
import { generateReport } from '../simulation/report.js';

suite('Report (simulation/report.js)', () => {
  function makeStats(overrides = {}) {
    return {
      name: 'TestMon',
      type: 'backend',
      hp: 30,
      attack: 8,
      defense: 4,
      speed: 6,
      wins: 50,
      losses: 40,
      draws: 10,
      totalBattles: 100,
      totalDamageDealt: 500,
      totalDamageTaken: 400,
      totalTurns: 300,
      matchups: {},
      ...overrides
    };
  }

  test('report contains header and strategy name', () => {
    const result = {
      stats: { TestMon: makeStats() },
      totalBattles: 100,
      strategy: 'Mixed (70/30)'
    };
    const report = generateReport(result);
    assert.ok(report.includes('BugMon Balance Report'), 'should contain title');
    assert.ok(report.includes('Mixed (70/30)'), 'should contain strategy name');
  });

  test('monsters are sorted by win rate descending', () => {
    const result = {
      stats: {
        Loser: makeStats({ name: 'Loser', wins: 20, losses: 80 }),
        Winner: makeStats({ name: 'Winner', wins: 80, losses: 20 }),
        Middle: makeStats({ name: 'Middle', wins: 50, losses: 50 })
      },
      totalBattles: 300,
      strategy: 'test'
    };
    const report = generateReport(result);
    const winnerPos = report.indexOf('Winner');
    const middlePos = report.indexOf('Middle');
    const loserPos = report.indexOf('Loser');
    assert.ok(winnerPos < middlePos, 'Winner should appear before Middle');
    assert.ok(middlePos < loserPos, 'Middle should appear before Loser');
  });

  test('overpowered label applied at >=60% win rate', () => {
    const result = {
      stats: {
        Strong: makeStats({ name: 'Strong', wins: 65, losses: 35 })
      },
      totalBattles: 100,
      strategy: 'test'
    };
    const report = generateReport(result);
    assert.ok(report.includes('overpowered'), 'should flag 65% win rate as overpowered');
  });

  test('underpowered label applied at <=40% win rate', () => {
    const result = {
      stats: {
        Weak: makeStats({ name: 'Weak', wins: 35, losses: 65 })
      },
      totalBattles: 100,
      strategy: 'test'
    };
    const report = generateReport(result);
    assert.ok(report.includes('underpowered'), 'should flag 35% win rate as underpowered');
  });

  test('balanced label applied for win rate between 40-60%', () => {
    const result = {
      stats: {
        Balanced: makeStats({ name: 'Balanced', wins: 50, losses: 50 })
      },
      totalBattles: 100,
      strategy: 'test'
    };
    const report = generateReport(result);
    assert.ok(report.includes('balanced'), 'should flag 50% win rate as balanced');
  });

  test('balance health percentage is correct', () => {
    const result = {
      stats: {
        A: makeStats({ name: 'A', wins: 50, losses: 50 }),
        B: makeStats({ name: 'B', wins: 50, losses: 50 }),
        C: makeStats({ name: 'C', wins: 80, losses: 20 })
      },
      totalBattles: 300,
      strategy: 'test'
    };
    const report = generateReport(result);
    // 2 out of 3 balanced = 67%
    assert.ok(report.includes('67%'), 'should show 67% balance health (2/3 balanced)');
    assert.ok(report.includes('2/3'), 'should show 2/3 monsters balanced');
  });

  test('type performance section is included', () => {
    const result = {
      stats: {
        A: makeStats({ name: 'A', type: 'backend' }),
        B: makeStats({ name: 'B', type: 'frontend' })
      },
      totalBattles: 200,
      strategy: 'test'
    };
    const report = generateReport(result);
    assert.ok(report.includes('TYPE PERFORMANCE'), 'should include type performance section');
    assert.ok(report.includes('backend'), 'should include backend type stats');
    assert.ok(report.includes('frontend'), 'should include frontend type stats');
  });

  test('lopsided matchups section is included', () => {
    const result = {
      stats: {
        A: makeStats({
          name: 'A',
          matchups: { B: { wins: 90, losses: 10, draws: 0 } }
        }),
        B: makeStats({
          name: 'B',
          matchups: { A: { wins: 10, losses: 90, draws: 0 } }
        })
      },
      totalBattles: 200,
      strategy: 'test'
    };
    const report = generateReport(result);
    assert.ok(report.includes('MOST LOPSIDED MATCHUPS'), 'should include matchup section');
    assert.ok(report.includes('beats'), 'should show dominant matchup');
  });
});

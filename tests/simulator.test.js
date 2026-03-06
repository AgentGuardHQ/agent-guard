import assert from 'node:assert';
import { test, suite } from './run.js';
import { simulate } from '../simulation/simulator.js';
import { randomStrategy } from '../simulation/strategies.js';

suite('Simulator (simulation/simulator.js)', () => {
  const movesData = [
    { id: 'move1', name: 'Move1', power: 8, type: 'backend' },
    { id: 'move2', name: 'Move2', power: 10, type: 'frontend' }
  ];

  const typeChart = {
    backend:  { frontend: 0.5, backend: 1.0, devops: 1.5 },
    frontend: { frontend: 1.0, backend: 1.5, devops: 1.0 }
  };

  const monsters = [
    { name: 'Mon1', type: 'backend', hp: 30, attack: 8, defense: 4, speed: 6, moves: ['move1'] },
    { name: 'Mon2', type: 'frontend', hp: 30, attack: 8, defense: 4, speed: 5, moves: ['move2'] },
    { name: 'Mon3', type: 'backend', hp: 25, attack: 10, defense: 3, speed: 7, moves: ['move1', 'move2'] }
  ];

  test('round-robin generates correct number of matchups', () => {
    const result = simulate(monsters, movesData, typeChart, randomStrategy, 300, 42, 'Random');
    // 3 monsters = 3 matchups (3*2/2)
    const stats = Object.values(result.stats);
    // Each monster should have matchups against every other monster
    for (const s of stats) {
      const opponents = Object.keys(s.matchups);
      assert.strictEqual(opponents.length, 2, `${s.name} should have 2 opponents, got ${opponents.length}`);
    }
  });

  test('wins + losses + draws = totalBattles for each monster', () => {
    const result = simulate(monsters, movesData, typeChart, randomStrategy, 300, 42, 'Random');
    for (const s of Object.values(result.stats)) {
      assert.strictEqual(
        s.wins + s.losses + s.draws,
        s.totalBattles,
        `${s.name}: wins(${s.wins}) + losses(${s.losses}) + draws(${s.draws}) != totalBattles(${s.totalBattles})`
      );
    }
  });

  test('matchup tracking is symmetric (A wins vs B = B losses vs A)', () => {
    const result = simulate(monsters, movesData, typeChart, randomStrategy, 300, 42, 'Random');
    const stats = result.stats;
    for (const s of Object.values(stats)) {
      for (const [opp, m] of Object.entries(s.matchups)) {
        const oppMatchup = stats[opp].matchups[s.name];
        assert.ok(oppMatchup, `${opp} should have matchup entry for ${s.name}`);
        assert.strictEqual(m.wins, oppMatchup.losses, `${s.name} wins vs ${opp} should equal ${opp} losses vs ${s.name}`);
        assert.strictEqual(m.losses, oppMatchup.wins, `${s.name} losses vs ${opp} should equal ${opp} wins vs ${s.name}`);
      }
    }
  });

  test('deterministic results with same seed', () => {
    const r1 = simulate(monsters, movesData, typeChart, randomStrategy, 300, 42, 'Random');
    const r2 = simulate(monsters, movesData, typeChart, randomStrategy, 300, 42, 'Random');
    assert.strictEqual(r1.totalBattles, r2.totalBattles);
    for (const name of Object.keys(r1.stats)) {
      assert.strictEqual(r1.stats[name].wins, r2.stats[name].wins, `${name} wins should be deterministic`);
      assert.strictEqual(r1.stats[name].losses, r2.stats[name].losses, `${name} losses should be deterministic`);
    }
  });

  test('totalBattles matches sum of all individual battles', () => {
    const result = simulate(monsters, movesData, typeChart, randomStrategy, 300, 42, 'Random');
    // totalBattles in result is the actual count of battles run
    assert.ok(result.totalBattles > 0, 'should have run some battles');
    // Each battle involves exactly 2 monsters, so sum of all totalBattles / 2 = result.totalBattles
    const sumBattles = Object.values(result.stats).reduce((sum, s) => sum + s.totalBattles, 0);
    assert.strictEqual(sumBattles, result.totalBattles * 2, 'sum of individual totalBattles should be 2x total');
  });

  test('strategy name is preserved in result', () => {
    const result = simulate(monsters, movesData, typeChart, randomStrategy, 100, 42, 'TestStrategy');
    assert.strictEqual(result.strategy, 'TestStrategy');
  });
});

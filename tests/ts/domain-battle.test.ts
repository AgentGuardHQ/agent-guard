import { describe, it, expect } from 'vitest';
import {
  calcDamage,
  calcHealing,
  isHealMove,
  resolveMove,
  createBattleState,
  getTurnOrder,
  executeTurn,
  applyDamage,
  applyHealing,
  isFainted,
  cacheChance,
  attemptCache,
  pickEnemyMove,
} from '../../src/domain/battle.js';
import type { Bugmon, BattleMove, TypeChart } from '../../src/core/types.js';

const makeMon = (overrides: Partial<Bugmon> = {}): Bugmon => ({
  id: 1,
  name: 'TestMon',
  type: 'backend',
  hp: 30,
  currentHP: 30,
  attack: 8,
  defense: 4,
  speed: 6,
  moves: ['move1'],
  passive: null,
  ...overrides,
});

const makeMove = (overrides: Partial<BattleMove> = {}): BattleMove => ({
  id: 'move1',
  name: 'TestMove',
  power: 10,
  type: 'backend',
  ...overrides,
});

describe('domain/battle', () => {
  describe('calcDamage', () => {
    it('produces deterministic damage with injected RNG', () => {
      const rng = { random: () => 0.5 };
      const r1 = calcDamage(makeMon(), makeMove(), makeMon(), null, rng);
      const r2 = calcDamage(makeMon(), makeMove(), makeMon(), null, rng);
      expect(r1.damage).toBe(r2.damage);
    });

    it('minimum damage is 1', () => {
      const result = calcDamage(
        makeMon({ attack: 0 }),
        makeMove({ power: 0 }),
        makeMon({ defense: 100 }),
        null,
        { random: () => 0 },
      );
      expect(result.damage).toBeGreaterThanOrEqual(1);
    });

    it('applies type effectiveness', () => {
      const chart: TypeChart = { backend: { frontend: 1.5 } };
      const result = calcDamage(
        makeMon(),
        makeMove({ type: 'backend' }),
        makeMon({ type: 'frontend' }),
        chart,
        { random: () => 0 },
      );
      expect(result.effectiveness).toBe(1.5);
    });
  });

  describe('heal moves', () => {
    it('identifies heal moves', () => {
      expect(isHealMove(makeMove({ category: 'heal' }))).toBe(true);
      expect(isHealMove(makeMove())).toBe(false);
    });

    it('calculates healing', () => {
      const result = calcHealing(makeMove({ power: 10, category: 'heal' }), makeMon({ currentHP: 25 }));
      expect(result.healing).toBe(5);
    });
  });

  describe('state management', () => {
    it('creates battle state with full HP', () => {
      const state = createBattleState(makeMon(), makeMon({ name: 'Enemy' }));
      expect(state.playerMon.currentHP).toBe(30);
      expect(state.enemy.currentHP).toBe(30);
      expect(state.turn).toBe(0);
      expect(state.outcome).toBeNull();
    });

    it('applies damage without mutation', () => {
      const mon = makeMon();
      const damaged = applyDamage(mon, 10);
      expect(damaged.currentHP).toBe(20);
      expect(mon.currentHP).toBe(30); // original unchanged
    });

    it('clamps HP at 0', () => {
      const damaged = applyDamage(makeMon(), 100);
      expect(damaged.currentHP).toBe(0);
    });

    it('applies healing up to max HP', () => {
      const healed = applyHealing(makeMon({ currentHP: 20 }), 100);
      expect(healed.currentHP).toBe(30);
    });

    it('detects fainted', () => {
      expect(isFainted(makeMon({ currentHP: 0 }))).toBe(true);
      expect(isFainted(makeMon({ currentHP: 1 }))).toBe(false);
    });
  });

  describe('turn order', () => {
    it('faster mon goes first (player wins ties)', () => {
      expect(getTurnOrder(makeMon({ speed: 10 }), makeMon({ speed: 5 }))).toBe('player');
      expect(getTurnOrder(makeMon({ speed: 5 }), makeMon({ speed: 10 }))).toBe('enemy');
      expect(getTurnOrder(makeMon({ speed: 5 }), makeMon({ speed: 5 }))).toBe('player');
    });
  });

  describe('cache mechanics', () => {
    it('cache chance increases as HP drops', () => {
      const fullHP = cacheChance(makeMon({ currentHP: 30, hp: 30 }));
      const halfHP = cacheChance(makeMon({ currentHP: 15, hp: 30 }));
      expect(halfHP).toBeGreaterThan(fullHP);
    });

    it('attemptCache succeeds with low roll', () => {
      expect(attemptCache(makeMon({ currentHP: 1, hp: 30 }), 0)).toBe(true);
      expect(attemptCache(makeMon({ currentHP: 30, hp: 30 }), 1)).toBe(false);
    });
  });

  describe('move selection', () => {
    it('picks enemy move by index', () => {
      const moves = [makeMove({ id: 'a' }), makeMove({ id: 'b' })];
      const enemy = makeMon({ moves: ['a', 'b'] });
      const picked = pickEnemyMove(enemy, moves, 0);
      expect(picked?.id).toBe('a');
    });
  });

  describe('executeTurn', () => {
    it('executes a full turn deterministically', () => {
      const player = makeMon({ speed: 10 });
      const enemy = makeMon({ speed: 5, name: 'Enemy' });
      const state = createBattleState(player, enemy);
      const move = makeMove();
      const rng = { random: () => 0.5 };

      const result = executeTurn(state, move, move, null, rng);
      expect(result.state.turn).toBe(1);
      expect(result.events.length).toBeGreaterThan(0);
    });
  });

  describe('resolveMove', () => {
    it('resolves heal move', () => {
      const result = resolveMove(
        makeMon({ currentHP: 20 }),
        makeMove({ category: 'heal', power: 5 }),
        makeMon(),
        null,
      );
      expect(result.healing).toBe(5);
      expect(result.damage).toBe(0);
    });
  });
});

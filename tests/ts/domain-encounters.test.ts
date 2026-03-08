import { describe, it, expect } from 'vitest';
import {
  shouldEncounter,
  pickWeightedRandom,
  scaleEncounter,
  checkEncounter,
  RARITY_WEIGHTS,
} from '../../src/domain/encounters.js';
import type { Bugmon } from '../../src/core/types.js';

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
  rarity: 'common',
  ...overrides,
});

describe('domain/encounters', () => {
  describe('shouldEncounter', () => {
    it('only triggers on tile type 2', () => {
      expect(shouldEncounter(0, () => 0)).toBe(false);
      expect(shouldEncounter(1, () => 0)).toBe(false);
      expect(shouldEncounter(2, () => 0)).toBe(true);
    });

    it('has 10% encounter rate', () => {
      expect(shouldEncounter(2, () => 0.09)).toBe(true);
      expect(shouldEncounter(2, () => 0.10)).toBe(true);
      expect(shouldEncounter(2, () => 0.11)).toBe(false);
    });
  });

  describe('pickWeightedRandom', () => {
    it('picks from available monsters', () => {
      const monsters = [makeMon({ name: 'A' }), makeMon({ name: 'B' })];
      const picked = pickWeightedRandom(monsters, () => 0);
      expect(['A', 'B']).toContain(picked.name);
    });

    it('rarity weights are defined', () => {
      expect(RARITY_WEIGHTS.common).toBe(10);
      expect(RARITY_WEIGHTS.legendary).toBe(1);
    });
  });

  describe('scaleEncounter', () => {
    it('scales HP with player level', () => {
      const mon = makeMon({ hp: 30 });
      const scaled = scaleEncounter(mon, { playerLevel: 3 });
      expect(scaled.hp).toBeGreaterThan(30);
    });

    it('no scaling at level 1 with 0 encounters', () => {
      const mon = makeMon({ hp: 30 });
      const scaled = scaleEncounter(mon, { playerLevel: 1, encounterCount: 0 });
      expect(scaled.hp).toBe(30);
    });
  });

  describe('checkEncounter', () => {
    it('returns null when no encounter triggers', () => {
      const result = checkEncounter(0, [makeMon()], () => 0);
      expect(result).toBeNull();
    });

    it('returns a monster instance when encounter triggers', () => {
      const result = checkEncounter(2, [makeMon()], () => 0);
      expect(result).not.toBeNull();
      expect(result!.currentHP).toBe(result!.hp);
    });

    it('applies scaling when context provided', () => {
      const result = checkEncounter(2, [makeMon({ hp: 30 })], () => 0, { playerLevel: 5 });
      expect(result).not.toBeNull();
      expect(result!.hp).toBeGreaterThan(30);
    });
  });
});

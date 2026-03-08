import { describe, it, expect } from 'vitest';
import {
  findTrigger,
  checkEvolution,
  checkPartyEvolutions,
  applyEvolution,
  getEvolutionProgress,
} from '../../src/domain/evolution.js';
import type { Bugmon, EvolutionData } from '../../src/core/types.js';

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

const evolvedMon = makeMon({ id: 2, name: 'EvolvedMon', hp: 50 });

const evolutionData: EvolutionData = {
  chains: [
    {
      id: 'test_chain',
      name: 'Test Chain',
      stages: [
        { monsterId: 1, name: 'TestMon' },
        { monsterId: 2, name: 'EvolvedMon' },
      ],
      triggers: [
        { from: 1, to: 2, condition: { event: 'commits', count: 10 } },
      ],
    },
  ],
  events: { commits: { label: 'Commits' } },
};

describe('domain/evolution', () => {
  describe('findTrigger', () => {
    it('finds a trigger for a matching monster ID', () => {
      const result = findTrigger(1, evolutionData);
      expect(result).not.toBeNull();
      expect(result!.trigger.to).toBe(2);
    });

    it('returns null for unknown monster ID', () => {
      expect(findTrigger(99, evolutionData)).toBeNull();
    });

    it('returns null for null evolution data', () => {
      expect(findTrigger(1, null)).toBeNull();
    });
  });

  describe('checkEvolution', () => {
    it('returns null if monster has no evolvesTo', () => {
      expect(checkEvolution(makeMon(), { commits: 20 }, evolutionData, [evolvedMon])).toBeNull();
    });

    it('returns null if condition not met', () => {
      const mon = makeMon({ evolvesTo: 2 });
      expect(checkEvolution(mon, { commits: 5 }, evolutionData, [evolvedMon])).toBeNull();
    });

    it('returns evolution result when condition met', () => {
      const mon = makeMon({ evolvesTo: 2 });
      const result = checkEvolution(mon, { commits: 10 }, evolutionData, [evolvedMon]);
      expect(result).not.toBeNull();
      expect(result!.to.id).toBe(2);
    });
  });

  describe('checkPartyEvolutions', () => {
    it('finds first eligible evolution in party', () => {
      const party = [makeMon({ id: 3 }), makeMon({ evolvesTo: 2 })];
      const result = checkPartyEvolutions(party, { commits: 10 }, evolutionData, [evolvedMon]);
      expect(result).not.toBeNull();
      expect(result!.partyIndex).toBe(1);
    });
  });

  describe('applyEvolution', () => {
    it('preserves HP ratio proportionally', () => {
      const oldMon = makeMon({ hp: 30, currentHP: 15 }); // 50% HP
      const result = applyEvolution(oldMon, evolvedMon);
      expect(result.currentHP).toBe(25); // 50% of 50
    });
  });

  describe('getEvolutionProgress', () => {
    it('returns progress info', () => {
      const mon = makeMon({ evolvesTo: 2 });
      const result = getEvolutionProgress(mon, { commits: 5 }, evolutionData, [evolvedMon]);
      expect(result).not.toBeNull();
      expect(result!.percentage).toBe(50);
      expect(result!.required).toBe(10);
      expect(result!.current).toBe(5);
      expect(result!.evolvesTo).toBe('EvolvedMon');
    });

    it('returns null if monster has no evolvesTo', () => {
      expect(getEvolutionProgress(makeMon(), {}, evolutionData, [])).toBeNull();
    });
  });
});

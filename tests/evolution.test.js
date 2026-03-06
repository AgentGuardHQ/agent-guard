import assert from 'node:assert';
import { test, suite } from './run.js';

// We can't directly test evolution.js because it imports tracker.js which uses localStorage.
// Instead, test the pure logic by reimplementing the core algorithms from the module.
// This tests the evolution data integrity and the logic patterns used.

import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const monsters = JSON.parse(await readFile(new URL('ecosystem/data/monsters.json', root), 'utf-8'));
const evolutions = JSON.parse(await readFile(new URL('ecosystem/data/evolutions.json', root), 'utf-8'));

suite('Evolution Logic (game/evolution/evolution.js)', () => {
  // Reimplement core logic to test without browser dependencies
  function findTrigger(monsterId) {
    for (const chain of evolutions.chains) {
      for (const trigger of chain.triggers) {
        if (trigger.from === monsterId) return { trigger, chain };
      }
    }
    return null;
  }

  function checkEvolution(monster, events) {
    if (!monster.evolvesTo) return null;
    const match = findTrigger(monster.id);
    if (!match) return null;
    const { event, count } = match.trigger.condition;
    if (events[event] >= count) {
      const evolvedForm = monsters.find(m => m.id === match.trigger.to);
      if (evolvedForm) {
        return { from: monster, to: evolvedForm, trigger: match.trigger, chain: match.chain };
      }
    }
    return null;
  }

  function applyEvolution(party, partyIndex, evolvedForm) {
    const oldMon = party[partyIndex];
    const hpRatio = oldMon.currentHP / oldMon.hp;
    const newMon = { ...evolvedForm, currentHP: Math.ceil(evolvedForm.hp * hpRatio) };
    party[partyIndex] = newMon;
    return newMon;
  }

  function getEvolutionProgress(monster, events) {
    if (!monster.evolvesTo) return null;
    const match = findTrigger(monster.id);
    if (!match) return null;
    const { event, count } = match.trigger.condition;
    const current = events[event] || 0;
    return {
      current: Math.min(current, count),
      required: count,
      percentage: Math.min(100, Math.floor((current / count) * 100)),
    };
  }

  test('checkEvolution returns evolution when condition is met', () => {
    const nullPointer = monsters.find(m => m.name === 'NullPointer');
    assert.ok(nullPointer, 'NullPointer should exist');
    // NullPointer evolves with 5 bugs_fixed
    const events = { bugs_fixed: 5 };
    const result = checkEvolution(nullPointer, events);
    assert.ok(result, 'should trigger evolution');
    assert.strictEqual(result.from.name, 'NullPointer');
    assert.ok(result.to, 'should have evolved form');
  });

  test('checkEvolution returns null when condition not met', () => {
    const nullPointer = monsters.find(m => m.name === 'NullPointer');
    const events = { bugs_fixed: 2 }; // needs 5
    const result = checkEvolution(nullPointer, events);
    assert.strictEqual(result, null);
  });

  test('checkEvolution returns null for monster without evolution', () => {
    const noEvoMon = monsters.find(m => !m.evolvesTo);
    if (noEvoMon) {
      const events = { commits: 100, bugs_fixed: 100 };
      const result = checkEvolution(noEvoMon, events);
      assert.strictEqual(result, null);
    }
  });

  test('applyEvolution preserves HP ratio', () => {
    const oldMon = { hp: 30, currentHP: 15, name: 'OldMon' }; // 50% HP
    const evolvedForm = { hp: 50, name: 'NewMon' };
    const party = [oldMon];
    const newMon = applyEvolution(party, 0, evolvedForm);
    assert.strictEqual(newMon.currentHP, 25); // 50% of 50 = 25
    assert.strictEqual(party[0].name, 'NewMon');
  });

  test('applyEvolution with full HP', () => {
    const oldMon = { hp: 30, currentHP: 30, name: 'OldMon' }; // 100% HP
    const evolvedForm = { hp: 50, name: 'NewMon' };
    const party = [oldMon];
    const newMon = applyEvolution(party, 0, evolvedForm);
    assert.strictEqual(newMon.currentHP, 50);
  });

  test('applyEvolution rounds up HP (ceil)', () => {
    const oldMon = { hp: 30, currentHP: 10, name: 'OldMon' }; // 33.3% HP
    const evolvedForm = { hp: 50, name: 'NewMon' };
    const party = [oldMon];
    const newMon = applyEvolution(party, 0, evolvedForm);
    // ceil(50 * (10/30)) = ceil(16.67) = 17
    assert.strictEqual(newMon.currentHP, 17);
  });

  test('getEvolutionProgress returns correct fraction', () => {
    const nullPointer = monsters.find(m => m.name === 'NullPointer');
    const events = { bugs_fixed: 3 }; // needs 5
    const progress = getEvolutionProgress(nullPointer, events);
    assert.ok(progress, 'should return progress');
    assert.strictEqual(progress.current, 3);
    assert.strictEqual(progress.required, 5);
    assert.strictEqual(progress.percentage, 60);
  });

  test('getEvolutionProgress caps at 100%', () => {
    const nullPointer = monsters.find(m => m.name === 'NullPointer');
    const events = { bugs_fixed: 100 }; // way over required
    const progress = getEvolutionProgress(nullPointer, events);
    assert.strictEqual(progress.percentage, 100);
    assert.strictEqual(progress.current, progress.required);
  });

  test('getEvolutionProgress returns null for non-evolving monster', () => {
    const noEvoMon = monsters.find(m => !m.evolvesTo);
    if (noEvoMon) {
      const progress = getEvolutionProgress(noEvoMon, {});
      assert.strictEqual(progress, null);
    }
  });

  test('all evolution chains reference valid monsters', () => {
    const monsterIds = new Set(monsters.map(m => m.id));
    for (const chain of evolutions.chains) {
      for (const stage of chain.stages) {
        assert.ok(monsterIds.has(stage.monsterId),
          `chain "${chain.name}" references monster ID ${stage.monsterId} which does not exist`);
      }
      for (const trigger of chain.triggers) {
        assert.ok(monsterIds.has(trigger.from),
          `chain "${chain.name}" trigger.from ${trigger.from} does not exist`);
        assert.ok(monsterIds.has(trigger.to),
          `chain "${chain.name}" trigger.to ${trigger.to} does not exist`);
      }
    }
  });

  test('all evolution triggers reference valid event types', () => {
    const validEvents = new Set(Object.keys(evolutions.events));
    for (const chain of evolutions.chains) {
      for (const trigger of chain.triggers) {
        assert.ok(validEvents.has(trigger.condition.event),
          `chain "${chain.name}" uses unknown event "${trigger.condition.event}"`);
        assert.ok(trigger.condition.count > 0,
          `chain "${chain.name}" has non-positive count: ${trigger.condition.count}`);
      }
    }
  });

  test('evolved monsters exist and have rarity "evolved"', () => {
    for (const chain of evolutions.chains) {
      for (const trigger of chain.triggers) {
        const evolvedMon = monsters.find(m => m.id === trigger.to);
        assert.ok(evolvedMon, `evolved form ID ${trigger.to} should exist`);
        assert.strictEqual(evolvedMon.rarity, 'evolved',
          `${evolvedMon.name} (ID ${trigger.to}) should have rarity "evolved", got "${evolvedMon.rarity}"`);
      }
    }
  });
});

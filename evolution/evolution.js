// Evolution Engine - checks conditions and triggers BugMon evolutions
// Evolutions are driven by real developer activity instead of XP grinding

import { getEvents } from './tracker.js';

let evolutionData = null;
let monstersData = null;
let pendingEvolution = null;

export function setEvolutionData(data) {
  evolutionData = data;
}

export function setMonstersDataForEvolution(data) {
  monstersData = data;
}

// Check if a specific monster in the party can evolve based on current dev events
export function checkEvolution(monster) {
  if (!evolutionData || !monster.evolvesTo) return null;

  const events = getEvents();

  for (const chain of evolutionData.chains) {
    for (const trigger of chain.triggers) {
      if (trigger.from === monster.id) {
        const { event, count } = trigger.condition;
        if (events[event] >= count) {
          // Find the evolved form data
          const evolvedForm = monstersData.find(m => m.id === trigger.to);
          if (evolvedForm) {
            return {
              from: monster,
              to: evolvedForm,
              trigger: trigger,
              chain: chain
            };
          }
        }
      }
    }
  }

  return null;
}

// Check all monsters in the party for possible evolutions
export function checkPartyEvolutions(party) {
  for (let i = 0; i < party.length; i++) {
    const result = checkEvolution(party[i]);
    if (result) {
      return { ...result, partyIndex: i };
    }
  }
  return null;
}

// Apply the evolution to a party member
export function applyEvolution(party, partyIndex, evolvedForm) {
  const oldMon = party[partyIndex];
  const hpRatio = oldMon.currentHP / oldMon.hp;

  const newMon = {
    ...evolvedForm,
    currentHP: Math.ceil(evolvedForm.hp * hpRatio)
  };

  party[partyIndex] = newMon;
  return newMon;
}

// Get evolution progress for a monster (for UI display)
export function getEvolutionProgress(monster) {
  if (!evolutionData || !monster.evolvesTo) return null;

  const events = getEvents();

  for (const chain of evolutionData.chains) {
    for (const trigger of chain.triggers) {
      if (trigger.from === monster.id) {
        const { event, count } = trigger.condition;
        const current = events[event] || 0;
        const evolvedForm = monstersData ? monstersData.find(m => m.id === trigger.to) : null;
        return {
          chainName: chain.name,
          eventType: event,
          eventLabel: evolutionData.events[event]?.label || event,
          current: Math.min(current, count),
          required: count,
          percentage: Math.min(100, Math.floor((current / count) * 100)),
          description: trigger.description,
          evolvesTo: evolvedForm ? evolvedForm.name : '???'
        };
      }
    }
  }

  return null;
}

// Store a pending evolution to be shown after battle
export function setPendingEvolution(evo) {
  pendingEvolution = evo;
}

export function getPendingEvolution() {
  return pendingEvolution;
}

export function clearPendingEvolution() {
  pendingEvolution = null;
}

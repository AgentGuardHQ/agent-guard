// Pure evolution engine — no localStorage, no DOM
// Takes event counts as input; callers provide storage.

import type {
  Bugmon,
  EvolutionData,
  EvolutionChain,
  EvolutionTrigger,
  EvolutionResult,
  EvolutionProgress,
} from '../core/types.js';

/**
 * Find the evolution trigger for a given monster ID.
 */
export function findTrigger(
  monsterId: number,
  evolutionData: EvolutionData | null,
): { trigger: EvolutionTrigger; chain: EvolutionChain } | null {
  if (!evolutionData) return null;
  for (const chain of evolutionData.chains) {
    for (const trigger of chain.triggers) {
      if (trigger.from === monsterId) return { trigger, chain };
    }
  }
  return null;
}

/**
 * Check if a monster is eligible to evolve.
 */
export function checkEvolution(
  monster: Bugmon,
  events: Record<string, number>,
  evolutionData: EvolutionData | null,
  monstersData: readonly Bugmon[],
): EvolutionResult | null {
  if (!monster.evolvesTo) return null;
  const match = findTrigger(monster.id, evolutionData);
  if (!match) return null;

  const { event, count } = match.trigger.condition;
  if ((events[event] || 0) >= count) {
    const evolvedForm = monstersData.find((m) => m.id === match.trigger.to);
    if (evolvedForm) {
      return { from: monster, to: evolvedForm, trigger: match.trigger, chain: match.chain };
    }
  }
  return null;
}

/**
 * Check all party members for evolution eligibility.
 */
export function checkPartyEvolutions(
  party: readonly Bugmon[],
  events: Record<string, number>,
  evolutionData: EvolutionData | null,
  monstersData: readonly Bugmon[],
): EvolutionResult | null {
  for (let i = 0; i < party.length; i++) {
    const result = checkEvolution(party[i], events, evolutionData, monstersData);
    if (result) return { ...result, partyIndex: i };
  }
  return null;
}

/**
 * Apply evolution to a party member (returns new monster, does not mutate party).
 */
export function applyEvolution(oldMon: Bugmon, evolvedForm: Bugmon): Bugmon {
  const hpRatio = oldMon.currentHP / oldMon.hp;
  return { ...evolvedForm, currentHP: Math.ceil(evolvedForm.hp * hpRatio) };
}

/**
 * Get evolution progress for HUD display.
 */
export function getEvolutionProgress(
  monster: Bugmon,
  events: Record<string, number>,
  evolutionData: EvolutionData | null,
  monstersData: readonly Bugmon[] | null,
): EvolutionProgress | null {
  if (!monster.evolvesTo) return null;
  const match = findTrigger(monster.id, evolutionData);
  if (!match) return null;

  const { event, count } = match.trigger.condition;
  const current = events[event] || 0;
  const evolvedForm = monstersData ? monstersData.find((m) => m.id === match.trigger.to) : null;
  return {
    chainName: match.chain.name,
    eventType: event,
    eventLabel: evolutionData?.events?.[event]?.label || event,
    current: Math.min(current, count),
    required: count,
    percentage: Math.min(100, Math.floor((current / count) * 100)),
    evolvesTo: evolvedForm ? evolvedForm.name : '???',
  };
}

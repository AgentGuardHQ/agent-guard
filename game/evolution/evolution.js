// Browser evolution adapter — delegates to domain/evolution.js
// Maintains module-scoped state (data bindings, tracker) for browser game.

import { getEvents } from './tracker.js';
import {
  checkEvolution as domainCheckEvolution,
  checkPartyEvolutions as domainCheckPartyEvolutions,
  applyEvolution as domainApplyEvolution,
  getEvolutionProgress as domainGetEvolutionProgress,
} from '../../domain/evolution.js';

let evolutionData = null;
let evoMonstersData = null;
let pendingEvolution = null;

export function setEvolutionData(data) {
  evolutionData = data;
}
export function setMonstersDataForEvolution(data) {
  evoMonstersData = data;
}

export function checkEvolution(monster) {
  return domainCheckEvolution(monster, getEvents(), evolutionData, evoMonstersData);
}

export function checkPartyEvolutions(party) {
  return domainCheckPartyEvolutions(party, getEvents(), evolutionData, evoMonstersData);
}

export function applyEvolution(party, partyIndex, evolvedForm) {
  const newMon = domainApplyEvolution(party[partyIndex], evolvedForm);
  party[partyIndex] = newMon;
  return newMon;
}

export function getEvolutionProgress(monster) {
  return domainGetEvolutionProgress(monster, getEvents(), evolutionData, evoMonstersData);
}

export function setPendingEvolution(evo) {
  pendingEvolution = evo;
}
export function getPendingEvolution() {
  return pendingEvolution;
}
export function clearPendingEvolution() {
  pendingEvolution = null;
}

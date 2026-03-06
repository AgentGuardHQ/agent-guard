// Random encounter logic with rarity-weighted spawns
import { playEncounterAlert } from '../audio/sound.js';

let monstersData = [];

const RARITY_WEIGHTS = {
  common: 10,
  uncommon: 5,
  rare: 2,
  legendary: 1
};

export function setMonstersData(data) {
  monstersData = data;
}

export function checkEncounter(tile) {
  // Only trigger in tall grass (tile 2), 10% chance
  if (tile !== 2) return null;
  if (Math.random() > 0.10) return null;

  playEncounterAlert();

  // Weighted random selection based on rarity
  const template = pickWeightedRandom(monstersData);
  return {
    ...template,
    currentHP: template.hp
  };
}

function pickWeightedRandom(monsters) {
  let totalWeight = 0;
  for (const mon of monsters) {
    totalWeight += RARITY_WEIGHTS[mon.rarity] || RARITY_WEIGHTS.common;
  }

  let roll = Math.random() * totalWeight;
  for (const mon of monsters) {
    roll -= RARITY_WEIGHTS[mon.rarity] || RARITY_WEIGHTS.common;
    if (roll <= 0) return mon;
  }

  return monsters[monsters.length - 1];
}

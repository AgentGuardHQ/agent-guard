// Random encounter logic
import { playEncounterAlert } from '../audio/sound.js';

let monstersData = [];

export function setMonstersData(data) {
  monstersData = data;
}

export function checkEncounter(tile) {
  // Only trigger in tall grass (tile 2), 10% chance
  if (tile !== 2) return null;
  if (Math.random() > 0.10) return null;

  playEncounterAlert();

  // Pick a random wild BugMon
  const template = monstersData[Math.floor(Math.random() * monstersData.length)];
  return {
    ...template,
    currentHP: template.hp
  };
}

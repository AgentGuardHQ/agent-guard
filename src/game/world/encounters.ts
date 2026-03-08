// Browser encounter adapter — delegates to domain/encounters.js, adds audio

import { playEncounterAlert } from '../audio/sound.js';
import type { GameMon } from './player.js';

type DomainCheckEncounter = (tile: number, monsters: GameMon[]) => GameMon | null;

let monstersData: GameMon[] = [];
let domainCheckEncounter: DomainCheckEncounter | null = null;

export function setMonstersData(data: GameMon[]): void {
  monstersData = data;
}

export function setCheckEncounterFn(fn: DomainCheckEncounter): void {
  domainCheckEncounter = fn;
}

export function checkEncounter(tile: number): GameMon | null {
  if (!domainCheckEncounter) return null;
  const result = domainCheckEncounter(tile, monstersData);
  if (result) playEncounterAlert();
  return result;
}

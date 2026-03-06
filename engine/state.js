// Game state machine with explicit transitions
import { eventBus, Events } from './events.js';

const STATES = {
  TITLE: 'TITLE',
  EXPLORE: 'EXPLORE',
  BATTLE_TRANSITION: 'BATTLE_TRANSITION',
  BATTLE: 'BATTLE',
  EVOLVING: 'EVOLVING',
  MENU: 'MENU'
};

let currentState = STATES.TITLE;

export function getState() {
  return currentState;
}

export function setState(newState) {
  const prev = currentState;
  currentState = newState;
  eventBus.emit(Events.STATE_CHANGED, { from: prev, to: newState });
}

// Named transition functions for clarity and safety
export function enterBattle() {
  setState(STATES.BATTLE_TRANSITION);
}

export function startBattleState() {
  setState(STATES.BATTLE);
}

export function exitBattle() {
  setState(STATES.EXPLORE);
}

export function enterEvolution() {
  setState(STATES.EVOLVING);
}

export function exitEvolution() {
  setState(STATES.EXPLORE);
}

export function openMenu() {
  setState(STATES.MENU);
}

export function closeMenu() {
  setState(STATES.EXPLORE);
}

export { STATES };

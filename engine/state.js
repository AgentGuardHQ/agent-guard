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

export { STATES };

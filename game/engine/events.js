// Event Bus - decoupled communication between game systems
// Uses canonical EventBus from domain/ (supports off, clear, unsubscribe returns)

import { EventBus } from '../../domain/event-bus.js';

export const Events = {
  BATTLE_STARTED: 'BATTLE_STARTED',
  BUGMON_FAINTED: 'BUGMON_FAINTED',
  CACHE_SUCCESS: 'CACHE_SUCCESS',
  BATTLE_ENDED: 'BATTLE_ENDED',
  STATE_CHANGED: 'STATE_CHANGED',
  PASSIVE_ACTIVATED: 'PASSIVE_ACTIVATED',
};

export const eventBus = new EventBus();

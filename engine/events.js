// Event Bus - decoupled communication between game systems
//
// Usage:
//   import { eventBus } from './events.js';
//   eventBus.on('BUGMON_FAINTED', (data) => { ... });
//   eventBus.emit('BUGMON_FAINTED', { name: 'NullPointer' });

class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    for (const callback of this.listeners[event]) {
      callback(data);
    }
  }

}

export const Events = {
  BATTLE_STARTED: 'BATTLE_STARTED',
  TURN_STARTED: 'TURN_STARTED',
  MOVE_USED: 'MOVE_USED',
  DAMAGE_DEALT: 'DAMAGE_DEALT',
  BUGMON_FAINTED: 'BUGMON_FAINTED',
  CACHE_ATTEMPTED: 'CACHE_ATTEMPTED',
  CACHE_SUCCESS: 'CACHE_SUCCESS',
  CACHE_FAILED: 'CACHE_FAILED',
  BATTLE_ENDED: 'BATTLE_ENDED',
  STATE_CHANGED: 'STATE_CHANGED',
};

export const eventBus = new EventBus();

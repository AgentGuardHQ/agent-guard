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

  clear() {
    this.listeners = {};
  }
}

// Game event constants
export const Events = {
  // Battle events
  BATTLE_STARTED: 'BATTLE_STARTED',
  TURN_STARTED: 'TURN_STARTED',
  MOVE_USED: 'MOVE_USED',
  DAMAGE_DEALT: 'DAMAGE_DEALT',
  BUGMON_FAINTED: 'BUGMON_FAINTED',
  CAPTURE_ATTEMPTED: 'CAPTURE_ATTEMPTED',
  CAPTURE_SUCCESS: 'CAPTURE_SUCCESS',
  CAPTURE_FAILED: 'CAPTURE_FAILED',
  BATTLE_ENDED: 'BATTLE_ENDED',

  // State events
  STATE_CHANGED: 'STATE_CHANGED',

  // World events
  PLAYER_MOVED: 'PLAYER_MOVED',
  ENCOUNTER_TRIGGERED: 'ENCOUNTER_TRIGGERED',
};

export const eventBus = new EventBus();

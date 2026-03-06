// Entity system - lightweight entity model for all game objects
//
// Even without a full ECS, separating entities from behavior
// prevents chaos when adding trainers, NPCs, items, etc.

let nextId = 1;

export function createEntity(type, props = {}) {
  return {
    id: nextId++,
    type,
    ...props,
  };
}

// Create a BugMon entity from monster data
export function createBugMon(data) {
  return createEntity('bugmon', {
    name: data.name,
    monType: data.type,
    hp: data.hp,
    currentHP: data.currentHP ?? data.hp,
    attack: data.attack,
    defense: data.defense,
    speed: data.speed,
    moves: [...data.moves],
    color: data.color,
    sprite: data.sprite,
  });
}

// Create a player entity
export function createPlayer(x, y) {
  return createEntity('player', {
    position: { x, y },
    dir: 'down',
    party: [],
  });
}

// Create an NPC entity (future use)
export function createNPC(name, x, y, props = {}) {
  return createEntity('npc', {
    name,
    position: { x, y },
    ...props,
  });
}

// Create an item entity (future use)
export function createItem(name, props = {}) {
  return createEntity('item', {
    name,
    ...props,
  });
}

// Reset ID counter (useful for tests)
export function resetEntityIds() {
  nextId = 1;
}

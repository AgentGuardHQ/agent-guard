// Battle UI controller — thin adapter over domain/battle.js
// Maps domain battle events to input/audio/state/messages.
// No battle logic here — all computation is delegated to the domain engine.

import {
  createBattleState,
  executeTurn,
  cacheChance,
  attemptCache,
  pickEnemyMove,
  isHealMove,
  resolveMove,
  applyDamage,
  applyHealing,
} from '../../domain/battle.js';
import { MOVE_USED, PASSIVE_ACTIVATED, BUGMON_FAINTED } from '../../domain/events.js';
import { wasPressed } from '../engine/input.js';
import { setState, STATES } from '../engine/state.js';
import { getPlayer } from '../world/player.js';
import { eventBus, Events } from '../engine/events.js';
import {
  playMenuNav,
  playMenuConfirm,
  playMenuCancel,
  playAttack,
  playFaint,
  playCaptureSuccess,
  playCaptureFailure,
  playBattleVictory,
} from '../audio/sound.js';
import { checkPartyEvolutions, applyEvolution } from '../evolution/evolution.js';
import { startEvolutionAnimation } from '../evolution/animation.js';

let battle = null;
let movesData = [];
let typeData = null;
let messageTimer = 0;
const MESSAGE_DURATION = 1500;

export function setMovesData(data) {
  movesData = data;
}
export function setTypeData(data) {
  typeData = data;
}

export function startBattle(wildMon) {
  const player = getPlayer();
  const mon = player.party[0];
  battle = {
    enemy: { ...wildMon },
    playerMon: { ...mon, currentHP: mon.currentHP },
    state: 'menu',
    menuIndex: 0,
    moveIndex: 0,
    message: '',
    nextAction: null,
  };
  eventBus.emit(Events.BATTLE_STARTED, {
    playerMon: battle.playerMon.name,
    enemy: battle.enemy.name,
  });
  return battle;
}

export function getBattle() {
  return battle;
}

export function updateBattle(dt) {
  if (!battle) return;

  if (battle.state === 'message') {
    messageTimer -= dt;
    if (messageTimer <= 0 && battle.nextAction) {
      const action = battle.nextAction;
      battle.nextAction = null;
      action();
    }
    return;
  }

  if (battle.state === 'menu') {
    if (wasPressed('ArrowLeft')) {
      battle.menuIndex = Math.max(0, battle.menuIndex - 1);
      playMenuNav();
    }
    if (wasPressed('ArrowRight')) {
      battle.menuIndex = Math.min(2, battle.menuIndex + 1);
      playMenuNav();
    }

    if (wasPressed('Enter') || wasPressed(' ')) {
      playMenuConfirm();
      if (battle.menuIndex === 0) {
        battle.state = 'fight';
        battle.moveIndex = 0;
      } else if (battle.menuIndex === 1) {
        doAttemptCache();
      } else {
        showMessage('Got away safely!', () => endBattle());
      }
    }
  } else if (battle.state === 'fight') {
    const moveCount = battle.playerMon.moves.length;
    if (wasPressed('ArrowLeft')) {
      battle.moveIndex = Math.max(0, battle.moveIndex - 1);
      playMenuNav();
    }
    if (wasPressed('ArrowRight')) {
      battle.moveIndex = Math.min(moveCount - 1, battle.moveIndex + 1);
      playMenuNav();
    }
    if (wasPressed('Escape')) {
      playMenuCancel();
      battle.state = 'menu';
      return;
    }

    if (wasPressed('Enter') || wasPressed(' ')) {
      playMenuConfirm();
      const moveId = battle.playerMon.moves[battle.moveIndex];
      const move = movesData.find((m) => m.id === moveId);
      if (move) doExecuteTurn(move);
    }
  }
}

/**
 * Execute a full turn using the domain engine, then play back events as messages.
 * Domain logic produces events; this function converts them to a message/sound chain.
 */
function doExecuteTurn(playerMove) {
  const typeChart = typeData ? typeData.effectiveness : null;
  const enemyMove = pickEnemyMove(battle.enemy, movesData, Math.random());

  const domainState = createBattleState(battle.playerMon, battle.enemy);
  const result = executeTurn(domainState, playerMove, enemyMove, typeChart);

  // Update mutable battle state from domain result
  battle.playerMon = { ...battle.playerMon, currentHP: result.state.playerMon.currentHP };
  battle.enemy = { ...battle.enemy, currentHP: result.state.enemy.currentHP };

  // Play back domain events as sequential messages
  playbackEvents(result.events, 0);
}

/**
 * Recursively play back domain events as messages with sounds.
 */
function playbackEvents(events, index) {
  if (index >= events.length) {
    if (battle.enemy.currentHP <= 0) {
      handleFaint(battle.enemy.name, 'enemy', () => endBattle());
    } else if (battle.playerMon.currentHP <= 0) {
      handleFaint(battle.playerMon.name, 'player', () => endBattle());
    } else {
      battle.state = 'menu';
      battle.menuIndex = 0;
    }
    return;
  }

  const event = events[index];
  const next = () => playbackEvents(events, index + 1);

  if (event.type === PASSIVE_ACTIVATED) {
    playAttack();
    showMessage(event.message, next);
  } else if (event.type === MOVE_USED) {
    playAttack();
    const msg = formatMoveMessage(event);
    // Check if next event is a faint — handle inline
    const nextEvent = events[index + 1];
    if (nextEvent && nextEvent.type === BUGMON_FAINTED) {
      showMessage(msg, () => {
        handleFaint(nextEvent.name, nextEvent.side, () => {
          playbackEvents(events, index + 2);
        });
      });
    } else {
      showMessage(msg, next);
    }
  } else if (event.type === BUGMON_FAINTED) {
    handleFaint(event.name, event.side, next);
  } else {
    next();
  }
}

function formatMoveMessage(event) {
  if (event.healing !== undefined && event.healing > 0) {
    return `${event.attacker} used ${event.move}! Restored ${event.healing} HP!`;
  }
  if (event.healing !== undefined && event.healing === 0 && event.damage === 0) {
    return `${event.attacker} used ${event.move}! But HP is already full!`;
  }

  let msg = `${event.attacker} used ${event.move}! ${event.damage} damage!`;
  if (event.critical) msg += ' Critical hit!';
  if (event.effectiveness > 1.0) msg += ' Super effective!';
  else if (event.effectiveness < 1.0) msg += ' Not very effective...';
  return msg;
}

function handleFaint(name, side, callback) {
  playFaint();
  eventBus.emit(Events.BUGMON_FAINTED, { name, side });
  if (side === 'player') {
    showMessage(`${name} fainted!`, () => {
      const player = getPlayer();
      player.party[0].currentHP = player.party[0].hp;
      callback();
    });
  } else {
    showMessage(`Wild ${name} fainted!`, callback);
  }
}

function doAttemptCache() {
  if (attemptCache(battle.enemy, Math.random())) {
    const player = getPlayer();
    const cached = { ...battle.enemy, currentHP: battle.enemy.currentHP };
    player.party.push(cached);
    playCaptureSuccess();
    eventBus.emit(Events.CACHE_SUCCESS, { name: battle.enemy.name });
    showMessage(`Cached ${battle.enemy.name}!`, () => endBattle());
  } else {
    playCaptureFailure();
    showMessage(`${battle.enemy.name} evicted from cache!`, () => {
      doEnemyCounterAttack();
    });
  }
}

/**
 * Enemy gets a free attack after a failed cache attempt.
 * Uses domain engine for damage calculation.
 */
function doEnemyCounterAttack() {
  const typeChart = typeData ? typeData.effectiveness : null;
  const enemyMove = pickEnemyMove(battle.enemy, movesData, Math.random());

  // Create a state where enemy goes first (speed trick)
  const fakeState = createBattleState(
    { ...battle.playerMon, speed: 0 },
    { ...battle.enemy, speed: 999 }
  );
  const playerMove = movesData.find((m) => m.id === battle.playerMon.moves[0]);
  const result = executeTurn(fakeState, playerMove, enemyMove, typeChart);

  // Only apply enemy's damage to player
  battle.playerMon = { ...battle.playerMon, currentHP: result.state.playerMon.currentHP };

  // Filter to enemy-side events only
  const enemyEvents = result.events.filter(
    (e) =>
      e.side === 'enemy' ||
      (e.type === BUGMON_FAINTED && e.side === 'player') ||
      (e.type === PASSIVE_ACTIVATED && e.side === 'enemy')
  );

  if (enemyEvents.length > 0) {
    playbackEvents(enemyEvents, 0);
  } else {
    battle.state = 'menu';
    battle.menuIndex = 0;
  }
}

function showMessage(msg, callback) {
  battle.state = 'message';
  battle.message = msg;
  messageTimer = MESSAGE_DURATION;
  battle.nextAction = callback || null;
}

function endBattle() {
  const player = getPlayer();
  const outcome = battle.enemy.currentHP <= 0 ? 'win' : 'other';
  if (battle.playerMon.currentHP > 0) {
    player.party[0].currentHP = battle.playerMon.currentHP;
  }
  if (battle.enemy.currentHP <= 0) playBattleVictory();
  eventBus.emit(Events.BATTLE_ENDED, { outcome });
  battle = null;

  const evo = checkPartyEvolutions(player.party);
  if (evo) {
    applyEvolution(player.party, evo.partyIndex, evo.to);
    startEvolutionAnimation(evo.from, evo.to);
    setState(STATES.EVOLVING);
  } else {
    setState(STATES.EXPLORE);
  }
}

export { movesData };

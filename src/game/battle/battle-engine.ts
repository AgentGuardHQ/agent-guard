// Battle UI controller — thin adapter over domain/battle.ts
// Maps domain battle events to input/audio/state/messages.
//
// TODO(roadmap): Phase 3 — Governance boss encounters from AgentGuard events

import {
  createBattleState,
  executeTurn,
  attemptCache,
  pickEnemyMove,
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
import {
  spawnDamageNumber,
  spawnFloatingLabel,
  triggerShake,
  triggerSpriteFlash,
  animateHP,
  clearBattleEffects,
} from '../engine/effects.js';
import type { GameMon } from '../world/player.js';
import type { Bugmon, BattleMove } from '../../core/types.js';

interface MoveData {
  id: string;
  name: string;
  power: number;
  type: string;
}

interface TypeData {
  effectiveness?: Record<string, Record<string, number>>;
  [key: string]: unknown;
}

interface BattleUIState {
  enemy: GameMon;
  playerMon: GameMon;
  state: string;
  menuIndex: number;
  moveIndex: number;
  message: string;
  nextAction: (() => void) | null;
}

interface BattleEvent {
  type: string;
  attacker?: string;
  move?: string;
  damage?: number;
  healing?: number;
  critical?: boolean;
  effectiveness?: number;
  name?: string;
  side?: string;
  message?: string;
  [key: string]: unknown;
}

let battle: BattleUIState | null = null;
let movesData: MoveData[] = [];
let typeData: TypeData | null = null;
let messageTimer = 0;
const MESSAGE_DURATION = 1500;

export function setMovesData(data: MoveData[]): void {
  movesData = data;
}

export function setTypeData(data: TypeData): void {
  typeData = data;
}

export function startBattle(wildMon: GameMon): BattleUIState {
  clearBattleEffects();
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

export function getBattle(): BattleUIState | null {
  return battle;
}

export function updateBattle(dt: number): void {
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
    // 2×2 grid navigation
    if (wasPressed('ArrowLeft')) {
      if (battle.moveIndex % 2 === 1) {
        battle.moveIndex--;
        playMenuNav();
      }
    }
    if (wasPressed('ArrowRight')) {
      if (battle.moveIndex % 2 === 0 && battle.moveIndex + 1 < moveCount) {
        battle.moveIndex++;
        playMenuNav();
      }
    }
    if (wasPressed('ArrowUp')) {
      if (battle.moveIndex >= 2) {
        battle.moveIndex -= 2;
        playMenuNav();
      }
    }
    if (wasPressed('ArrowDown')) {
      if (battle.moveIndex + 2 < moveCount) {
        battle.moveIndex += 2;
        playMenuNav();
      }
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

function doExecuteTurn(playerMove: MoveData): void {
  if (!battle) return;
  const typeChart = typeData ? typeData.effectiveness || null : null;
  const enemyMove = pickEnemyMove(
    battle.enemy as unknown as Bugmon,
    movesData as unknown as BattleMove[],
    Math.random()
  ) as MoveData;

  const domainState = createBattleState(
    battle.playerMon as unknown as Bugmon,
    battle.enemy as unknown as Bugmon
  );
  const result = executeTurn(
    domainState,
    playerMove as unknown as BattleMove,
    enemyMove as unknown as BattleMove,
    typeChart
  ) as {
    state: { playerMon: { currentHP: number }; enemy: { currentHP: number } };
    events: BattleEvent[];
  };

  battle.playerMon = { ...battle.playerMon, currentHP: result.state.playerMon.currentHP };
  battle.enemy = { ...battle.enemy, currentHP: result.state.enemy.currentHP };

  playbackEvents(result.events, 0);
}

function playbackEvents(events: BattleEvent[], index: number): void {
  if (!battle) return;
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
    showMessage(event.message || '', next);
  } else if (event.type === MOVE_USED) {
    playAttack();

    // Visual effects for damage/healing
    if (battle && event.damage !== undefined && event.damage > 0) {
      const isEnemyAttacker = event.attacker === battle.enemy.name;
      const target: 'player' | 'enemy' = isEnemyAttacker ? 'player' : 'enemy';
      const targetMon = target === 'player' ? battle.playerMon : battle.enemy;

      // Floating damage number
      const dmgX = target === 'enemy' ? 352 : 112;
      const dmgY = target === 'enemy' ? 50 : 150;
      spawnDamageNumber(event.damage, dmgX, dmgY, {
        critical: event.critical,
        effectiveness: event.effectiveness,
      });

      // Animate HP drain
      const newHP = Math.max(0, targetMon.currentHP - event.damage);
      animateHP(target, targetMon.currentHP, newHP);

      // Sprite flash on hit
      triggerSpriteFlash(target);

      // Screen shake on critical or super effective
      if (event.critical) triggerShake(6, 250);
      else if (event.effectiveness !== undefined && event.effectiveness > 1.0) triggerShake(4, 180);

      // Effectiveness label
      if (event.effectiveness !== undefined && event.effectiveness > 1.0) {
        spawnFloatingLabel('Super effective!', dmgX, dmgY + 18);
      } else if (event.effectiveness !== undefined && event.effectiveness < 1.0) {
        spawnFloatingLabel('Not effective...', dmgX, dmgY + 18, '#94A3B8');
      }
      if (event.critical) {
        spawnFloatingLabel('CRITICAL!', dmgX, dmgY - 14, '#f39c12');
      }
    }

    if (battle && event.healing !== undefined && event.healing > 0) {
      const isEnemyHealer = event.attacker === battle!.enemy.name;
      const target: 'player' | 'enemy' = isEnemyHealer ? 'enemy' : 'player';
      const targetMon = target === 'player' ? battle!.playerMon : battle!.enemy;
      const healX = target === 'enemy' ? 352 : 112;
      const healY = target === 'enemy' ? 50 : 150;
      spawnFloatingLabel(`+${event.healing}`, healX, healY, '#2ecc71');
      animateHP(target, targetMon.currentHP, Math.min(targetMon.hp, targetMon.currentHP + event.healing));
    }

    const msg = formatMoveMessage(event);
    const nextEvent = events[index + 1];
    if (nextEvent && nextEvent.type === BUGMON_FAINTED) {
      showMessage(msg, () => {
        handleFaint(nextEvent.name || '', nextEvent.side || '', () => {
          playbackEvents(events, index + 2);
        });
      });
    } else {
      showMessage(msg, next);
    }
  } else if (event.type === BUGMON_FAINTED) {
    handleFaint(event.name || '', event.side || '', next);
  } else {
    next();
  }
}

function formatMoveMessage(event: BattleEvent): string {
  if (event.healing !== undefined && event.healing > 0) {
    return `${event.attacker} used ${event.move}! Restored ${event.healing} HP!`;
  }
  if (event.healing !== undefined && event.healing === 0 && event.damage === 0) {
    return `${event.attacker} used ${event.move}! But HP is already full!`;
  }

  let msg = `${event.attacker} used ${event.move}! ${event.damage} damage!`;
  if (event.critical) msg += ' Critical hit!';
  if (event.effectiveness !== undefined && event.effectiveness > 1.0) msg += ' Super effective!';
  else if (event.effectiveness !== undefined && event.effectiveness < 1.0)
    msg += ' Not very effective...';
  return msg;
}

function handleFaint(name: string, side: string, callback: () => void): void {
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

function doAttemptCache(): void {
  if (!battle) return;
  if (attemptCache(battle.enemy as unknown as Bugmon, Math.random())) {
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

function doEnemyCounterAttack(): void {
  if (!battle) return;
  const typeChart = typeData ? typeData.effectiveness || null : null;
  const enemyMove = pickEnemyMove(
    battle.enemy as unknown as Bugmon,
    movesData as unknown as BattleMove[],
    Math.random()
  ) as MoveData;

  const fakeState = createBattleState(
    { ...battle.playerMon, speed: 0 } as unknown as Bugmon,
    { ...battle.enemy, speed: 999 } as unknown as Bugmon
  );
  const playerMove = movesData.find((m) => m.id === battle!.playerMon.moves[0]);
  if (!playerMove) return;
  const result = executeTurn(
    fakeState,
    playerMove as unknown as BattleMove,
    enemyMove as unknown as BattleMove,
    typeChart
  ) as {
    state: { playerMon: { currentHP: number } };
    events: BattleEvent[];
  };

  battle.playerMon = { ...battle.playerMon, currentHP: result.state.playerMon.currentHP };

  const enemyEvents = result.events.filter(
    (e) =>
      e.side === 'enemy' ||
      (e.type === BUGMON_FAINTED && e.side === 'player') ||
      (e.type === PASSIVE_ACTIVATED && e.side === 'enemy')
  );

  if (enemyEvents.length > 0) {
    playbackEvents(enemyEvents, 0);
  } else if (battle) {
    battle.state = 'menu';
    battle.menuIndex = 0;
  }
}

function showMessage(msg: string, callback?: () => void): void {
  if (!battle) return;
  battle.state = 'message';
  battle.message = msg;
  messageTimer = MESSAGE_DURATION;
  battle.nextAction = callback || null;
}

function endBattle(): void {
  if (!battle) return;
  clearBattleEffects();
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

// BugMon — Entry point and game loop (TypeScript)

import { initRenderer, drawMap, drawPlayer, drawBattle, clear } from './engine/game-renderer.js';
import { clearJustPressed, simulatePress, simulateRelease } from './engine/input.js';
import { getState, setState, STATES } from './engine/state.js';
import { getMap } from './world/map.js';
import { getPlayer, updatePlayer } from './world/player.js';
import { checkEncounter } from './world/encounters.js';
import { startBattle, getBattle, updateBattle, movesData } from './battle/battle-engine.js';
import { startTransition, updateTransition, drawTransitionOverlay } from './engine/transition.js';
import { clearPendingEvolution, getEvolutionProgress } from './evolution/evolution.js';
import {
  updateEvolutionAnimation,
  drawEvolutionAnimation,
  clearEvolutionAnimation,
} from './evolution/animation.js';
import { saveGame, loadGame, applySave, recordBrowserCache } from './sync/save.js';
import { eventBus, Events } from './engine/events.js';
import { updateTitle, drawTitle } from './engine/title.js';
import { unlock, toggleMute } from './audio/sound.js';
import { loadGameData } from './data-loader.js';
import type { LoadedGameData } from './data-loader.js';
import type { GameMon } from './world/player.js';

// Re-export for inline script in index.html
export { simulatePress, simulateRelease, unlock, toggleMute };

interface MonsterData extends GameMon {
  sprite?: string;
}

interface TypesData {
  effectiveness?: Record<string, Record<string, number>>;
  typeColors?: Record<string, string>;
  [key: string]: unknown;
}

let lastTime = 0;
let saveTimer = 0;
const AUTO_SAVE_INTERVAL = 30000;

let MONSTERS: MonsterData[] = [];
let TYPES: TypesData = {};

export async function init(canvas: HTMLCanvasElement): Promise<void> {
  initRenderer(canvas);

  const data: LoadedGameData = await loadGameData();
  MONSTERS = data.monsters as MonsterData[];
  TYPES = data.types as TypesData;

  const player = getPlayer();
  const savedState = loadGame();
  if (savedState) {
    applySave(player, savedState);
  } else {
    const starter = { ...MONSTERS[0], currentHP: MONSTERS[0].hp } as GameMon;
    player.party.push(starter);
  }

  eventBus.on(Events.BATTLE_ENDED, () => {
    autoSave();
  });
  eventBus.on(Events.CACHE_SUCCESS, (data) => {
    const mon = MONSTERS.find((m) => m.name === data.name);
    if (mon) recordBrowserCache(mon);
  });

  requestAnimationFrame(loop);
}

function autoSave(): void {
  saveGame(getPlayer());
}

function loop(timestamp: number): void {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  update(dt);
  render();
  clearJustPressed();

  requestAnimationFrame(loop);
}

function update(dt: number): void {
  const state = getState();

  saveTimer += dt;
  if (saveTimer >= AUTO_SAVE_INTERVAL && state === STATES.EXPLORE) {
    autoSave();
    saveTimer = 0;
  }

  if (state === STATES.TITLE) {
    const result = updateTitle(dt);
    if (result === 'continue') {
      setState(STATES.EXPLORE);
    } else if (result === 'new') {
      const player = getPlayer();
      player.party = [];
      const starter = { ...MONSTERS[0], currentHP: MONSTERS[0].hp } as GameMon;
      player.party.push(starter);
      player.x = 7;
      player.y = 5;
      setState(STATES.EXPLORE);
    }
  } else if (state === STATES.EXPLORE) {
    const tile = updatePlayer(dt);
    if (tile !== null) {
      const wildMon = checkEncounter(tile);
      if (wildMon) {
        setState(STATES.BATTLE_TRANSITION);
        startTransition(wildMon);
      }
    }
  } else if (state === STATES.BATTLE_TRANSITION) {
    const wildMon = updateTransition(dt);
    if (wildMon) {
      setState(STATES.BATTLE);
      startBattle(wildMon as GameMon);
    }
  } else if (state === STATES.BATTLE) {
    updateBattle(dt);
  } else if (state === STATES.EVOLVING) {
    const done = updateEvolutionAnimation(dt);
    if (done) {
      clearEvolutionAnimation();
      clearPendingEvolution();
      setState(STATES.EXPLORE);
    }
  }
}

function render(): void {
  clear();
  const state = getState();

  if (state === STATES.TITLE) {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    drawTitle(ctx);
    return;
  } else if (state === STATES.EXPLORE) {
    drawMap(getMap());
    drawPlayer(getPlayer());

    // HUD
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    const player = getPlayer();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 480, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    const mon = player.party[0];
    const evoProgress = getEvolutionProgress(mon);
    let hudText = `${mon.name} HP:${Math.ceil(mon.currentHP)}/${mon.hp} Party:${player.party.length}`;
    if (evoProgress) {
      hudText += ` | ${evoProgress.eventLabel}:${evoProgress.current}/${evoProgress.required}`;
    }
    ctx.fillText(hudText, 5, 14);
  } else if (state === STATES.BATTLE_TRANSITION) {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    drawTransitionOverlay(ctx, 480, 320, () => {
      drawMap(getMap());
      drawPlayer(getPlayer());
    });
  } else if (state === STATES.BATTLE) {
    const battle = getBattle();
    if (battle) {
      drawBattle(battle, movesData, TYPES.typeColors);
    }
  } else if (state === STATES.EVOLVING) {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d')!;
    drawEvolutionAnimation(ctx, 480, 320);
  }
}

// Auto-initialize when loaded in browser (mirrors JS game/game.js behavior)
if (typeof document !== 'undefined') {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (canvas) {
    init(canvas).catch((err: unknown) => console.error('BugMon failed to start:', err));
  }
}

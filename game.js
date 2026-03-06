// BugMon - Entry point and game loop
import { initRenderer, drawMap, drawPlayer, drawBattle, clear } from './engine/renderer.js';
import { clearJustPressed } from './engine/input.js';
import { getState, setState, STATES } from './engine/state.js';
import { loadMap, getMap, getTile } from './world/map.js';
import { getPlayer, updatePlayer } from './world/player.js';
import { setMonstersData, checkEncounter } from './world/encounters.js';
import { setMovesData, setTypeData, startBattle, getBattle, updateBattle, movesData } from './battle/battleEngine.js';
import { preloadAll } from './sprites/sprites.js';
import { initTileTextures } from './sprites/tiles.js';
import { startTransition, updateTransition, getTransition, drawTransitionOverlay } from './engine/transition.js';
import { initTracker, logEvent, getEvents } from './evolution/tracker.js';
import { setEvolutionData, setMonstersDataForEvolution, checkPartyEvolutions, applyEvolution, setPendingEvolution, getPendingEvolution, clearPendingEvolution, getEvolutionProgress } from './evolution/evolution.js';
import { startEvolutionAnimation, updateEvolutionAnimation, drawEvolutionAnimation, clearEvolutionAnimation } from './evolution/animation.js';
import { playDevEvent } from './audio/sound.js';

let lastTime = 0;
let typeColors = null;
let allMonsters = null;

async function init() {
  const canvas = document.getElementById('game');
  initRenderer(canvas);

  // Load data
  const [monstersRes, movesRes, typesRes, evolutionsRes] = await Promise.all([
    fetch('data/monsters.json'),
    fetch('data/moves.json'),
    fetch('data/types.json'),
    fetch('data/evolutions.json')
  ]);
  const monsters = await monstersRes.json();
  const moves = await movesRes.json();
  const types = await typesRes.json();
  const evolutions = await evolutionsRes.json();

  allMonsters = monsters;
  setMonstersData(monsters);
  setMovesData(moves);
  setTypeData(types);
  setEvolutionData(evolutions);
  setMonstersDataForEvolution(monsters);
  typeColors = types.typeColors;

  // Initialize dev activity tracker
  initTracker();

  // Try to import events from git hook file
  const { importFromFile } = await import('./evolution/tracker.js');
  await importFromFile();

  // Preload sprite images (gracefully falls back if PNGs don't exist yet)
  await preloadAll(monsters);

  await loadMap();
  initTileTextures();

  // Give player a starter BugMon
  const player = getPlayer();
  const starter = { ...monsters[0], currentHP: monsters[0].hp };
  player.party.push(starter);

  // Expose dev event logging to the console and to the page
  window.bugmon = {
    log: (eventType) => {
      const result = logEvent(eventType);
      if (result) {
        playDevEvent();
        console.log(`[BugMon] Logged: ${eventType}`);
        checkForEvolutions();
      }
      return result;
    },
    events: getEvents,
    progress: () => {
      const player = getPlayer();
      return player.party.map(mon => ({
        name: mon.name,
        evolution: getEvolutionProgress(mon)
      }));
    }
  };

  // Start game loop
  requestAnimationFrame(loop);
}

function checkForEvolutions() {
  const player = getPlayer();
  const state = getState();
  if (state !== STATES.EXPLORE) return;

  const evo = checkPartyEvolutions(player.party);
  if (evo) {
    setPendingEvolution(evo);
    const evolved = applyEvolution(player.party, evo.partyIndex, evo.to);
    startEvolutionAnimation(evo.from, evo.to);
    setState(STATES.EVOLVING);
  }
}

function loop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  update(dt);
  render();
  clearJustPressed();

  requestAnimationFrame(loop);
}

function update(dt) {
  const state = getState();

  if (state === STATES.EXPLORE) {
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
      startBattle(wildMon);
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

function render() {
  clear();
  const state = getState();

  const ctx = document.getElementById('game').getContext('2d');

  if (state === STATES.EXPLORE) {
    drawMap(getMap());
    drawPlayer(getPlayer());

    // HUD - show party info
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
    drawTransitionOverlay(ctx, 480, 320, () => {
      drawMap(getMap());
      drawPlayer(getPlayer());
    });
  } else if (state === STATES.BATTLE) {
    const battle = getBattle();
    if (battle) {
      drawBattle(battle, movesData, typeColors);
    }
  } else if (state === STATES.EVOLVING) {
    drawEvolutionAnimation(ctx, 480, 320);
  }
}

init().catch(err => console.error('BugMon failed to start:', err));

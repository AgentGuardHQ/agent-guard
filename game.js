// BugMon - Entry point and game loop
import { initRenderer, drawMap, drawPlayer, drawBattle, clear } from './engine/renderer.js';
import { clearJustPressed } from './engine/input.js';
import { getState, setState, STATES } from './engine/state.js';
import { loadMap, getMap, getTile } from './world/map.js';
import { getPlayer, updatePlayer } from './world/player.js';
import { setMonstersData, checkEncounter } from './world/encounters.js';
import { setMovesData, startBattle, getBattle, updateBattle, movesData } from './battle/battleEngine.js';

let lastTime = 0;

async function init() {
  const canvas = document.getElementById('game');
  initRenderer(canvas);

  // Load data
  const [monstersRes, movesRes] = await Promise.all([
    fetch('data/monsters.json'),
    fetch('data/moves.json')
  ]);
  const monsters = await monstersRes.json();
  const moves = await movesRes.json();

  setMonstersData(monsters);
  setMovesData(moves);

  await loadMap();

  // Give player a starter BugMon
  const player = getPlayer();
  const starter = { ...monsters[0], currentHP: monsters[0].hp };
  player.party.push(starter);

  // Start game loop
  requestAnimationFrame(loop);
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
        setState(STATES.BATTLE);
        startBattle(wildMon);
      }
    }
  } else if (state === STATES.BATTLE) {
    updateBattle(dt);
  }
}

function render() {
  clear();
  const state = getState();

  if (state === STATES.EXPLORE) {
    drawMap(getMap());
    drawPlayer(getPlayer());

    // HUD - show party info
    const player = getPlayer();
    const ctx = document.getElementById('game').getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 200, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    const mon = player.party[0];
    ctx.fillText(`${mon.name} HP:${Math.ceil(mon.currentHP)}/${mon.hp} Party:${player.party.length}`, 5, 14);
  } else if (state === STATES.BATTLE) {
    const battle = getBattle();
    if (battle) {
      drawBattle(battle, movesData);
    }
  }
}

init().catch(err => console.error('BugMon failed to start:', err));

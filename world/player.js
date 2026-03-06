// Player state and movement
import { wasPressed } from '../engine/input.js';
import { isWalkable, getTile } from './map.js';
import { playFootstep } from '../audio/sound.js';

const player = {
  x: 1,
  y: 1,
  dir: 'down',
  party: [],
  moving: false,
  moveTimer: 0
};

const MOVE_COOLDOWN = 150; // ms between moves

export function getPlayer() {
  return player;
}

export function updatePlayer(dt) {
  player.moveTimer -= dt;
  if (player.moveTimer > 0) return null;

  let nx = player.x;
  let ny = player.y;

  if (wasPressed('ArrowUp')) { ny--; player.dir = 'up'; }
  else if (wasPressed('ArrowDown')) { ny++; player.dir = 'down'; }
  else if (wasPressed('ArrowLeft')) { nx--; player.dir = 'left'; }
  else if (wasPressed('ArrowRight')) { nx++; player.dir = 'right'; }

  if ((nx !== player.x || ny !== player.y) && isWalkable(nx, ny)) {
    player.x = nx;
    player.y = ny;
    player.moveTimer = MOVE_COOLDOWN;
    playFootstep();
    return getTile(nx, ny);
  }

  return null;
}

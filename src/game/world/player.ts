// Player state and movement

import { wasPressed } from '../engine/input.js';
import { isWalkable, getTile } from './map.js';
import { playFootstep } from '../audio/sound.js';

export interface GamePlayer {
  x: number;
  y: number;
  dir: string;
  party: GameMon[];
  moving: boolean;
  moveTimer: number;
}

export interface GameMon {
  id: number;
  name: string;
  type: string;
  hp: number;
  currentHP: number;
  attack: number;
  defense: number;
  speed: number;
  moves: string[];
  color?: string;
  sprite?: string;
  rarity?: string;
  evolution?: unknown;
  evolvesTo?: number;
  passive?: string | null;
  [key: string]: unknown;
}

const MOVE_COOLDOWN = 150;

const player: GamePlayer = {
  x: 1,
  y: 1,
  dir: 'down',
  party: [],
  moving: false,
  moveTimer: 0,
};

export function getPlayer(): GamePlayer {
  return player;
}

export function updatePlayer(dt: number): number | null {
  player.moveTimer -= dt;
  if (player.moveTimer > 0) return null;

  let nx = player.x;
  let ny = player.y;

  if (wasPressed('ArrowUp')) {
    ny--;
    player.dir = 'up';
  } else if (wasPressed('ArrowDown')) {
    ny++;
    player.dir = 'down';
  } else if (wasPressed('ArrowLeft')) {
    nx--;
    player.dir = 'left';
  } else if (wasPressed('ArrowRight')) {
    nx++;
    player.dir = 'right';
  }

  if ((nx !== player.x || ny !== player.y) && isWalkable(nx, ny)) {
    player.x = nx;
    player.y = ny;
    player.moveTimer = MOVE_COOLDOWN;
    playFootstep();
    return getTile(nx, ny);
  }

  return null;
}

// Interactive battle/cache system for the CLI
// When a bug is encountered, the player can battle it and try to cache it.

import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadBugDex, saveBugDex } from '../bugdex/bugdex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load game data
let movesData = null;
let typeData = null;

function loadGameData() {
  if (movesData) return;
  const dataDir = join(__dirname, '..', '..', 'data');
  movesData = JSON.parse(readFileSync(join(dataDir, 'moves.json'), 'utf8'));
  typeData = JSON.parse(readFileSync(join(dataDir, 'types.json'), 'utf8'));
}

/**
 * Run an interactive battle/cache sequence in the terminal.
 * The player uses their lead BugMon (or a starter) to fight the wild one.
 * @param {object} wildMonster - The wild BugMon that appeared
 * @param {{message: string, file?: string, line?: number}} errorInfo - Error context
 * @returns {Promise<{cached: boolean, fled: boolean, playerFainted: boolean}>}
 */
export async function interactiveCache(wildMonster, errorInfo) {
  loadGameData();

  const party = getParty();
  const playerMon = { ...party[0], currentHP: party[0].currentHP ?? party[0].hp };
  const enemy = { ...wildMonster, currentHP: wildMonster.hp };

  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const ask = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  const ESC = '\x1b[';
  const RESET = `${ESC}0m`;
  const BOLD = `${ESC}1m`;
  const DIM = `${ESC}2m`;
  const FG = {
    red: `${ESC}31m`, green: `${ESC}32m`, yellow: `${ESC}33m`,
    blue: `${ESC}34m`, cyan: `${ESC}36m`, white: `${ESC}37m`, gray: `${ESC}90m`,
  };
  const c = (text, fg) => `${FG[fg] || ''}${text}${RESET}`;
  const b = (text) => `${BOLD}${text}${RESET}`;

  const hpBar = (current, max) => {
    const ratio = max > 0 ? current / max : 0;
    const width = 12;
    const filled = Math.round(ratio * width);
    const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, width - filled));
    const color = ratio > 0.5 ? 'green' : ratio > 0.25 ? 'yellow' : 'red';
    return c(bar, color) + ` ${current}/${max}`;
  };

  const playerMoves = playerMon.moves
    .map(id => movesData.find(m => m.id === id))
    .filter(Boolean);
  const enemyMoves = enemy.moves
    .map(id => movesData.find(m => m.id === id))
    .filter(Boolean);

  const effectiveness = typeData.effectiveness;

  let result = { cached: false, fled: false, playerFainted: false };

  process.stderr.write('\n');
  process.stderr.write(c('  ╔══════════════════════════════════════════════╗\n', 'yellow'));
  process.stderr.write(c('  ║', 'yellow') + b(`  BATTLE! ${playerMon.name} vs Wild ${enemy.name}`) + c('         ║\n'.slice(0, 1), 'yellow') + '\n');
  process.stderr.write(c('  ╚══════════════════════════════════════════════╝\n', 'yellow'));

  if (errorInfo?.message) {
    process.stderr.write(`  ${DIM}Bug: ${errorInfo.message.slice(0, 60)}${RESET}\n`);
    if (errorInfo.file) {
      process.stderr.write(`  ${c('>>', 'cyan')} ${c(errorInfo.file + (errorInfo.line ? ':' + errorInfo.line : ''), 'cyan')}\n`);
    }
  }

  // Battle loop
  while (true) {
    process.stderr.write('\n');
    process.stderr.write(`  ${b(enemy.name)} ${c(`[${enemy.type}]`, 'gray')}  ${hpBar(enemy.currentHP, enemy.hp)}\n`);
    process.stderr.write(`  ${b(playerMon.name)} ${c(`[${playerMon.type}]`, 'gray')}  ${hpBar(playerMon.currentHP, playerMon.hp)}\n`);
    process.stderr.write('\n');

    // Show action menu
    process.stderr.write(`  ${b('What will you do?')}\n`);
    process.stderr.write(`  ${c('[1]', 'yellow')} Fight   ${c('[2]', 'yellow')} Cache   ${c('[3]', 'yellow')} Run\n`);
    process.stderr.write('\n');

    const action = await ask('  > ');
    const choice = action.trim();

    if (choice === '3' || choice.toLowerCase() === 'run') {
      // Run away
      process.stderr.write(`\n  ${DIM}Got away safely!${RESET}\n\n`);
      result.fled = true;
      break;
    }

    if (choice === '2' || choice.toLowerCase() === 'cache') {
      // Attempt cache
      const hpRatio = enemy.currentHP / enemy.hp;
      const cacheRate = (1 - hpRatio) * 0.5 + 0.1;
      const roll = Math.random();

      if (roll < cacheRate) {
        const shakes = 3;
        for (let i = 0; i < shakes; i++) {
          process.stderr.write(`  ${c('...', 'yellow')}`);
          await sleep(400);
        }
        process.stderr.write('\n');
        process.stderr.write(`\n  ${c('★', 'yellow')} ${b(`Cached! ${enemy.name} stored successfully!`)} ${c('★', 'yellow')}\n`);

        // Add to party
        addToParty(enemy);
        result.cached = true;
        break;
      } else {
        const shakes = Math.floor(Math.random() * 3);
        for (let i = 0; i < shakes; i++) {
          process.stderr.write(`  ${c('...', 'yellow')}`);
          await sleep(300);
        }
        process.stderr.write('\n');
        process.stderr.write(`  ${c('Cache miss! It evicted itself!', 'red')}\n`);
      }
    } else if (choice === '1' || choice.toLowerCase() === 'fight') {
      // Show moves
      process.stderr.write('\n');
      playerMoves.forEach((move, i) => {
        const eff = effectiveness?.[move.type]?.[enemy.type] ?? 1;
        let effLabel = '';
        if (eff > 1) effLabel = c(' (super effective)', 'green');
        else if (eff < 1) effLabel = c(' (not effective)', 'red');
        process.stderr.write(`  ${c(`[${i + 1}]`, 'yellow')} ${move.name} ${c(`[${move.type}]`, 'gray')} PWR:${move.power}${effLabel}\n`);
      });
      process.stderr.write(`  ${c('[0]', 'yellow')} Back\n`);
      process.stderr.write('\n');

      const moveChoice = await ask('  > ');
      const moveIdx = parseInt(moveChoice.trim(), 10) - 1;

      if (moveIdx < 0 || moveIdx >= playerMoves.length) continue;

      const playerMove = playerMoves[moveIdx];

      // Execute turn
      const enemyMove = enemyMoves[Math.floor(Math.random() * enemyMoves.length)];

      // Determine order
      const playerFirst = playerMon.speed >= enemy.speed;
      const turnOrder = playerFirst
        ? [{ side: 'player', attacker: playerMon, move: playerMove, defender: enemy },
           { side: 'enemy', attacker: enemy, move: enemyMove, defender: playerMon }]
        : [{ side: 'enemy', attacker: enemy, move: enemyMove, defender: playerMon },
           { side: 'player', attacker: playerMon, move: playerMove, defender: enemy }];

      process.stderr.write('\n');

      for (const action of turnOrder) {
        const atk = action.side === 'player' ? playerMon : enemy;
        const def = action.side === 'player' ? enemy : playerMon;

        if (atk.currentHP <= 0) continue;

        const { damage, effText } = calcDamage(atk, action.move, def, effectiveness);

        if (action.side === 'player') {
          enemy.currentHP = Math.max(0, enemy.currentHP - damage);
          process.stderr.write(`  ${b(playerMon.name)} used ${c(action.move.name, 'white')}! `);
          process.stderr.write(`${c(`-${damage}`, 'red')}${effText}\n`);
        } else {
          playerMon.currentHP = Math.max(0, playerMon.currentHP - damage);
          process.stderr.write(`  ${b(enemy.name)} used ${c(action.move.name, 'white')}! `);
          process.stderr.write(`${c(`-${damage}`, 'red')}${effText}\n`);
        }

        await sleep(300);

        if (enemy.currentHP <= 0) {
          process.stderr.write(`\n  ${c(enemy.name + ' fainted!', 'yellow')}\n`);
          process.stderr.write(`  ${b('You won the battle!')}\n\n`);
          break;
        }
        if (playerMon.currentHP <= 0) {
          process.stderr.write(`\n  ${c(playerMon.name + ' fainted!', 'red')}\n`);
          process.stderr.write(`  ${DIM}The wild ${enemy.name} got away...${RESET}\n\n`);
          result.playerFainted = true;
          break;
        }
      }

      if (enemy.currentHP <= 0 || playerMon.currentHP <= 0) break;
    } else {
      process.stderr.write(`  ${DIM}Pick 1, 2, or 3.${RESET}\n`);
    }
  }

  // Save player mon HP back
  savePartyHP(playerMon);

  rl.close();
  return result;
}

// Keep backwards-compatible export name
export { interactiveCache as interactiveCatch };

function calcDamage(attacker, move, defender, typeChart) {
  const power = move.power || 5;
  const attack = attacker.attack || 5;
  const defense = defender.defense || 3;
  const randomBonus = Math.floor(Math.random() * 3) + 1;
  const mult = typeChart?.[move.type]?.[defender.type] ?? 1;
  const crit = Math.random() < 1 / 16 ? 1.5 : 1;

  const damage = Math.max(1, Math.floor((power + attack - Math.floor(defense / 2) + randomBonus) * mult * crit));

  let effText = '';
  if (mult > 1) effText = ' \x1b[32m(super effective!)\x1b[0m';
  else if (mult < 1) effText = ' \x1b[31m(not very effective)\x1b[0m';
  if (crit > 1) effText += ' \x1b[33m(CRITICAL!)\x1b[0m';

  return { damage, effText };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get the player's party from the BugDex save file.
 * If no party exists, generate a starter.
 */
function getParty() {
  const dex = loadBugDex();
  if (dex.party && dex.party.length > 0) return dex.party;

  // Give the player a starter BugMon
  const dataDir = join(__dirname, '..', '..', 'data');
  const monsters = JSON.parse(readFileSync(join(dataDir, 'monsters.json'), 'utf8'));

  // Pick a random common starter
  const starters = monsters.filter(m => m.rarity === 'common');
  const starter = starters[Math.floor(Math.random() * starters.length)];
  const party = [{ ...starter, currentHP: starter.hp }];

  dex.party = party;
  saveBugDex(dex);
  return party;
}

/**
 * Add a cached BugMon to the party (max 6), overflow to storage.
 */
function addToParty(monster) {
  const dex = loadBugDex();
  if (!dex.party) dex.party = [];

  const entry = {
    id: monster.id,
    name: monster.name,
    type: monster.type,
    hp: monster.hp,
    currentHP: monster.hp,
    attack: monster.attack,
    defense: monster.defense,
    speed: monster.speed,
    moves: monster.moves,
    color: monster.color,
    sprite: monster.sprite,
    rarity: monster.rarity,
    cachedAt: new Date().toISOString(),
  };

  if (dex.party.length < 6) {
    dex.party.push(entry);
  } else {
    process.stderr.write(`  \x1b[2mParty full! ${monster.name} was sent to storage.\x1b[0m\n`);
    if (!dex.storage) dex.storage = [];
    dex.storage.push(entry);
  }

  // Update cached count in stats
  if (!dex.stats.totalCached) dex.stats.totalCached = 0;
  dex.stats.totalCached++;

  saveBugDex(dex);
}

/**
 * Save the player's lead BugMon HP after battle.
 */
function savePartyHP(playerMon) {
  const dex = loadBugDex();
  if (!dex.party || dex.party.length === 0) return;
  dex.party[0].currentHP = playerMon.currentHP;
  saveBugDex(dex);
}

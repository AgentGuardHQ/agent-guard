// Boss battle — interactive battle against a boss encounter
// Bosses cannot be cached. They are defeated by winning the battle.
// Defeating a boss awards bonus XP and shows the defeat condition.

import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadBugDex, saveBugDex } from '../../ecosystem/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const XP_BOSS_DEFEAT = 200;

let movesData = null;
let typeData = null;

function loadGameData() {
  if (movesData) return;
  const dataDir = join(__dirname, '..', '..', 'ecosystem', 'data');
  movesData = JSON.parse(readFileSync(join(dataDir, 'moves.json'), 'utf8'));
  typeData = JSON.parse(readFileSync(join(dataDir, 'types.json'), 'utf8'));
}

/**
 * Run an interactive boss battle in the terminal.
 * Bosses cannot be cached — only fought or fled from.
 * @param {object} boss - The boss BugMon
 * @returns {Promise<{defeated: boolean, fled: boolean, playerFainted: boolean}>}
 */
export async function interactiveBossBattle(boss) {
  loadGameData();

  const party = getParty();
  const playerMon = { ...party[0], currentHP: party[0].currentHP ?? party[0].hp };
  const enemy = { ...boss, currentHP: boss.hp };

  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const ask = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  const ESC = '\x1b[';
  const RESET = `${ESC}0m`;
  const BOLD = `${ESC}1m`;
  const DIM = `${ESC}2m`;
  const FG = {
    red: `${ESC}31m`,
    green: `${ESC}32m`,
    yellow: `${ESC}33m`,
    blue: `${ESC}34m`,
    cyan: `${ESC}36m`,
    white: `${ESC}37m`,
    gray: `${ESC}90m`,
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
    .map((id) => movesData.find((m) => m.id === id))
    .filter(Boolean);
  const enemyMoves = (enemy.moves || [])
    .map((id) => movesData.find((m) => m.id === id))
    .filter(Boolean);
  // If boss has no matching moves in data, give it generic attacks
  const effectiveEnemyMoves =
    enemyMoves.length > 0
      ? enemyMoves
      : [{ id: 'boss-strike', name: 'Boss Strike', power: 12, type: enemy.type }];

  const effectiveness = typeData.effectiveness;

  let result = { defeated: false, fled: false, playerFainted: false };

  process.stderr.write('\n');
  process.stderr.write(c('  ╔══════════════════════════════════════════════╗\n', 'red'));
  process.stderr.write(
    c('  ║', 'red') +
      b(c(`  BOSS BATTLE! ${enemy.name}`, 'red')) +
      c('              ║\n'.slice(0, 1), 'red') +
      '\n'
  );
  process.stderr.write(c('  ╚══════════════════════════════════════════════╝\n', 'red'));

  if (enemy.description) {
    process.stderr.write(`  ${DIM}${enemy.description}${RESET}\n`);
  }

  // Battle loop
  while (true) {
    process.stderr.write('\n');
    process.stderr.write(
      `  ${b(c(enemy.name, 'red'))} ${c(`[${enemy.type}]`, 'gray')}  ${hpBar(enemy.currentHP, enemy.hp)}\n`
    );
    process.stderr.write(
      `  ${b(playerMon.name)} ${c(`[${playerMon.type}]`, 'gray')}  ${hpBar(playerMon.currentHP, playerMon.hp)}\n`
    );
    process.stderr.write('\n');

    // Show action menu (no cache option for bosses)
    process.stderr.write(`  ${b('What will you do?')}\n`);
    process.stderr.write(`  ${c('[1]', 'yellow')} Fight   ${c('[2]', 'yellow')} Run\n`);
    process.stderr.write('\n');

    const action = await ask('  > ');
    const choice = action.trim();

    if (choice === '2' || choice.toLowerCase() === 'run') {
      process.stderr.write(`\n  ${DIM}Got away safely!${RESET}\n`);
      process.stderr.write(`  ${DIM}The ${enemy.name} still lurks...${RESET}\n\n`);
      result.fled = true;
      break;
    }

    if (choice === '1' || choice.toLowerCase() === 'fight') {
      // Show moves
      process.stderr.write('\n');
      playerMoves.forEach((move, i) => {
        const eff = effectiveness?.[move.type]?.[enemy.type] ?? 1;
        let effLabel = '';
        if (eff > 1) effLabel = c(' (super effective)', 'green');
        else if (eff < 1) effLabel = c(' (not effective)', 'red');
        process.stderr.write(
          `  ${c(`[${i + 1}]`, 'yellow')} ${move.name} ${c(`[${move.type}]`, 'gray')} PWR:${move.power}${effLabel}\n`
        );
      });
      process.stderr.write(`  ${c('[0]', 'yellow')} Back\n`);
      process.stderr.write('\n');

      const moveChoice = await ask('  > ');
      const moveIdx = parseInt(moveChoice.trim(), 10) - 1;

      if (moveIdx < 0 || moveIdx >= playerMoves.length) continue;

      const playerMove = playerMoves[moveIdx];
      const enemyMove = effectiveEnemyMoves[Math.floor(Math.random() * effectiveEnemyMoves.length)];

      // Determine order
      const playerFirst = playerMon.speed >= enemy.speed;
      const turnOrder = playerFirst
        ? [
            { side: 'player', move: playerMove },
            { side: 'enemy', move: enemyMove },
          ]
        : [
            { side: 'enemy', move: enemyMove },
            { side: 'player', move: playerMove },
          ];

      process.stderr.write('\n');

      for (const turn of turnOrder) {
        const atk = turn.side === 'player' ? playerMon : enemy;
        const def = turn.side === 'player' ? enemy : playerMon;

        if (atk.currentHP <= 0) continue;

        const { damage, effText } = calcDamage(atk, turn.move, def, effectiveness);

        if (turn.side === 'player') {
          enemy.currentHP = Math.max(0, enemy.currentHP - damage);
          process.stderr.write(`  ${b(playerMon.name)} used ${c(turn.move.name, 'white')}! `);
          process.stderr.write(`${c(`-${damage}`, 'red')}${effText}\n`);
        } else {
          playerMon.currentHP = Math.max(0, playerMon.currentHP - damage);
          process.stderr.write(`  ${b(c(enemy.name, 'red'))} used ${c(turn.move.name, 'white')}! `);
          process.stderr.write(`${c(`-${damage}`, 'red')}${effText}\n`);
        }

        await sleep(300);

        if (enemy.currentHP <= 0) {
          process.stderr.write(`\n  ${c(enemy.name + ' was defeated!', 'yellow')}\n`);
          process.stderr.write(`  ${b(c(`BOSS DEFEATED! +${XP_BOSS_DEFEAT} XP`, 'green'))}\n`);

          // Award boss XP
          const dex = loadBugDex();
          dex.stats.xp += XP_BOSS_DEFEAT;
          dex.stats.level = calculateLevel(dex.stats.xp);
          if (!dex.stats.bossesDefeated) dex.stats.bossesDefeated = 0;
          dex.stats.bossesDefeated++;
          saveBugDex(dex);

          // Show defeat condition as guidance
          if (enemy.defeatCondition) {
            process.stderr.write(
              `\n  ${c('To truly defeat this boss:', 'cyan')} ${enemy.defeatCondition}\n`
            );
          }
          process.stderr.write('\n');

          result.defeated = true;
          break;
        }
        if (playerMon.currentHP <= 0) {
          process.stderr.write(`\n  ${c(playerMon.name + ' fainted!', 'red')}\n`);
          process.stderr.write(`  ${DIM}The ${enemy.name} remains...${RESET}\n`);
          if (enemy.defeatCondition) {
            process.stderr.write(`  ${c('Hint:', 'cyan')} ${enemy.defeatCondition}\n`);
          }
          process.stderr.write('\n');
          result.playerFainted = true;
          break;
        }
      }

      if (enemy.currentHP <= 0 || playerMon.currentHP <= 0) break;
    } else {
      process.stderr.write(`  ${DIM}Pick 1 or 2.${RESET}\n`);
    }
  }

  // Save player mon HP back
  savePartyHP(playerMon);

  rl.close();
  return result;
}

function calcDamage(attacker, move, defender, typeChart) {
  const power = move.power || 5;
  const attack = attacker.attack || 5;
  const defense = defender.defense || 3;
  const randomBonus = Math.floor(Math.random() * 3) + 1;
  const mult = typeChart?.[move.type]?.[defender.type] ?? 1;
  const crit = Math.random() < 1 / 16 ? 1.5 : 1;

  const damage = Math.max(
    1,
    Math.floor((power + attack - Math.floor(defense / 2) + randomBonus) * mult * crit)
  );

  let effText = '';
  if (mult > 1) effText = ' \x1b[32m(super effective!)\x1b[0m';
  else if (mult < 1) effText = ' \x1b[31m(not very effective)\x1b[0m';
  if (crit > 1) effText += ' \x1b[33m(CRITICAL!)\x1b[0m';

  return { damage, effText };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getParty() {
  const dex = loadBugDex();
  if (dex.party && dex.party.length > 0) return dex.party;

  const dataDir = join(__dirname, '..', '..', 'ecosystem', 'data');
  const monsters = JSON.parse(readFileSync(join(dataDir, 'monsters.json'), 'utf8'));
  const starters = monsters.filter((m) => m.rarity === 'common');
  const starter = starters[Math.floor(Math.random() * starters.length)];
  const party = [{ ...starter, currentHP: starter.hp }];

  dex.party = party;
  saveBugDex(dex);
  return party;
}

function savePartyHP(playerMon) {
  const dex = loadBugDex();
  if (!dex.party || dex.party.length === 0) return;
  dex.party[0].currentHP = playerMon.currentHP;
  saveBugDex(dex);
}

function calculateLevel(xp) {
  let level = 1;
  while ((((level + 1) * level) / 2) * 100 <= xp) {
    level++;
  }
  return level;
}

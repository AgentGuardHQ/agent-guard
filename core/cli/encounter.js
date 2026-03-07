/**
 * Terminal UI for BugMon encounters.
 * Zero dependencies — uses raw ANSI escape codes.
 */

// ── ANSI helpers ──────────────────────────────────────────

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const RED = `${ESC}31m`;
const GREEN = `${ESC}32m`;
const YELLOW = `${ESC}33m`;
const BLUE = `${ESC}34m`;
const MAGENTA = `${ESC}35m`;
const CYAN = `${ESC}36m`;
const WHITE = `${ESC}37m`;
const BG_RED = `${ESC}41m`;
const BG_YELLOW = `${ESC}43m`;
const BG_MAGENTA = `${ESC}45m`;

const TYPE_COLORS = {
  memory: GREEN,
  logic: YELLOW,
  runtime: RED,
  syntax: MAGENTA,
  frontend: BLUE,
  backend: CYAN,
  devops: YELLOW,
  testing: YELLOW,
};

const RARITY_STYLE = {
  common: { color: WHITE, label: '' },
  uncommon: { color: CYAN, label: '' },
  rare: { color: YELLOW, label: `${BOLD}${YELLOW}★ RARE ★${RESET}` },
  legendary: { color: MAGENTA, label: `${BOLD}${BG_MAGENTA}${WHITE} ⚡ LEGENDARY ⚡ ${RESET}` },
};

// ── Box drawing ───────────────────────────────────────────

function box(lines, width = 40) {
  const top = `╔${'═'.repeat(width)}╗`;
  const bot = `╚${'═'.repeat(width)}╝`;
  const padded = lines.map((l) => {
    const stripped = l.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = width - stripped.length;
    return `║${l}${' '.repeat(Math.max(0, pad))}║`;
  });
  return [top, ...padded, bot].join('\n');
}

function hpBar(hp, maxHp, width = 20) {
  const ratio = hp / maxHp;
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  let color = GREEN;
  if (ratio <= 0.25) color = RED;
  else if (ratio <= 0.5) color = YELLOW;
  return `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET} ${hp}/${maxHp}`;
}

// ── Sleep helper ──────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Encounter sequence ───────────────────────────────────

async function showEncounter(monster, errorInfo) {
  const typeColor = TYPE_COLORS[monster.type] || WHITE;
  const rarity = RARITY_STYLE[monster.rarity] || RARITY_STYLE.common;

  console.log();

  // Rarity banner for rare+
  if (rarity.label) {
    console.log(`  ${rarity.label}`);
    console.log();
  }

  // Encounter box
  const title = `${BOLD}      BUGMON ENCOUNTER${RESET}`;
  console.log(box([
    '',
    title,
    '',
  ], 40));

  console.log();

  // Monster ASCII art
  for (const line of monster.ascii) {
    console.log(`  ${typeColor}${line}${RESET}`);
  }

  console.log();
  console.log(`  ${BOLD}A wild ${rarity.color}${monster.name}${RESET}${BOLD} appeared!${RESET}`);
  console.log();
  console.log(`  ${DIM}Type:${RESET}   ${typeColor}${monster.type}${RESET}`);
  console.log(`  ${DIM}Error:${RESET}  ${monster.errorType}`);
  console.log(`  ${DIM}HP:${RESET}     ${hpBar(monster.hp, monster.hp)}`);

  // Error details
  if (errorInfo.file) {
    console.log();
    console.log(`  ${DIM}File:${RESET}   ${WHITE}${errorInfo.file}${RESET}`);
  }
  if (errorInfo.line) {
    console.log(`  ${DIM}Line:${RESET}   ${WHITE}${errorInfo.line}${RESET}`);
  }

  console.log();
  console.log(`  ${DIM}─────────────────────────────────${RESET}`);
  console.log();

  // Show the actual error message
  console.log(`  ${RED}${errorInfo.message}${RESET}`);

  if (errorInfo.stack) {
    const stackLines = errorInfo.stack.split('\n').slice(0, 4);
    for (const line of stackLines) {
      console.log(`  ${DIM}${line.trim()}${RESET}`);
    }
  }

  console.log();

  // Battle animation
  await battleSequence(monster, typeColor);
}

async function battleSequence(monster, typeColor) {
  const frames = ['⚔️  Debugging...', '⚔️  Debugging..', '⚔️  Debugging.'];
  for (const frame of frames) {
    process.stdout.write(`\r  ${frame}`);
    await sleep(400);
  }
  process.stdout.write('\r' + ' '.repeat(40) + '\r');

  // Drain HP
  const steps = 5;
  for (let i = steps; i >= 0; i--) {
    const currentHp = Math.round((i / steps) * monster.hp);
    process.stdout.write(`\r  ${DIM}HP:${RESET} ${hpBar(currentHp, monster.hp)}`);
    await sleep(200);
  }

  console.log();
  console.log();
  console.log(`  ${GREEN}${BOLD}⚔️  ${monster.name} defeated!${RESET}`);
  console.log(`  ${YELLOW}+${monster.xp} XP${RESET}`);
  console.log();
}

// ── BugDex display ────────────────────────────────────────

function showBugDex(monsters) {
  console.log();
  console.log(box([
    '',
    `${BOLD}         B U G D E X${RESET}`,
    '',
  ], 44));
  console.log();

  for (const mon of monsters) {
    const typeColor = TYPE_COLORS[mon.type] || WHITE;
    const rarity = RARITY_STYLE[mon.rarity] || RARITY_STYLE.common;
    const rarityTag = mon.rarity === 'common' ? '' :
      mon.rarity === 'uncommon' ? ` ${CYAN}[uncommon]${RESET}` :
      mon.rarity === 'rare' ? ` ${YELLOW}[★ rare]${RESET}` :
      ` ${MAGENTA}[⚡ legendary]${RESET}`;

    console.log(`  ${BOLD}#${String(mon.id).padStart(2, '0')}${RESET} ${rarity.color}${mon.name}${RESET}${rarityTag}`);
    console.log(`      ${DIM}Type:${RESET} ${typeColor}${mon.type}${RESET}  ${DIM}HP:${RESET} ${mon.hp}  ${DIM}XP:${RESET} ${mon.xp}  ${DIM}Maps to:${RESET} ${mon.errorType}`);
    console.log();
  }
}

// ── Help display ──────────────────────────────────────────

function showHelp() {
  console.log();
  console.log(`  ${BOLD}BugMon${RESET} ${DIM}— Pokemon-style encounters for runtime errors.${RESET}`);
  console.log();
  console.log(`  ${BOLD}Usage:${RESET}`);
  console.log(`    ${GREEN}bugmon${RESET} ${WHITE}<script.js>${RESET}         Run a file, catch bugs as monsters`);
  console.log(`    ${GREEN}bugmon${RESET} ${WHITE}--bugdex${RESET}            Show all known BugMon`);
  console.log(`    ${GREEN}bugmon${RESET} ${WHITE}--help${RESET}              Show this help`);
  console.log();
  console.log(`  ${BOLD}Examples:${RESET}`);
  console.log(`    ${DIM}$${RESET} bugmon server.js`);
  console.log(`    ${DIM}$${RESET} bugmon test.js`);
  console.log(`    ${DIM}$${RESET} npx bugmon broken-code.js`);
  console.log();
  console.log(`  ${DIM}Errors become monsters. Fix the bug to defeat them.${RESET}`);
  console.log();
}

export { showEncounter, showBugDex, showHelp };

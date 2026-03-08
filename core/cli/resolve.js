// bugmon resolve — mark bugs as fixed and earn XP
// Two modes:
//   bugmon resolve --last   Resolve the most recent unresolved encounter
//   bugmon resolve --all    Resolve all unresolved encounters

import {
  loadBugDex,
  saveBugDex,
  resolveLastUnresolved,
  resolveAllUnresolved,
} from '../../ecosystem/storage.js';

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const GREEN = `${ESC}32m`;
const YELLOW = `${ESC}33m`;

/**
 * Resolve encounters from the command line.
 * @param {string[]} args - CLI arguments after "resolve"
 */
export async function resolve(args) {
  if (args.includes('--all')) {
    const { count, xpGained } = resolveAllUnresolved();

    if (count === 0) {
      process.stderr.write(`\n  ${DIM}No unresolved encounters to clear.${RESET}\n\n`);
      return;
    }

    process.stderr.write('\n');
    process.stderr.write(
      `  ${GREEN}${BOLD}Resolved ${count} bug${count > 1 ? 's' : ''}!${RESET}\n`
    );
    process.stderr.write(`  ${YELLOW}+${xpGained} XP${RESET}\n`);
    const data = loadBugDex();
    process.stderr.write(`  ${DIM}Level ${data.stats.level} | ${data.stats.xp} total XP${RESET}\n`);
    process.stderr.write('\n');
  } else if (args.includes('--last') || args.length === 0) {
    const xp = resolveLastUnresolved();

    if (xp === 0) {
      process.stderr.write(`\n  ${DIM}No unresolved encounters to clear.${RESET}\n\n`);
      return;
    }

    process.stderr.write('\n');
    process.stderr.write(`  ${GREEN}${BOLD}Bug resolved!${RESET}\n`);
    process.stderr.write(`  ${YELLOW}+${xp} XP${RESET}\n`);
    const data = loadBugDex();
    process.stderr.write(`  ${DIM}Level ${data.stats.level} | ${data.stats.xp} total XP${RESET}\n`);
    process.stderr.write('\n');
  } else {
    process.stderr.write(`\n  ${DIM}Usage: bugmon resolve [--last | --all]${RESET}\n\n`);
  }
}

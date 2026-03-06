#!/usr/bin/env node

// BugMon CLI — catch bugs by actually hitting bugs
//
// Usage:
//   bugmon watch -- <command>           Wrap a command and catch bugs (passive)
//   bugmon watch --catch -- <command>   Interactive mode — battle & catch BugMon
//   bugmon party                        View your party
//   bugmon dex                          View your BugDex
//   bugmon stats                        View your bug hunter stats
//   bugmon help                         Show help

import { watch } from './adapters/cli-adapter.js';
import { loadBugDex } from './bugdex/bugdex.js';
import { getAllMonsters } from './monsters/matcher.js';
import { renderBugDex, renderStats, renderParty } from './ui/terminal-renderer.js';

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'watch': {
    const dashDash = args.indexOf('--');
    if (dashDash === -1 || dashDash === args.length - 1) {
      printUsage('watch requires a command after --');
      process.exit(1);
    }

    // Parse flags before --
    const flags = args.slice(1, dashDash);
    const interactive = flags.includes('--catch') || flags.includes('-c');
    const openBrowser = flags.includes('--open') || flags.includes('-o');

    const cmd = args[dashDash + 1];
    const cmdArgs = args.slice(dashDash + 2);

    if (interactive) {
      // Show starter info on first run
      const dex = loadBugDex();
      if (!dex.party || dex.party.length === 0) {
        process.stderr.write('\n  \x1b[1m\x1b[33mFirst time? You\'ll get a starter BugMon for your party!\x1b[0m\n');
        process.stderr.write('  \x1b[2mFix errors to catch the BugMon that appear.\x1b[0m\n\n');
      }
    }

    const code = await watch(cmd, cmdArgs, { interactive, openBrowser });
    process.exit(code);
  }

  case 'party': {
    const data = loadBugDex();
    renderParty(data.party || []);
    break;
  }

  case 'dex': {
    const data = loadBugDex();
    const monsters = getAllMonsters();
    renderBugDex(data, monsters);
    break;
  }

  case 'stats': {
    const data = loadBugDex();
    renderStats(data.stats);
    break;
  }

  case 'help':
  case '--help':
  case '-h':
  case undefined:
    printHelp();
    break;

  default:
    printUsage(`Unknown command: ${command}`);
    process.exit(1);
}

function printHelp() {
  console.log(`
  \x1b[1mBugMon\x1b[0m — Catch bugs by hitting bugs

  Every error is a wild BugMon encounter.
  Battle them, catch them, build your party.

  \x1b[1mUsage:\x1b[0m
    bugmon watch -- <command>             Wrap a command (passive mode)
    bugmon watch --catch -- <command>     Interactive: battle & catch BugMon!
    bugmon watch --catch --open -- <cmd>  Same + offer to open in browser
    bugmon party                          View your BugMon party
    bugmon dex                            View your BugDex
    bugmon stats                          View your bug hunter stats
    bugmon help                           Show this help

  \x1b[1mExamples:\x1b[0m
    bugmon watch --catch -- npm run dev
    bugmon watch --catch -- node server.js
    bugmon watch -c -- npx tsc --noEmit
    bugmon watch -- npm test
    bugmon party
    bugmon dex

  \x1b[1mHow it works:\x1b[0m
    1. Run your dev command through bugmon watch
    2. When an error/exception hits, a wild BugMon appears
    3. In --catch mode, you battle it with your party lead
    4. Weaken it and throw a catch to add it to your team
    5. Fix the real bug to earn resolve XP

  \x1b[2mYou can also play the full game in the browser at the GitHub Pages site.\x1b[0m
`);
}

function printUsage(error) {
  console.error(`  Error: ${error}`);
  console.error('  Run "bugmon help" for usage info.');
}

// bugmon claude-init — set up Claude Code integration
// Adds a PostToolUse hook to .claude/settings.json so BugMon encounters
// trigger automatically when errors occur during Claude Code sessions.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { homedir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const GREEN = `${ESC}32m`;
const YELLOW = `${ESC}33m`;
const RED = `${ESC}31m`;
const CYAN = `${ESC}36m`;

const HOOK_MARKER = 'claude-hook';

/**
 * Set up Claude Code hooks for BugMon encounters.
 * @param {string[]} args - CLI arguments
 */
export async function claudeInit(args = []) {
  const isGlobal = args.includes('--global') || args.includes('-g');
  const isRemove = args.includes('--remove') || args.includes('--uninstall');

  // Resolve the hook script path
  const hookScript = resolve(__dirname, 'claude-hook.js');

  // Determine settings file location
  const settingsDir = isGlobal ? join(homedir(), '.claude') : join(process.cwd(), '.claude');
  const settingsPath = join(settingsDir, 'settings.json');
  const settingsLabel = isGlobal ? '~/.claude/settings.json' : '.claude/settings.json';

  process.stderr.write('\n');
  process.stderr.write(`  ${BOLD}BugMon Claude Code Integration${RESET}\n\n`);

  if (isRemove) {
    return removeHook(settingsPath, settingsLabel);
  }

  // Ensure .claude directory exists
  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true });
  }

  // Load existing settings
  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    } catch {
      process.stderr.write(
        `  ${YELLOW}Warning:${RESET} Could not parse ${settingsLabel}, creating fresh config.\n`
      );
      settings = {};
    }
  }

  // Check if already installed
  if (hasBugMonHook(settings)) {
    process.stderr.write(
      `  ${YELLOW}Already configured.${RESET} BugMon hook found in ${settingsLabel}.\n`
    );
    process.stderr.write(`  ${DIM}Use --remove to uninstall.${RESET}\n\n`);
    return;
  }

  // Build the hook command
  const hookCommand = `node ${hookScript}`;

  // Merge into settings
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.PostToolUse) settings.hooks.PostToolUse = [];

  settings.hooks.PostToolUse.push({
    matcher: 'Bash',
    hooks: [
      {
        type: 'command',
        command: hookCommand,
      },
    ],
  });

  // Write settings
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

  process.stderr.write(`  ${GREEN}✓${RESET}  Hook installed in ${CYAN}${settingsLabel}${RESET}\n`);
  process.stderr.write(`  ${DIM}Command: ${hookCommand}${RESET}\n\n`);
  process.stderr.write(
    `  ${GREEN}${BOLD}Done!${RESET} BugMon encounters will trigger on errors in Claude Code.\n`
  );
  process.stderr.write(`  ${DIM}Run "bugmon dex" to view your collection.${RESET}\n`);
  process.stderr.write(`  ${DIM}Use "bugmon claude-init --remove" to uninstall.${RESET}\n\n`);
}

/**
 * Remove the BugMon hook from Claude Code settings.
 */
function removeHook(settingsPath, settingsLabel) {
  if (!existsSync(settingsPath)) {
    process.stderr.write(
      `  ${DIM}No settings file found at ${settingsLabel}. Nothing to remove.${RESET}\n\n`
    );
    return;
  }

  let settings;
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  } catch {
    process.stderr.write(`  ${RED}Error:${RESET} Could not parse ${settingsLabel}.\n\n`);
    return;
  }

  if (!hasBugMonHook(settings)) {
    process.stderr.write(
      `  ${DIM}No BugMon hook found in ${settingsLabel}. Nothing to remove.${RESET}\n\n`
    );
    return;
  }

  // Filter out BugMon hooks
  const postToolUse = settings.hooks?.PostToolUse || [];
  settings.hooks.PostToolUse = postToolUse.filter((entry) => {
    const hooks = entry.hooks || [];
    return !hooks.some((h) => h.command && h.command.includes(HOOK_MARKER));
  });

  // Clean up empty arrays
  if (settings.hooks.PostToolUse.length === 0) {
    delete settings.hooks.PostToolUse;
  }
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');

  process.stderr.write(`  ${GREEN}✓${RESET}  Hook removed from ${CYAN}${settingsLabel}${RESET}\n`);
  process.stderr.write(
    `  ${DIM}BugMon encounters will no longer trigger in Claude Code.${RESET}\n\n`
  );
}

/**
 * Check if the settings already contain a BugMon hook.
 */
function hasBugMonHook(settings) {
  const postToolUse = settings?.hooks?.PostToolUse || [];
  return postToolUse.some((entry) => {
    const hooks = entry.hooks || [];
    return hooks.some((h) => h.command && h.command.includes(HOOK_MARKER));
  });
}

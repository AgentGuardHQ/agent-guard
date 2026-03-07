// bugmon init — install git hooks for evolution tracking
// Copies post-commit and post-merge hooks to the current repo's .git/hooks/

import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

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

const HOOK_NAMES = ['post-commit', 'post-merge'];

/**
 * Install BugMon git hooks into the current repository.
 * @param {{ force?: boolean }} options
 */
export async function init(options = {}) {
  // Find the git directory
  let gitDir;
  try {
    gitDir = execSync('git rev-parse --git-dir', { encoding: 'utf8' }).trim();
  } catch {
    process.stderr.write(`\n  ${RED}Error:${RESET} Not inside a git repository.\n`);
    process.stderr.write(`  ${DIM}Run this command from the root of a git repo.${RESET}\n\n`);
    process.exit(1);
  }

  const hooksDir = join(gitDir, 'hooks');
  const sourceDir = join(__dirname, '..', '..', 'hooks');

  let installed = 0;
  let skipped = 0;

  process.stderr.write('\n');
  process.stderr.write(`  ${BOLD}BugMon Init${RESET} — Installing git hooks for evolution tracking\n\n`);

  for (const hookName of HOOK_NAMES) {
    const sourcePath = join(sourceDir, hookName);
    const destPath = join(hooksDir, hookName);

    if (!existsSync(sourcePath)) {
      process.stderr.write(`  ${YELLOW}⚠${RESET}  ${hookName}: source hook not found, skipping\n`);
      skipped++;
      continue;
    }

    if (existsSync(destPath) && !options.force) {
      process.stderr.write(`  ${YELLOW}⚠${RESET}  ${hookName}: already exists ${DIM}(use --force to overwrite)${RESET}\n`);
      skipped++;
      continue;
    }

    const content = readFileSync(sourcePath, 'utf8');
    writeFileSync(destPath, content, 'utf8');
    chmodSync(destPath, 0o755);
    installed++;
    process.stderr.write(`  ${GREEN}✓${RESET}  ${hookName}: installed\n`);
  }

  process.stderr.write('\n');

  if (installed > 0) {
    process.stderr.write(`  ${GREEN}${BOLD}Done!${RESET} ${installed} hook${installed > 1 ? 's' : ''} installed.\n`);
    process.stderr.write(`  ${DIM}Commits and merges will now track evolution progress.${RESET}\n`);
    process.stderr.write(`  ${DIM}Activity is saved to ${CYAN}.events.json${RESET}${DIM} in your repo root.${RESET}\n`);
  } else {
    process.stderr.write(`  ${DIM}No hooks were installed.${RESET}\n`);
  }

  process.stderr.write('\n');
}

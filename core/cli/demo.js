// bugmon demo — launch a demo encounter using one of the example error scripts
// Reuses the full watch pipeline so the experience is identical to real usage.

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { watch } from './adapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCENARIOS = {
  null: 'null-error.js',
  syntax: 'syntax-error.js',
  reference: 'reference-error.js',
  async: 'async-error.js',
  module: 'module-error.js',
  overflow: 'stack-overflow.js',
};

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const YELLOW = `${ESC}33m`;
const CYAN = `${ESC}36m`;

/**
 * Run a demo encounter using one of the example error scripts.
 * @param {string} [scenarioName] - Optional scenario name (null, syntax, reference, etc.)
 */
export async function demo(scenarioName) {
  const names = Object.keys(SCENARIOS);

  if (scenarioName && !SCENARIOS[scenarioName]) {
    process.stderr.write(`\n  ${YELLOW}Unknown scenario:${RESET} ${scenarioName}\n`);
    process.stderr.write(`  ${DIM}Available: ${names.join(', ')}${RESET}\n\n`);
    process.exit(1);
  }

  const name = scenarioName || names[Math.floor(Math.random() * names.length)];
  const file = SCENARIOS[name];
  const examplePath = join(__dirname, '..', '..', 'examples', file);

  if (!existsSync(examplePath)) {
    process.stderr.write(`\n  ${YELLOW}Example file not found:${RESET} ${examplePath}\n\n`);
    process.exit(1);
  }

  process.stderr.write('\n');
  process.stderr.write(`  ${BOLD}${CYAN}BugMon Demo${RESET} — ${name} encounter\n`);
  process.stderr.write(`  ${DIM}Running: node ${file}${RESET}\n`);
  process.stderr.write('\n');

  await watch('node', [examplePath], { interactive: true });
}

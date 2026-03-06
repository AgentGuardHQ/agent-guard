// CLI adapter — wraps child processes and intercepts stderr errors
// Supports two modes:
//   - watch: passive monitoring, shows encounters on exit
//   - watch --cache: interactive mode, pauses on errors for battle/cache

import { spawn } from 'node:child_process';
import { parseErrors } from '../core/error-parser.js';
import { parseStackTrace, getUserFrame } from '../core/stacktrace-parser.js';
import { matchMonster } from '../monsters/matcher.js';
import { recordEncounter } from '../bugdex/bugdex.js';
import { renderEncounter, renderEncounterPrompt } from '../ui/terminal-renderer.js';
import { renderContributionPrompt, LOW_CONFIDENCE_THRESHOLD } from '../ui/contribute.js';
import { interactiveCache } from '../core/catch.js';

/**
 * Run a command and intercept errors from stderr.
 * @param {string} command - The command to run
 * @param {string[]} args - Command arguments
 * @param {{interactive?: boolean, openBrowser?: boolean}} options
 * @returns {Promise<number>} Exit code
 */
export function watch(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['inherit', 'inherit', 'pipe'],
      shell: process.platform === 'win32',
    });

    let stderrBuffer = '';
    let errorQueue = [];
    let processing = false;

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrBuffer += text;

      // Pass stderr through immediately so developers still see real output
      process.stderr.write(chunk);

      // In interactive mode, check for errors in real-time
      if (options.interactive) {
        const errors = parseErrors(stderrBuffer);
        if (errors.length > 0) {
          // Queue new errors we haven't processed yet
          for (const err of errors) {
            const key = `${err.type}:${err.message}`;
            if (!errorQueue.find(e => `${e.type}:${e.message}` === key)) {
              errorQueue.push(err);
            }
          }
          // Process queue if not already doing so
          if (!processing) {
            processing = true;
            processInteractiveQueue(errorQueue, options).then(() => {
              processing = false;
            });
          }
        }
      }
    });

    child.on('error', (err) => {
      process.stderr.write(`bugmon: failed to start "${command}": ${err.message}\n`);
      resolve(1);
    });

    child.on('close', async (code) => {
      // Process any remaining stderr
      if (stderrBuffer.length > 0) {
        if (options.interactive) {
          // Drain remaining error queue
          const errors = parseErrors(stderrBuffer);
          for (const err of errors) {
            const key = `${err.type}:${err.message}`;
            if (!errorQueue.find(e => `${e.type}:${e.message}` === key)) {
              errorQueue.push(err);
            }
          }
          if (errorQueue.length > 0 && !processing) {
            await processInteractiveQueue(errorQueue, options);
          }
        } else {
          processErrors(stderrBuffer);
        }
      }
      resolve(code || 0);
    });
  });
}

/**
 * Process the interactive error queue — pause for each encounter.
 * @param {Array} queue
 * @param {object} options
 */
async function processInteractiveQueue(queue, options) {
  while (queue.length > 0) {
    const error = queue.shift();

    const frames = parseStackTrace(error.rawLines);
    const location = getUserFrame(frames);
    const { monster, confidence } = matchMonster(error);

    // Record in BugDex
    const { xpGained, isNew } = recordEncounter(
      monster,
      error.message,
      location?.file || null,
      location?.line || null,
    );

    // Show the encounter card
    renderEncounter(monster, error, location, confidence);

    const parts = [`+${xpGained} XP`];
    if (isNew) parts.push('NEW BugDex entry!');
    process.stderr.write(`  ${parts.join(' | ')}\n`);

    // Prompt for battle
    renderEncounterPrompt(monster);

    const result = await interactiveCache(monster, {
      message: error.message,
      file: location?.file,
      line: location?.line,
    });

    if (result.cached) {
      process.stderr.write(`  \x1b[33m+50 XP (cache bonus)\x1b[0m\n\n`);
    }

    // Suggest contributing if the match was weak
    if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      renderContributionPrompt();
    }

    // Offer to open in browser
    if (options.openBrowser && location?.file) {
      process.stderr.write(`  \x1b[2mOpen in browser: file://${location.file}${location.line ? '#L' + location.line : ''}\x1b[0m\n\n`);
    }
  }
}

/**
 * Process a block of stderr text, find errors, and render encounters (passive mode).
 * @param {string} text
 */
function processErrors(text) {
  const errors = parseErrors(text);

  for (const error of errors) {
    // Parse stack trace for location info
    const frames = parseStackTrace(error.rawLines);
    const location = getUserFrame(frames);

    // Match to a BugMon
    const { monster, confidence } = matchMonster(error);

    // Record in BugDex
    const { xpGained, isNew } = recordEncounter(
      monster,
      error.message,
      location?.file || null,
      location?.line || null,
    );

    // Render the encounter
    renderEncounter(monster, error, location, confidence);

    // XP notification
    const parts = [`+${xpGained} XP`];
    if (isNew) parts.push('NEW BugDex entry!');
    process.stderr.write(`  ${parts.join(' | ')}\n\n`);

    // Suggest contributing if the match was weak
    if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      renderContributionPrompt();
    }
  }
}

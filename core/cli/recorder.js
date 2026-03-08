// Session recorder — captures canonical events during a watch session.
// Wraps the session store and provides high-level recording methods.

import { createSession } from './session-store.js';
import {
  createEvent,
  ERROR_OBSERVED,
  ENCOUNTER_STARTED,
  BATTLE_ENDED,
  RUN_STARTED,
  RUN_ENDED,
  TEST_COMPLETED,
  FILE_SAVED,
} from '../../domain/events.js';

/**
 * Create a session recorder for a watch session.
 * @param {string} command - The command being watched
 * @param {string[]} [args] - Command arguments
 * @returns {object} Recorder with event-specific helpers
 */
export function createRecorder(command, args = []) {
  const fullCommand = [command, ...args].join(' ');
  const session = createSession({ command: fullCommand });
  const startTime = Date.now();

  let bugsDefeated = 0;
  let bossesEncountered = 0;
  let errorsObserved = 0;

  return {
    /** The session ID. */
    get sessionId() {
      return session.id;
    },

    /**
     * Record a raw event object.
     * @param {object} event - A canonical domain event
     */
    record(event) {
      session.append(event);
    },

    /**
     * Record an error observation.
     * @param {object} error - Parsed error
     * @param {object} [location] - File/line location
     */
    recordError(error, location) {
      errorsObserved++;
      const event = createEvent(ERROR_OBSERVED, {
        message: error.message,
        errorType: error.type,
        file: location?.file || null,
        line: location?.line || null,
        severity: error.severity || 3,
      });
      session.append(event);
    },

    /**
     * Record a BugMon encounter (monster spawned).
     * @param {object} monster - The matched monster
     * @param {object} error - The triggering error
     */
    recordEncounter(monster, error) {
      const event = createEvent(ENCOUNTER_STARTED, {
        enemy: monster.name,
        playerLevel: null,
      });
      // Attach extra context as metadata
      event.monster = {
        id: monster.id,
        name: monster.name,
        type: monster.type,
        hp: monster.hp,
      };
      event.errorMessage = error.message;
      session.append(event);
    },

    /**
     * Record a battle result.
     * @param {string} result - 'victory', 'defeat', or 'fled'
     * @param {object} [details] - Extra battle details
     */
    recordBattle(result, details = {}) {
      if (result === 'victory') bugsDefeated++;
      const event = createEvent(BATTLE_ENDED, { result, ...details });
      session.append(event);
    },

    /**
     * Record a boss encounter.
     * @param {object} boss - The boss definition
     */
    recordBoss(boss) {
      bossesEncountered++;
      const event = createEvent(ENCOUNTER_STARTED, {
        enemy: boss.name,
        playerLevel: null,
      });
      event.isBoss = true;
      event.boss = { id: boss.id, name: boss.name, type: boss.type };
      session.append(event);
    },

    /**
     * Record a test result.
     * @param {string} result - 'pass' or 'fail'
     * @param {object} [details] - Test details
     */
    recordTest(result, details = {}) {
      const event = createEvent(TEST_COMPLETED, { result, ...details });
      session.append(event);
    },

    /**
     * Record a file modification.
     * @param {string} file - File path
     */
    recordFileModified(file) {
      const event = createEvent(FILE_SAVED, { file });
      session.append(event);
    },

    /**
     * Record a bug resolution.
     * @param {string} monsterName - Name of the resolved BugMon
     */
    recordResolution(monsterName) {
      bugsDefeated++;
      const event = createEvent(BATTLE_ENDED, { result: 'resolved' });
      event.monsterName = monsterName;
      session.append(event);
    },

    /**
     * End the recording session.
     * @param {number} [exitCode] - Process exit code
     */
    end(exitCode) {
      session.end({
        bugsDefeated,
        bossesEncountered,
        errorsObserved,
        exitCode: exitCode ?? null,
        duration: Date.now() - startTime,
      });
    },
  };
}

// BugDex — persistence layer for encountered/defeated bugs
// Stores data in ~/.bugmon/bugdex.json

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BUGMON_DIR = join(homedir(), '.bugmon');
const BUGDEX_PATH = join(BUGMON_DIR, 'bugdex.json');

const XP_ENCOUNTER = 10;
const XP_NEW_DISCOVERY = 100;
const XP_RESOLVED = 50;

function ensureDir() {
  if (!existsSync(BUGMON_DIR)) {
    mkdirSync(BUGMON_DIR, { recursive: true });
  }
}

function createEmpty() {
  return {
    encounters: [],
    stats: { totalEncounters: 0, totalResolved: 0, xp: 0, level: 1 },
    seen: {},
  };
}

/**
 * Load the BugDex from disk.
 * @returns {object}
 */
export function loadBugDex() {
  ensureDir();
  if (!existsSync(BUGDEX_PATH)) return createEmpty();
  try {
    return JSON.parse(readFileSync(BUGDEX_PATH, 'utf8'));
  } catch {
    return createEmpty();
  }
}

/**
 * Save the BugDex to disk.
 * @param {object} data
 */
export function saveBugDex(data) {
  ensureDir();
  writeFileSync(BUGDEX_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Record a new bug encounter.
 * @param {object} monster - The matched monster
 * @param {string} errorMessage - The error message
 * @param {string|null} file - Source file
 * @param {number|null} line - Line number
 * @returns {{xpGained: number, isNew: boolean, data: object}}
 */
export function recordEncounter(monster, errorMessage, file, line) {
  const data = loadBugDex();
  const isNew = !data.seen[monster.id];

  // Record encounter
  data.encounters.push({
    monsterId: monster.id,
    monsterName: monster.name,
    error: errorMessage.slice(0, 200),
    file: file || null,
    line: line || null,
    timestamp: new Date().toISOString(),
    resolved: false,
  });

  // Keep only last 500 encounters to prevent file bloat
  if (data.encounters.length > 500) {
    data.encounters = data.encounters.slice(-500);
  }

  // Update seen count
  data.seen[monster.id] = (data.seen[monster.id] || 0) + 1;

  // Award XP
  let xpGained = XP_ENCOUNTER;
  if (isNew) xpGained += XP_NEW_DISCOVERY;

  data.stats.totalEncounters++;
  data.stats.xp += xpGained;
  data.stats.level = calculateLevel(data.stats.xp);

  saveBugDex(data);

  return { xpGained, isNew, data };
}

/**
 * Mark the most recent encounter of a given error as resolved.
 * @param {string} errorMessage
 * @returns {number} XP gained (0 if nothing to resolve)
 */
export function resolveEncounter(errorMessage) {
  const data = loadBugDex();
  const prefix = errorMessage.slice(0, 200);

  // Find the most recent unresolved encounter matching this error
  for (let i = data.encounters.length - 1; i >= 0; i--) {
    if (!data.encounters[i].resolved && data.encounters[i].error === prefix) {
      data.encounters[i].resolved = true;
      data.stats.totalResolved++;
      data.stats.xp += XP_RESOLVED;
      data.stats.level = calculateLevel(data.stats.xp);
      saveBugDex(data);
      return XP_RESOLVED;
    }
  }

  return 0;
}

function calculateLevel(xp) {
  // Level thresholds: 0, 100, 300, 600, 1000, 1500, 2100, ...
  let level = 1;
  while (((level + 1) * level) / 2 * 100 <= xp) {
    level++;
  }
  return level;
}

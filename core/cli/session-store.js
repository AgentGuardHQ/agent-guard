// File-backed session store — persists event streams to ~/.bugmon/sessions/
// Each session is a JSON file with metadata + ordered events.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const BUGMON_DIR = join(homedir(), '.bugmon');
const SESSIONS_DIR = join(BUGMON_DIR, 'sessions');

function ensureDir() {
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

/**
 * Generate a short session ID: timestamp + random suffix.
 * @returns {string} e.g. "1709913600-a3f2"
 */
function generateSessionId() {
  const ts = Math.floor(Date.now() / 1000);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${ts}-${rand}`;
}

/**
 * Create a new session file and return a session writer.
 * @param {object} [meta] - Optional session metadata
 * @param {string} [meta.command] - The command being watched
 * @param {string} [meta.repo] - Repository name
 * @returns {{ id: string, append: (event: object) => void, end: (summary?: object) => void, path: string }}
 */
export function createSession(meta = {}) {
  ensureDir();
  const id = generateSessionId();
  const filePath = join(SESSIONS_DIR, `${id}.json`);

  const session = {
    id,
    startedAt: new Date().toISOString(),
    command: meta.command || null,
    repo: meta.repo || null,
    events: [],
    summary: null,
    endedAt: null,
  };

  // Write initial session file
  writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');

  return {
    id,
    path: filePath,

    /**
     * Append an event to the session.
     * @param {object} event - A canonical domain event
     */
    append(event) {
      session.events.push(event);
      writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
    },

    /**
     * End the session with an optional summary.
     * @param {object} [summary] - Run summary (bugs defeated, duration, etc.)
     */
    end(summary = {}) {
      session.endedAt = new Date().toISOString();
      session.summary = {
        totalEvents: session.events.length,
        duration: Date.now() - new Date(session.startedAt).getTime(),
        ...summary,
      };
      writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8');
    },
  };
}

/**
 * Load a session from disk by ID or path.
 * @param {string} idOrPath - Session ID (e.g. "1709913600-a3f2") or full file path
 * @returns {object|null} The session object, or null if not found
 */
export function loadSession(idOrPath) {
  ensureDir();

  let filePath;
  if (existsSync(idOrPath)) {
    filePath = idOrPath;
  } else {
    filePath = join(SESSIONS_DIR, `${idOrPath}.json`);
  }

  if (!existsSync(filePath)) return null;

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * List all saved sessions, most recent first.
 * @param {number} [limit=20] - Max sessions to return
 * @returns {Array<{id: string, startedAt: string, command: string|null, eventCount: number, summary: object|null}>}
 */
export function listSessions(limit = 20) {
  ensureDir();

  const files = readdirSync(SESSIONS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, limit);

  const sessions = [];
  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(SESSIONS_DIR, file), 'utf8'));
      sessions.push({
        id: data.id,
        startedAt: data.startedAt,
        endedAt: data.endedAt || null,
        command: data.command,
        eventCount: data.events ? data.events.length : 0,
        summary: data.summary,
      });
    } catch {
      // Skip corrupt files
    }
  }

  return sessions;
}

// Replay CLI — flight recorder playback for debugging sessions.
//
// Usage:
//   bugmon replay                    List recent sessions
//   bugmon replay <session-id>       Replay a session timeline
//   bugmon replay --last             Replay most recent session
//   bugmon replay <id> --step        Step through events one at a time
//   bugmon replay <id> --filter <kind>  Filter by event kind
//   bugmon replay <id> --stats       Show session statistics only

import { loadSession, listSessions } from './session-store.js';
import { BOLD, RESET, DIM, FG, color, bold, dim } from './colors.js';

// Event kind → display info
const EVENT_DISPLAY = {
  ErrorObserved: { icon: '!', label: 'Error observed', color: 'red' },
  BugClassified: { icon: '?', label: 'Bug classified', color: 'yellow' },
  ENCOUNTER_STARTED: { icon: '*', label: 'BugMon appeared', color: 'magenta' },
  MOVE_USED: { icon: '>', label: 'Move used', color: 'white' },
  DAMAGE_DEALT: { icon: '#', label: 'Damage dealt', color: 'red' },
  HEALING_APPLIED: { icon: '+', label: 'Healing applied', color: 'green' },
  PASSIVE_ACTIVATED: { icon: '~', label: 'Passive activated', color: 'cyan' },
  BUGMON_FAINTED: { icon: 'x', label: 'BugMon fainted', color: 'red' },
  BATTLE_ENDED: { icon: 'v', label: 'Battle ended', color: 'green' },
  TestCompleted: { icon: 'T', label: 'Test completed', color: 'green' },
  FileSaved: { icon: 'F', label: 'File modified', color: 'blue' },
  RunStarted: { icon: '>', label: 'Run started', color: 'cyan' },
  RunEnded: { icon: '<', label: 'Run ended', color: 'cyan' },
  PolicyDenied: { icon: '!', label: 'Policy denied', color: 'red' },
  InvariantViolation: { icon: '!', label: 'Invariant violation', color: 'red' },
};

const DEFAULT_DISPLAY = { icon: '.', label: 'Event', color: 'gray' };

/**
 * Main replay command handler.
 * @param {string[]} args - CLI arguments after "replay"
 */
export async function replay(args) {
  const wantsStep = args.includes('--step') || args.includes('-s');
  const wantsStats = args.includes('--stats');
  const wantsLast = args.includes('--last') || args.includes('-l');

  // Extract filter kind
  const filterIdx = args.indexOf('--filter');
  const filterKind = filterIdx !== -1 ? args[filterIdx + 1] : null;

  // Get session ID (first positional arg that isn't a flag)
  let sessionId = null;
  for (const arg of args) {
    if (!arg.startsWith('-') && arg !== filterKind) {
      sessionId = arg;
      break;
    }
  }

  // If --last, get the most recent session
  if (wantsLast && !sessionId) {
    const sessions = listSessions(1);
    if (sessions.length === 0) {
      process.stderr.write(
        '\n  No sessions recorded yet.\n  Run "bugmon watch -- <command>" to start recording.\n\n'
      );
      return;
    }
    sessionId = sessions[0].id;
  }

  // No session ID → list sessions
  if (!sessionId) {
    renderSessionList();
    return;
  }

  // Load the session
  const session = loadSession(sessionId);
  if (!session) {
    process.stderr.write(
      `\n  Session "${sessionId}" not found.\n  Run "bugmon replay" to list available sessions.\n\n`
    );
    return;
  }

  if (wantsStats) {
    renderSessionStats(session);
    return;
  }

  if (wantsStep) {
    await replayStepMode(session, filterKind);
    return;
  }

  replayTimeline(session, filterKind);
}

/**
 * Render the list of available sessions.
 */
function renderSessionList() {
  const sessions = listSessions(20);

  if (sessions.length === 0) {
    process.stderr.write(
      '\n  No sessions recorded yet.\n  Run "bugmon watch -- <command>" to start recording.\n\n'
    );
    return;
  }

  const lines = [];
  lines.push('');
  lines.push(bold(color('  Flight Recorder — Recent Sessions', 'cyan')));
  lines.push('');

  for (const s of sessions) {
    const date = new Date(s.startedAt).toLocaleString();
    const events = `${s.eventCount} events`;
    const cmd = s.command ? dim(` ${s.command}`) : '';
    const status = s.endedAt ? color('done', 'green') : color('active', 'yellow');

    // Summary line
    const bugs = s.summary?.bugsDefeated ?? 0;
    const bosses = s.summary?.bossesEncountered ?? 0;
    const summaryParts = [];
    if (bugs > 0) summaryParts.push(`${bugs} defeated`);
    if (bosses > 0) summaryParts.push(`${bosses} bosses`);
    const summaryStr = summaryParts.length > 0 ? dim(` (${summaryParts.join(', ')})`) : '';

    lines.push(`  ${bold(s.id)}  ${dim(date)}  ${events}${summaryStr}  [${status}]`);
    if (cmd) lines.push(`    ${cmd}`);
  }

  lines.push('');
  lines.push(dim('  Usage: bugmon replay <session-id>'));
  lines.push(dim('         bugmon replay <session-id> --step'));
  lines.push(dim('         bugmon replay --last'));
  lines.push('');
  process.stdout.write(lines.join('\n') + '\n');
}

/**
 * Render a session as a timeline.
 * @param {object} session
 * @param {string|null} filterKind
 */
function replayTimeline(session, filterKind) {
  let events = session.events || [];
  if (filterKind) {
    events = events.filter((e) => e.kind === filterKind);
  }

  if (events.length === 0) {
    process.stderr.write(
      `\n  Session "${session.id}" has no events${filterKind ? ` matching "${filterKind}"` : ''}.\n\n`
    );
    return;
  }

  const baseTime = new Date(session.startedAt).getTime();
  const lines = [];

  // Header
  lines.push('');
  lines.push(bold(color('  Flight Recorder — Session Replay', 'cyan')));
  lines.push(dim(`  Session: ${session.id}`));
  if (session.command) lines.push(dim(`  Command: ${session.command}`));
  lines.push(dim(`  Started: ${session.startedAt}`));
  lines.push('');
  lines.push(dim('  TIME     EVENT'));
  lines.push(dim('  ──────── ─────────────────────────────────────────'));

  for (const event of events) {
    const elapsed = formatElapsed(event.timestamp - baseTime);
    const display = EVENT_DISPLAY[event.kind] || DEFAULT_DISPLAY;
    const detail = getEventDetail(event);
    const warning = isWarningEvent(event) ? color(' !!', 'red') : '';

    lines.push(
      `  ${dim(elapsed)} ${color(display.icon, display.color)} ${bold(display.label)}${warning}`
    );
    if (detail) {
      lines.push(`           ${dim(detail)}`);
    }
  }

  // Footer summary
  lines.push('');
  lines.push(dim('  ──────── ─────────────────────────────────────────'));
  renderInlineSummary(lines, session, events);
  lines.push('');

  process.stdout.write(lines.join('\n') + '\n');
}

/**
 * Step through events one at a time (interactive).
 * @param {object} session
 * @param {string|null} filterKind
 */
async function replayStepMode(session, filterKind) {
  let events = session.events || [];
  if (filterKind) {
    events = events.filter((e) => e.kind === filterKind);
  }

  if (events.length === 0) {
    process.stderr.write(`\n  Session "${session.id}" has no events.\n\n`);
    return;
  }

  const baseTime = new Date(session.startedAt).getTime();

  process.stdout.write('\n');
  process.stdout.write(bold(color('  Flight Recorder — Step Mode\n', 'cyan')));
  process.stdout.write(dim(`  Session: ${session.id}  (${events.length} events)\n`));
  process.stdout.write(dim('  Press ENTER for next, q to quit\n'));
  process.stdout.write('\n');

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const elapsed = formatElapsed(event.timestamp - baseTime);
    const display = EVENT_DISPLAY[event.kind] || DEFAULT_DISPLAY;
    const detail = getEventDetail(event);
    const warning = isWarningEvent(event) ? color(' !!', 'red') : '';
    const progress = dim(`[${i + 1}/${events.length}]`);

    process.stdout.write(
      `  ${progress} ${dim(elapsed)} ${color(display.icon, display.color)} ${bold(display.label)}${warning}\n`
    );
    if (detail) {
      process.stdout.write(`           ${dim(detail)}\n`);
    }

    // Wait for user input (unless last event)
    if (i < events.length - 1) {
      const quit = await waitForKeypress();
      if (quit) {
        process.stdout.write(dim('\n  Replay stopped.\n\n'));
        return;
      }
    }
  }

  process.stdout.write(dim('\n  End of session.\n\n'));
}

/**
 * Render session statistics.
 * @param {object} session
 */
function renderSessionStats(session) {
  const events = session.events || [];
  const baseTime = new Date(session.startedAt).getTime();
  const duration =
    session.summary?.duration ||
    (events.length > 0 ? events[events.length - 1].timestamp - baseTime : 0);

  // Count events by kind
  const counts = {};
  for (const e of events) {
    counts[e.kind] = (counts[e.kind] || 0) + 1;
  }

  const errors = counts['ErrorObserved'] || 0;
  const encounters = counts['ENCOUNTER_STARTED'] || 0;
  const battles = counts['BATTLE_ENDED'] || 0;
  const victories = events.filter(
    (e) => e.kind === 'BATTLE_ENDED' && e.result === 'victory'
  ).length;

  const lines = [];
  lines.push('');
  lines.push(bold(color('  Flight Recorder — Session Stats', 'cyan')));
  lines.push(dim(`  Session: ${session.id}`));
  if (session.command) lines.push(dim(`  Command: ${session.command}`));
  lines.push('');
  lines.push(`  Duration:    ${bold(formatElapsed(duration))}`);
  lines.push(`  Events:      ${bold(String(events.length))}`);
  lines.push(`  Errors:      ${bold(color(String(errors), errors > 0 ? 'red' : 'green'))}`);
  lines.push(`  Encounters:  ${bold(String(encounters))}`);
  lines.push(`  Battles:     ${bold(String(battles))} (${victories} won)`);
  lines.push('');

  // Event breakdown
  if (Object.keys(counts).length > 0) {
    lines.push(dim('  Event breakdown:'));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    for (const [kind, count] of sorted) {
      const display = EVENT_DISPLAY[kind] || DEFAULT_DISPLAY;
      lines.push(`    ${color(display.icon, display.color)} ${display.label.padEnd(22)} ${count}`);
    }
  }

  // Boss encounters
  const bosses = events.filter((e) => e.isBoss);
  if (bosses.length > 0) {
    lines.push('');
    lines.push(bold(color('  Bosses encountered:', 'red')));
    for (const b of bosses) {
      lines.push(`    ${color('*', 'red')} ${b.boss?.name || b.enemy}`);
    }
  }

  lines.push('');
  process.stdout.write(lines.join('\n') + '\n');
}

// ── Helpers ──

/**
 * Format milliseconds as [MM:SS].
 * @param {number} ms
 * @returns {string}
 */
function formatElapsed(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}]`;
}

/**
 * Get a human-readable detail string for an event.
 * @param {object} event
 * @returns {string}
 */
function getEventDetail(event) {
  switch (event.kind) {
    case 'ErrorObserved':
      return event.message ? truncate(event.message, 60) : '';
    case 'ENCOUNTER_STARTED':
      if (event.isBoss) return `Boss: ${event.boss?.name || event.enemy}`;
      return event.monster
        ? `${event.monster.name} [${event.monster.type}] HP:${event.monster.hp}`
        : event.enemy;
    case 'BATTLE_ENDED':
      if (event.result === 'resolved') return `${event.monsterName || 'Bug'} resolved`;
      return event.result;
    case 'MOVE_USED':
      return `${event.attacker} used ${event.move}`;
    case 'DAMAGE_DEALT':
      return `${event.amount} damage to ${event.target}`;
    case 'BUGMON_FAINTED':
      return event.bugmon;
    case 'TestCompleted':
      return `${event.result}${event.suite ? ` (${event.suite})` : ''}`;
    case 'FileSaved':
      return event.file;
    case 'PolicyDenied':
      return `${event.policy}: ${event.reason}`;
    case 'InvariantViolation':
      return `${event.invariant}: expected ${event.expected}, got ${event.actual}`;
    default:
      return '';
  }
}

/**
 * Check if an event represents a warning/failure.
 * @param {object} event
 * @returns {boolean}
 */
function isWarningEvent(event) {
  return (
    event.kind === 'ErrorObserved' ||
    event.kind === 'PolicyDenied' ||
    event.kind === 'InvariantViolation' ||
    (event.kind === 'TestCompleted' && event.result === 'fail') ||
    event.kind === 'BUGMON_FAINTED'
  );
}

/**
 * Render inline summary at the end of a timeline.
 * @param {string[]} lines
 * @param {object} session
 * @param {object[]} events
 */
function renderInlineSummary(lines, session, events) {
  const errors = events.filter((e) => e.kind === 'ErrorObserved').length;
  const encounters = events.filter((e) => e.kind === 'ENCOUNTER_STARTED').length;
  const resolved = events.filter(
    (e) => e.kind === 'BATTLE_ENDED' && (e.result === 'victory' || e.result === 'resolved')
  ).length;

  const parts = [];
  parts.push(`${events.length} events`);
  if (errors > 0) parts.push(color(`${errors} errors`, 'red'));
  if (encounters > 0) parts.push(`${encounters} encounters`);
  if (resolved > 0) parts.push(color(`${resolved} defeated`, 'green'));
  lines.push(`  ${parts.join('  |  ')}`);
}

/**
 * Truncate a string to a max length.
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

/**
 * Wait for a keypress. Returns true if user wants to quit.
 * @returns {Promise<boolean>}
 */
function waitForKeypress() {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }
    stdin.resume();

    const onData = (key) => {
      stdin.removeListener('data', onData);
      if (stdin.isTTY && !wasRaw) {
        stdin.setRawMode(false);
      }
      stdin.pause();

      // q or Ctrl+C to quit
      if (key[0] === 0x71 || key[0] === 0x03) {
        resolve(true);
      } else {
        resolve(false);
      }
    };

    stdin.on('data', onData);
  });
}

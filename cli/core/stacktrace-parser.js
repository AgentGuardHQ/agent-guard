// Stacktrace parser — extracts file, line, column from Node.js stack traces

// Matches: "    at functionName (/path/to/file.js:42:15)"
// Matches: "    at /path/to/file.js:42:15"
// Matches: "    at Object.<anonymous> (file.js:42:15)"
const STACK_LINE_RE = /^\s*at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/;

// Matches: "/path/to/file.ts(42,15): error TS1234: ..."
const TSC_RE = /^(.+?)\((\d+),(\d+)\):\s*error/;

// Matches: "file.js:42"
const SIMPLE_LOCATION_RE = /^(.+?):(\d+)(?::(\d+))?$/;

/**
 * Parse stack trace lines and extract structured frames.
 * Filters out node internals and node_modules to surface user code.
 * @param {string[]} lines - Raw lines from error output
 * @returns {Array<{file: string, line: number, column: number, fn: string|null}>}
 */
export function parseStackTrace(lines) {
  const frames = [];

  for (const raw of lines) {
    const line = raw.trim();

    // Standard Node.js "at" frames
    const atMatch = line.match(STACK_LINE_RE);
    if (atMatch) {
      const file = atMatch[2];
      if (isInternalFrame(file)) continue;
      frames.push({
        file: atMatch[2],
        line: parseInt(atMatch[3], 10),
        column: parseInt(atMatch[4], 10),
        fn: atMatch[1] || null,
      });
      continue;
    }

    // TSC-style errors
    const tscMatch = line.match(TSC_RE);
    if (tscMatch) {
      frames.push({
        file: tscMatch[1],
        line: parseInt(tscMatch[2], 10),
        column: parseInt(tscMatch[3], 10),
        fn: null,
      });
      continue;
    }
  }

  return frames;
}

/**
 * Get the most relevant user-code frame from parsed stack frames.
 * @param {Array<{file: string, line: number, column: number, fn: string|null}>} frames
 * @returns {{file: string, line: number, column: number, fn: string|null} | null}
 */
export function getUserFrame(frames) {
  return frames.find(f => !isInternalFrame(f.file)) || frames[0] || null;
}

/**
 * Try to extract a file location from an error message line.
 * @param {string} text
 * @returns {{file: string, line: number, column: number|null} | null}
 */
export function extractLocation(text) {
  const match = text.match(SIMPLE_LOCATION_RE);
  if (match && !isInternalFrame(match[1])) {
    return {
      file: match[1],
      line: parseInt(match[2], 10),
      column: match[3] ? parseInt(match[3], 10) : null,
    };
  }
  return null;
}

function isInternalFrame(file) {
  return (
    file.startsWith('node:') ||
    file.startsWith('internal/') ||
    file.includes('node_modules') ||
    file.startsWith('<anonymous>')
  );
}

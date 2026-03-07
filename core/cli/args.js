/**
 * Lightweight CLI argument parser — zero dependencies.
 *
 * Usage:
 *   const { flags, positional } = parseArgs(process.argv.slice(2), {
 *     boolean: ['--force', '-f', '--all'],
 *     string: ['--output', '-o'],
 *     alias: { '-f': '--force', '-o': '--output' },
 *     stopAt: '--',
 *   });
 */

/**
 * Parse CLI arguments into flags and positional args.
 * @param {string[]} argv - Raw argument array (e.g. process.argv.slice(2))
 * @param {object} spec - Argument specification
 * @param {string[]} [spec.boolean] - Flags that are boolean (no value)
 * @param {string[]} [spec.string] - Flags that expect a string value
 * @param {object} [spec.alias] - Short → long flag mapping
 * @param {string} [spec.stopAt] - Stop parsing at this token (e.g. '--')
 * @returns {{ flags: object, positional: string[], rest: string[] }}
 */
export function parseArgs(argv, spec = {}) {
  const booleans = new Set(spec.boolean || []);
  const strings = new Set(spec.string || []);
  const alias = spec.alias || {};
  const stopAt = spec.stopAt || null;

  const flags = {};
  const positional = [];
  let rest = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    // Stop parsing at delimiter
    if (stopAt && arg === stopAt) {
      rest = argv.slice(i + 1);
      break;
    }

    // Resolve alias
    const resolved = alias[arg] || arg;

    if (booleans.has(resolved) || booleans.has(arg)) {
      flags[resolved.replace(/^-+/, '')] = true;
    } else if (strings.has(resolved) || strings.has(arg)) {
      const key = resolved.replace(/^-+/, '');
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        flags[key] = null;
      } else {
        flags[key] = value;
        i++; // consume next arg
      }
    } else if (arg.startsWith('-')) {
      // Unknown flag — treat as boolean
      flags[arg.replace(/^-+/, '')] = true;
    } else {
      positional.push(arg);
    }
  }

  return { flags, positional, rest };
}

/**
 * Format a command's help text from a spec object.
 * @param {object} cmd
 * @param {string} cmd.name - Command name (e.g. 'watch')
 * @param {string} cmd.description - One-line description
 * @param {string} cmd.usage - Usage pattern (e.g. 'bugmon watch [flags] -- <command>')
 * @param {Array<{flag: string, description: string}>} [cmd.flags] - Flag documentation
 * @param {string[]} [cmd.examples] - Example usage lines
 * @returns {string}
 */
export function formatHelp(cmd) {
  const lines = [];
  lines.push(`  \x1b[1m${cmd.name}\x1b[0m — ${cmd.description}`);
  lines.push('');
  lines.push(`  \x1b[1mUsage:\x1b[0m  ${cmd.usage}`);

  if (cmd.flags && cmd.flags.length > 0) {
    lines.push('');
    lines.push('  \x1b[1mFlags:\x1b[0m');
    const maxLen = Math.max(...cmd.flags.map((f) => f.flag.length));
    for (const f of cmd.flags) {
      lines.push(`    ${f.flag.padEnd(maxLen + 2)} ${f.description}`);
    }
  }

  if (cmd.examples && cmd.examples.length > 0) {
    lines.push('');
    lines.push('  \x1b[1mExamples:\x1b[0m');
    for (const ex of cmd.examples) {
      lines.push(`    ${ex}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

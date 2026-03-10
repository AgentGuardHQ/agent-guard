// CLI command: agentguard analytics — cross-session violation pattern analysis.

import { analyze } from '../../analytics/engine.js';
import { toMarkdown, toJson, toTerminal } from '../../analytics/reporter.js';

export async function analytics(args: string[]): Promise<number> {
  const format = parseFormat(args);
  const baseDir = parseBaseDir(args);
  const minClusterSize = parseMinCluster(args);

  const report = analyze({ baseDir, minClusterSize });

  if (report.totalViolations === 0) {
    process.stderr.write('\n  No violations found across recorded sessions.\n');
    process.stderr.write('  Run governance sessions first to generate violation data.\n\n');
    return 0;
  }

  switch (format) {
    case 'json':
      process.stdout.write(toJson(report) + '\n');
      break;
    case 'markdown':
      process.stdout.write(toMarkdown(report) + '\n');
      break;
    case 'terminal':
    default:
      process.stderr.write(toTerminal(report));
      break;
  }

  return 0;
}

function parseFormat(args: string[]): 'json' | 'markdown' | 'terminal' {
  const idx = args.findIndex((a) => a === '--format' || a === '-f');
  if (idx !== -1 && args[idx + 1]) {
    const fmt = args[idx + 1];
    if (fmt === 'json' || fmt === 'markdown' || fmt === 'terminal') return fmt;
  }
  if (args.includes('--json')) return 'json';
  if (args.includes('--markdown') || args.includes('--md')) return 'markdown';
  return 'terminal';
}

function parseBaseDir(args: string[]): string | undefined {
  const idx = args.findIndex((a) => a === '--dir' || a === '-d');
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return undefined;
}

function parseMinCluster(args: string[]): number | undefined {
  const idx = args.findIndex((a) => a === '--min-cluster');
  if (idx !== -1 && args[idx + 1]) {
    const n = parseInt(args[idx + 1], 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return undefined;
}

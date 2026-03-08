/**
 * trace command — Trace the causal chain of an execution event.
 *
 * Walks the causedBy references back to the root cause,
 * showing the full causal chain that led to a failure.
 */

import type { Command } from 'commander';
import pino from 'pino';
import { createExecutionEventLog } from '../../domain/execution-log/event-log.js';

export function registerTraceCommand(program: Command): void {
  program
    .command('trace')
    .description('Trace the causal chain of an execution event back to its root cause')
    .argument('<eventId>', 'The event ID to trace')
    .option('-l, --log-file <file>', 'NDJSON event log file', '.events.ndjson')
    .action(async (eventId: string, options: { logFile: string }) => {
      const logger = pino({ name: 'bugmon-trace' });
      const fs = await import('node:fs');

      if (!fs.existsSync(options.logFile)) {
        logger.error({ file: options.logFile }, 'Event log file not found');
        console.error(`Event log file not found: ${options.logFile}`);
        return;
      }

      const log = createExecutionEventLog();
      const ndjson = fs.readFileSync(options.logFile, 'utf-8');
      log.fromNDJSON(ndjson);

      const chain = log.trace(eventId);

      if (chain.length === 0) {
        console.error(`Event not found: ${eventId}`);
        return;
      }

      console.log(`\nCausal chain for ${eventId} (${chain.length} events):\n`);
      console.log('Root cause:');

      for (let i = 0; i < chain.length; i++) {
        const event = chain[i];
        const time = new Date(event.timestamp).toISOString();
        const ctx = event.context.file ? ` (${event.context.file})` : '';
        const prefix = i === 0 ? '  [ROOT] ' : `  ${'  '.repeat(i)}-> `;
        const label = i === chain.length - 1 ? ' [TARGET]' : '';

        console.log(
          `${prefix}[${time}] ${event.actor}/${event.source} ${event.kind}${ctx}${label}`
        );
        console.log(`${' '.repeat(prefix.length)}id: ${event.id}`);

        if (Object.keys(event.payload).length > 0) {
          const payloadStr = JSON.stringify(event.payload);
          const truncated = payloadStr.length > 100 ? payloadStr.slice(0, 97) + '...' : payloadStr;
          console.log(`${' '.repeat(prefix.length)}payload: ${truncated}`);
        }
      }

      console.log(`\nRoot cause: ${chain[0].kind} by ${chain[0].actor} via ${chain[0].source}`);
      if (chain[0].context.file) {
        console.log(`File: ${chain[0].context.file}`);
      }
    });
}

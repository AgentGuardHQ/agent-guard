/**
 * score command — Score an agent run by its risk profile.
 *
 * Analyzes execution events for an agent run and produces
 * a risk score based on failures, violations, and sensitive edits.
 */

import type { Command } from 'commander';
import pino from 'pino';
import { createExecutionEventLog } from '../../domain/execution-log/event-log.js';
import { scoreAgentRun, clusterFailures } from '../../domain/execution-log/event-projections.js';

export function registerScoreCommand(program: Command): void {
  program
    .command('score')
    .description('Score an agent run by its risk profile')
    .argument('<agentRunId>', 'The agent run ID to score')
    .option('-l, --log-file <file>', 'NDJSON event log file', '.events.ndjson')
    .option('--clusters', 'Also show failure clusters')
    .action(async (agentRunId: string, options: { logFile: string; clusters?: boolean }) => {
      const logger = pino({ name: 'bugmon-score' });
      const fs = await import('node:fs');

      if (!fs.existsSync(options.logFile)) {
        logger.error({ file: options.logFile }, 'Event log file not found');
        console.error(`Event log file not found: ${options.logFile}`);
        return;
      }

      const log = createExecutionEventLog();
      const ndjson = fs.readFileSync(options.logFile, 'utf-8');
      log.fromNDJSON(ndjson);

      const risk = scoreAgentRun(log, agentRunId);

      const levelColors: Record<string, string> = {
        low: '\x1b[32m',
        medium: '\x1b[33m',
        high: '\x1b[31m',
        critical: '\x1b[35m',
      };
      const reset = '\x1b[0m';
      const color = levelColors[risk.level] ?? '';

      console.log(`\nAgent Run Risk Score: ${agentRunId}\n`);
      console.log(`  Score: ${color}${risk.score}${reset}`);
      console.log(`  Level: ${color}${risk.level.toUpperCase()}${reset}`);
      console.log(`  Events: ${risk.eventCount}`);
      console.log(`  Failures: ${risk.failureCount}`);
      console.log(`  Violations: ${risk.violationCount}`);

      if (risk.factors.length > 0) {
        console.log('\n  Risk Factors:');
        for (const factor of risk.factors) {
          console.log(`    - ${factor.name} (+${factor.weight}): ${factor.detail}`);
        }
      }

      if (options.clusters) {
        const clusters = clusterFailures(log);
        if (clusters.length > 0) {
          console.log(`\n  Failure Clusters (${clusters.length}):`);
          for (const cluster of clusters) {
            const file = cluster.commonFile ? ` in ${cluster.commonFile}` : '';
            console.log(
              `    - ${cluster.events.length} failures${file} (severity: ${cluster.severity})`
            );
          }
        }
      }

      console.log();
    });
}

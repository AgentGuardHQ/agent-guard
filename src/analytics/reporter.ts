// Report generation — formats analytics results as markdown, JSON, or terminal output.

import type { AnalyticsReport, ViolationCluster, ViolationTrend } from './types.js';

/** Format a timestamp as an ISO date string */
function formatDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** Trend direction indicator */
function trendIndicator(direction: string): string {
  switch (direction) {
    case 'increasing':
      return '\u2191'; // ↑
    case 'decreasing':
      return '\u2193'; // ↓
    case 'new':
      return '\u2605'; // ★
    case 'resolved':
      return '\u2713'; // ✓
    default:
      return '\u2192'; // →
  }
}

/** Generate a markdown report */
export function toMarkdown(report: AnalyticsReport): string {
  const lines: string[] = [];

  lines.push('# Violation Pattern Analysis');
  lines.push('');
  lines.push(`Generated: ${new Date(report.generatedAt).toISOString()}`);
  lines.push(`Sessions analyzed: ${report.sessionsAnalyzed}`);
  lines.push(`Total violations: ${report.totalViolations}`);
  lines.push('');

  // Violations by kind
  lines.push('## Violations by Kind');
  lines.push('');
  lines.push('| Kind | Count |');
  lines.push('|------|-------|');
  for (const [kind, count] of Object.entries(report.violationsByKind)) {
    lines.push(`| ${kind} | ${count} |`);
  }
  lines.push('');

  // Clusters
  if (report.clusters.length > 0) {
    lines.push('## Violation Clusters');
    lines.push('');
    for (const cluster of report.clusters.slice(0, 20)) {
      lines.push(`### ${cluster.label}`);
      lines.push('');
      lines.push(`- **Count**: ${cluster.count}`);
      lines.push(`- **Sessions**: ${cluster.sessionCount}`);
      lines.push(`- **First seen**: ${formatDate(cluster.firstSeen)}`);
      lines.push(`- **Last seen**: ${formatDate(cluster.lastSeen)}`);
      if (cluster.inferredCause) {
        lines.push(`- **Likely cause**: ${cluster.inferredCause}`);
      }
      lines.push('');
    }
  }

  // Trends
  if (report.trends.length > 0) {
    lines.push('## Trends');
    lines.push('');
    lines.push('| Pattern | Direction | Recent | Previous | Change |');
    lines.push('|---------|-----------|--------|----------|--------|');
    for (const trend of report.trends.slice(0, 20)) {
      const dir = `${trendIndicator(trend.direction)} ${trend.direction}`;
      const change =
        trend.changePercent > 0 ? `+${trend.changePercent}%` : `${trend.changePercent}%`;
      lines.push(
        `| ${trend.key} (${trend.dimension}) | ${dir} | ${trend.recentCount} | ${trend.previousCount} | ${change} |`
      );
    }
    lines.push('');
  }

  // Inferred causes
  if (report.topInferredCauses.length > 0) {
    lines.push('## Top Inferred Causes');
    lines.push('');
    for (const { cause, count } of report.topInferredCauses) {
      lines.push(`- **${count}x**: ${cause}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Generate a JSON report */
export function toJson(report: AnalyticsReport): string {
  return JSON.stringify(report, null, 2);
}

/** Format a cluster for terminal display */
function formatClusterForTerminal(cluster: ViolationCluster, index: number): string {
  const lines: string[] = [];
  const num = `${index + 1}.`.padStart(4);
  lines.push(
    `  ${num} ${cluster.label} (${cluster.count} violations, ${cluster.sessionCount} session(s))`
  );
  lines.push(
    `       First: ${formatDate(cluster.firstSeen)}  Last: ${formatDate(cluster.lastSeen)}`
  );
  if (cluster.inferredCause) {
    lines.push(`       Cause: ${cluster.inferredCause}`);
  }
  return lines.join('\n');
}

/** Format a trend for terminal display */
function formatTrendForTerminal(trend: ViolationTrend): string {
  const dir = trendIndicator(trend.direction);
  const change = trend.changePercent > 0 ? `+${trend.changePercent}%` : `${trend.changePercent}%`;
  return `  ${dir} ${trend.key} (${trend.dimension}): ${trend.recentCount} recent / ${trend.previousCount} previous (${change})`;
}

/** Generate terminal output (no ANSI codes for portability) */
export function toTerminal(report: AnalyticsReport): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('  Violation Pattern Analysis');
  lines.push(`  ${'─'.repeat(50)}`);
  lines.push(`  Sessions: ${report.sessionsAnalyzed}  Violations: ${report.totalViolations}`);
  lines.push('');

  // By kind
  if (Object.keys(report.violationsByKind).length > 0) {
    lines.push('  Violations by Kind');
    for (const [kind, count] of Object.entries(report.violationsByKind)) {
      lines.push(`    ${kind}: ${count}`);
    }
    lines.push('');
  }

  // Clusters
  if (report.clusters.length > 0) {
    lines.push(`  Clusters (${report.clusters.length} found)`);
    lines.push(`  ${'─'.repeat(50)}`);
    for (let i = 0; i < Math.min(report.clusters.length, 10); i++) {
      lines.push(formatClusterForTerminal(report.clusters[i], i));
    }
    if (report.clusters.length > 10) {
      lines.push(`  ... and ${report.clusters.length - 10} more`);
    }
    lines.push('');
  }

  // Trends
  if (report.trends.length > 0) {
    lines.push('  Trends');
    lines.push(`  ${'─'.repeat(50)}`);
    for (const trend of report.trends.slice(0, 10)) {
      lines.push(formatTrendForTerminal(trend));
    }
    lines.push('');
  }

  // Inferred causes
  if (report.topInferredCauses.length > 0) {
    lines.push('  Top Inferred Causes');
    lines.push(`  ${'─'.repeat(50)}`);
    for (const { cause, count } of report.topInferredCauses.slice(0, 5)) {
      lines.push(`    [${count}x] ${cause}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

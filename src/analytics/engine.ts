// Analytics engine — orchestrates aggregation, clustering, trend analysis,
// and report generation for cross-session violation pattern detection.

import { aggregateViolations } from './aggregator.js';
import { clusterViolations } from './cluster.js';
import { computeAllTrends } from './trends.js';
import type { AnalyticsReport, AnalyticsOptions } from './types.js';

const DEFAULT_MIN_CLUSTER_SIZE = 2;
const DEFAULT_TREND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Run the full analytics pipeline and produce a report */
export function analyze(options: AnalyticsOptions = {}): AnalyticsReport {
  const baseDir = options.baseDir ?? '.agentguard';
  const minClusterSize = options.minClusterSize ?? DEFAULT_MIN_CLUSTER_SIZE;
  const trendWindowMs = options.trendWindowMs ?? DEFAULT_TREND_WINDOW_MS;

  // 1. Aggregate violations from all sessions
  const { violations, sessionCount } = aggregateViolations(baseDir);

  // 2. Count by kind
  const violationsByKind: Record<string, number> = {};
  for (const v of violations) {
    violationsByKind[v.kind] = (violationsByKind[v.kind] ?? 0) + 1;
  }

  // 3. Cluster violations
  const clusters = clusterViolations(violations, minClusterSize);

  // 4. Compute trends
  const trends = computeAllTrends(violations, trendWindowMs);

  // 5. Collect inferred causes
  const causeCounts = new Map<string, number>();
  for (const cluster of clusters) {
    if (cluster.inferredCause) {
      causeCounts.set(cluster.inferredCause, (causeCounts.get(cluster.inferredCause) ?? 0) + 1);
    }
  }

  const topInferredCauses = [...causeCounts.entries()]
    .map(([cause, count]) => ({ cause, count }))
    .sort((a, b) => b.count - a.count);

  return {
    generatedAt: Date.now(),
    sessionsAnalyzed: sessionCount,
    totalViolations: violations.length,
    violationsByKind,
    clusters,
    trends,
    topInferredCauses,
  };
}

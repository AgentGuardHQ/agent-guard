// Trend identification — detects increasing/decreasing violation patterns
// by comparing recent vs previous time windows.

import type { ViolationRecord, ViolationTrend, ClusterDimension, TrendDirection } from './types.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_MS = 7 * ONE_DAY_MS; // 7-day windows

/** Split violations into two time windows: recent and previous */
function splitByWindow(
  violations: readonly ViolationRecord[],
  windowMs: number
): { recent: ViolationRecord[]; previous: ViolationRecord[] } {
  if (violations.length === 0) return { recent: [], previous: [] };

  const now = Math.max(...violations.map((v) => v.timestamp));
  const recentStart = now - windowMs;
  const previousStart = recentStart - windowMs;

  const recent = violations.filter((v) => v.timestamp >= recentStart);
  const previous = violations.filter(
    (v) => v.timestamp >= previousStart && v.timestamp < recentStart
  );

  return { recent, previous };
}

/** Count violations by a dimension key */
function countByKey(
  violations: readonly ViolationRecord[],
  dimension: ClusterDimension
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const v of violations) {
    let key: string | undefined;
    switch (dimension) {
      case 'actionType':
        key = v.actionType;
        break;
      case 'target':
        key = v.target;
        break;
      case 'invariant':
        key = v.invariantId;
        break;
      case 'kind':
        key = v.kind;
        break;
      case 'reason':
        key = v.reason;
        break;
    }

    if (key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return counts;
}

/** Determine trend direction from counts */
function determineTrend(recentCount: number, previousCount: number): TrendDirection {
  if (previousCount === 0 && recentCount > 0) return 'new';
  if (recentCount === 0 && previousCount > 0) return 'resolved';
  if (previousCount === 0 && recentCount === 0) return 'stable';

  const changePercent = ((recentCount - previousCount) / previousCount) * 100;

  if (changePercent > 20) return 'increasing';
  if (changePercent < -20) return 'decreasing';
  return 'stable';
}

/** Compute trends for a single dimension */
export function computeTrends(
  violations: readonly ViolationRecord[],
  dimension: ClusterDimension,
  windowMs = DEFAULT_WINDOW_MS
): ViolationTrend[] {
  const { recent, previous } = splitByWindow(violations, windowMs);
  const recentCounts = countByKey(recent, dimension);
  const previousCounts = countByKey(previous, dimension);

  const allKeys = new Set([...recentCounts.keys(), ...previousCounts.keys()]);
  const trends: ViolationTrend[] = [];

  for (const key of allKeys) {
    const recentCount = recentCounts.get(key) ?? 0;
    const previousCount = previousCounts.get(key) ?? 0;
    const direction = determineTrend(recentCount, previousCount);

    if (direction === 'stable' && recentCount === 0) continue;

    const changePercent =
      previousCount === 0
        ? recentCount > 0
          ? 100
          : 0
        : Math.round(((recentCount - previousCount) / previousCount) * 100);

    trends.push({
      key,
      dimension,
      direction,
      recentCount,
      previousCount,
      changePercent,
    });
  }

  return trends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

/** Compute trends across all dimensions */
export function computeAllTrends(
  violations: readonly ViolationRecord[],
  windowMs = DEFAULT_WINDOW_MS
): ViolationTrend[] {
  const dimensions: ClusterDimension[] = ['invariant', 'actionType', 'kind'];
  const allTrends: ViolationTrend[] = [];

  for (const dim of dimensions) {
    allTrends.push(...computeTrends(violations, dim, windowMs));
  }

  return allTrends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

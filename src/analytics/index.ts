// Analytics module re-exports

export { analyze } from './engine.js';
export { aggregateViolations, listSessionIds, loadSessionEvents } from './aggregator.js';
export { clusterViolations, clusterByDimension } from './cluster.js';
export { computeAllTrends, computeTrends } from './trends.js';
export { toMarkdown, toJson, toTerminal } from './reporter.js';
export type {
  ViolationRecord,
  ViolationCluster,
  ViolationTrend,
  AnalyticsReport,
  AnalyticsOptions,
  ClusterDimension,
  TrendDirection,
  TimeBucket,
} from './types.js';

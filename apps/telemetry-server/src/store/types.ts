// TelemetryStore interface — storage abstraction for ingested telemetry data.

import type { DomainEvent, GovernanceDecisionRecord } from '@red-codes/core';
import type { TraceSpan } from '@red-codes/telemetry';

export interface QueryFilter {
  readonly runId?: string;
  readonly since?: string; // ISO 8601
  readonly until?: string; // ISO 8601
  readonly limit?: number; // default 100
  readonly offset?: number; // default 0
}

export interface EventQueryFilter extends QueryFilter {
  readonly kind?: string;
}

export interface DecisionQueryFilter extends QueryFilter {
  readonly outcome?: 'allow' | 'deny';
}

export interface TraceQueryFilter extends QueryFilter {
  readonly kind?: string;
}

export interface QueryResult<T> {
  readonly data: T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export interface TelemetryStore {
  appendEvents(runId: string, events: DomainEvent[]): void;
  appendDecisions(runId: string, decisions: GovernanceDecisionRecord[]): void;
  appendTraces(traces: TraceSpan[]): void;

  queryEvents(filter: EventQueryFilter): QueryResult<DomainEvent>;
  queryDecisions(filter: DecisionQueryFilter): QueryResult<GovernanceDecisionRecord>;
  queryTraces(filter: TraceQueryFilter): QueryResult<TraceSpan>;
}

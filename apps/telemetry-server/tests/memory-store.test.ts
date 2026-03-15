import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryStore } from '../src/store/memory-store.js';
import type { TelemetryDataStore } from '../src/store/types.js';
import type { DomainEvent, GovernanceDecisionRecord } from '@red-codes/core';

function makeEvent(kind: string, ts?: number): DomainEvent {
  return {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    kind,
    timestamp: ts ?? Date.now(),
    fingerprint: 'fp-test',
  } as DomainEvent;
}

function makeDecision(outcome: 'allow' | 'deny', ts?: number): GovernanceDecisionRecord {
  return {
    recordId: `dec-${Math.random().toString(36).slice(2)}`,
    outcome,
    timestamp: ts ?? Date.now(),
    action: { type: 'file.write', target: '/tmp/test' },
    reason: 'test reason',
    policy: { matchedPolicyId: null, matchedPolicyName: null },
    invariants: { violations: [] },
    execution: { executed: false, success: false, durationMs: 0 },
  } as GovernanceDecisionRecord;
}

describe('createMemoryStore', () => {
  let store: TelemetryDataStore;

  beforeEach(() => {
    store = createMemoryStore();
  });

  describe('appendEvents / queryEvents', () => {
    it('stores and retrieves events', async () => {
      const events = [makeEvent('ActionAllowed'), makeEvent('ActionDenied')];
      await store.appendEvents('run-1', events);

      const result = await store.queryEvents({});
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('filters events by runId', async () => {
      await store.appendEvents('run-1', [makeEvent('A')]);
      await store.appendEvents('run-2', [makeEvent('B')]);

      const result = await store.queryEvents({ runId: 'run-1' });
      expect(result.total).toBe(1);
      expect(result.data[0].kind).toBe('A');
    });

    it('filters events by kind', async () => {
      await store.appendEvents('run-1', [makeEvent('ActionAllowed'), makeEvent('ActionDenied')]);

      const result = await store.queryEvents({ kind: 'ActionDenied' });
      expect(result.total).toBe(1);
      expect(result.data[0].kind).toBe('ActionDenied');
    });

    it('filters events by time range', async () => {
      const early = makeEvent('A', new Date('2024-01-01').getTime());
      const late = makeEvent('B', new Date('2024-06-01').getTime());
      await store.appendEvents('run-1', [early, late]);

      const result = await store.queryEvents({
        since: '2024-03-01T00:00:00Z',
        until: '2024-12-31T00:00:00Z',
      });
      expect(result.total).toBe(1);
      expect(result.data[0].kind).toBe('B');
    });

    it('supports pagination with limit and offset', async () => {
      const events = Array.from({ length: 5 }, (_, i) => makeEvent(`E${i}`));
      await store.appendEvents('run-1', events);

      const page1 = await store.queryEvents({ limit: 2, offset: 0 });
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page2 = await store.queryEvents({ limit: 2, offset: 2 });
      expect(page2.data).toHaveLength(2);
      expect(page2.offset).toBe(2);
    });

    it('clamps limit to MAX_LIMIT', async () => {
      const result = await store.queryEvents({ limit: 5000 });
      expect(result.limit).toBeLessThanOrEqual(1000);
    });
  });

  describe('appendDecisions / queryDecisions', () => {
    it('stores and retrieves decisions', async () => {
      await store.appendDecisions('run-1', [makeDecision('allow'), makeDecision('deny')]);

      const result = await store.queryDecisions({});
      expect(result.total).toBe(2);
    });

    it('filters decisions by outcome', async () => {
      await store.appendDecisions('run-1', [makeDecision('allow'), makeDecision('deny')]);

      const result = await store.queryDecisions({ outcome: 'deny' });
      expect(result.total).toBe(1);
      expect(result.data[0].outcome).toBe('deny');
    });

    it('filters decisions by runId', async () => {
      await store.appendDecisions('run-1', [makeDecision('allow')]);
      await store.appendDecisions('run-2', [makeDecision('deny')]);

      const result = await store.queryDecisions({ runId: 'run-2' });
      expect(result.total).toBe(1);
      expect(result.data[0].outcome).toBe('deny');
    });
  });

  describe('appendTraces / queryTraces', () => {
    it('stores and retrieves traces', async () => {
      const span = {
        kind: 'policy-eval',
        startTime: Date.now(),
        endTime: Date.now() + 10,
        attributes: { runId: 'run-1' },
      };
      await store.appendTraces([span as never]);

      const result = await store.queryTraces({});
      expect(result.total).toBe(1);
    });

    it('filters traces by runId', async () => {
      const span1 = {
        kind: 'policy-eval',
        startTime: Date.now(),
        endTime: Date.now() + 10,
        attributes: { runId: 'run-1' },
      };
      const span2 = {
        kind: 'policy-eval',
        startTime: Date.now(),
        endTime: Date.now() + 10,
        attributes: { runId: 'run-2' },
      };
      await store.appendTraces([span1 as never, span2 as never]);

      const result = await store.queryTraces({ runId: 'run-1' });
      expect(result.total).toBe(1);
    });
  });

  describe('enrollment', () => {
    it('creates and finds install by id', async () => {
      const record = {
        install_id: 'inst-1',
        public_key: 'pk-1',
        token_hash: 'hash-1',
        version: '1.0.0',
        enrolled_at: new Date().toISOString(),
      };

      await store.createInstall(record);
      const found = await store.findInstallById('inst-1');
      expect(found).toEqual(record);
    });

    it('finds install by token hash', async () => {
      const record = {
        install_id: 'inst-2',
        public_key: 'pk-2',
        token_hash: 'hash-2',
        version: '1.0.0',
        enrolled_at: new Date().toISOString(),
      };

      await store.createInstall(record);
      const found = await store.findInstallByTokenHash('hash-2');
      expect(found).toEqual(record);
    });

    it('returns null for unknown install', async () => {
      const found = await store.findInstallById('nonexistent');
      expect(found).toBeNull();
    });

    it('upserts on duplicate install_id', async () => {
      const record1 = {
        install_id: 'inst-1',
        public_key: 'pk-1',
        token_hash: 'hash-1',
        version: '1.0.0',
        enrolled_at: new Date().toISOString(),
      };
      const record2 = {
        install_id: 'inst-1',
        public_key: 'pk-updated',
        token_hash: 'hash-updated',
        version: '2.0.0',
        enrolled_at: new Date().toISOString(),
      };

      await store.createInstall(record1);
      await store.createInstall(record2);
      const found = await store.findInstallById('inst-1');
      expect(found?.version).toBe('2.0.0');
      expect(found?.public_key).toBe('pk-updated');
    });
  });

  describe('telemetry payloads', () => {
    it('appends and queries payloads', async () => {
      const payloads = [
        {
          event_id: 'e1',
          install_id: 'inst-1',
          event_json: '{}',
          received_at: new Date().toISOString(),
        },
      ];

      await store.appendTelemetryPayloads(payloads);
      const result = await store.queryTelemetryPayloads({});
      expect(result.total).toBe(1);
      expect(result.data[0].event_id).toBe('e1');
    });
  });

  describe('eviction', () => {
    it('evicts oldest entries when exceeding maxSize', async () => {
      const store = createMemoryStore(3);
      const events = Array.from({ length: 5 }, (_, i) => makeEvent(`E${i}`));
      await store.appendEvents('run-1', events);

      const result = await store.queryEvents({});
      expect(result.total).toBe(3);
      // Oldest events (E0, E1) should be evicted
      expect(result.data[0].kind).toBe('E2');
    });
  });
});

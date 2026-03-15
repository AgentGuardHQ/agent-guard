import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { healthRoutes } from '../src/routes/health.js';
import { eventRoutes } from '../src/routes/events.js';
import { decisionRoutes } from '../src/routes/decisions.js';
import { traceRoutes } from '../src/routes/traces.js';
import { ingestRoutes } from '../src/routes/ingest.js';
import { createMemoryStore } from '../src/store/memory-store.js';
import type { TelemetryDataStore } from '../src/store/types.js';

function makeEvent(kind: string, ts?: number) {
  return {
    id: `evt-${Math.random().toString(36).slice(2)}`,
    kind,
    timestamp: ts ?? Date.now(),
    fingerprint: 'fp-test',
  };
}

function makeDecision(outcome: 'allow' | 'deny') {
  return {
    recordId: `dec-${Math.random().toString(36).slice(2)}`,
    outcome,
    timestamp: Date.now(),
    action: { type: 'file.write', target: '/tmp/test' },
    reason: 'test reason',
    policy: { matchedPolicyId: null, matchedPolicyName: null },
    invariants: { violations: [] },
    execution: { executed: false, success: false, durationMs: 0 },
  };
}

describe('healthRoutes', () => {
  it('GET /api/health returns status ok', async () => {
    const app = new Hono();
    app.route('/api', healthRoutes);

    const res = await app.request('/api/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBeDefined();
    expect(typeof body.uptime).toBe('number');
  });
});

describe('eventRoutes', () => {
  let store: TelemetryDataStore;
  let app: Hono;

  beforeEach(() => {
    store = createMemoryStore();
    app = new Hono();
    app.route('/api', eventRoutes(store));
  });

  it('GET /api/events returns empty when no events', async () => {
    const res = await app.request('/api/events');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('GET /api/events returns ingested events', async () => {
    await store.appendEvents('run-1', [makeEvent('ActionAllowed') as never]);

    const res = await app.request('/api/events');
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data[0].kind).toBe('ActionAllowed');
  });

  it('filters by run_id query param', async () => {
    await store.appendEvents('run-1', [makeEvent('A') as never]);
    await store.appendEvents('run-2', [makeEvent('B') as never]);

    const res = await app.request('/api/events?run_id=run-1');
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data[0].kind).toBe('A');
  });

  it('filters by kind query param', async () => {
    await store.appendEvents('run-1', [
      makeEvent('ActionAllowed') as never,
      makeEvent('ActionDenied') as never,
    ]);

    const res = await app.request('/api/events?kind=ActionDenied');
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data[0].kind).toBe('ActionDenied');
  });

  it('supports limit and offset query params', async () => {
    const events = Array.from({ length: 5 }, (_, i) => makeEvent(`E${i}`) as never);
    await store.appendEvents('run-1', events);

    const res = await app.request('/api/events?limit=2&offset=1');
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.offset).toBe(1);
  });
});

describe('decisionRoutes', () => {
  let store: TelemetryDataStore;
  let app: Hono;

  beforeEach(() => {
    store = createMemoryStore();
    app = new Hono();
    app.route('/api', decisionRoutes(store));
  });

  it('GET /api/decisions returns empty when no decisions', async () => {
    const res = await app.request('/api/decisions');
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('filters by outcome', async () => {
    await store.appendDecisions('run-1', [
      makeDecision('allow') as never,
      makeDecision('deny') as never,
    ]);

    const res = await app.request('/api/decisions?outcome=deny');
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data[0].outcome).toBe('deny');
  });

  it('ignores invalid outcome values', async () => {
    await store.appendDecisions('run-1', [makeDecision('allow') as never]);

    const res = await app.request('/api/decisions?outcome=invalid');
    const body = await res.json();
    expect(body.total).toBe(1); // no filter applied
  });
});

describe('traceRoutes', () => {
  let store: TelemetryDataStore;
  let app: Hono;

  beforeEach(() => {
    store = createMemoryStore();
    app = new Hono();
    app.route('/api', traceRoutes(store));
  });

  it('GET /api/traces returns empty when no traces', async () => {
    const res = await app.request('/api/traces');
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });
});

describe('ingestRoutes', () => {
  let store: TelemetryDataStore;
  let app: Hono;

  beforeEach(() => {
    store = createMemoryStore();
    app = new Hono();
    app.route('/api', ingestRoutes(store));
  });

  it('POST /api/ingest accepts events batch', async () => {
    const res = await app.request('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'events',
        run_id: 'run-1',
        batch: [makeEvent('ActionAllowed')],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.ingested).toBe(1);
  });

  it('POST /api/ingest accepts decisions batch', async () => {
    const res = await app.request('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'decisions',
        run_id: 'run-1',
        batch: [makeDecision('allow')],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('rejects missing type field', async () => {
    const res = await app.request('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: [] }),
    });

    expect(res.status).toBe(400);
  });

  it('rejects empty batch', async () => {
    const res = await app.request('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'events', run_id: 'r1', batch: [] }),
    });

    expect(res.status).toBe(400);
  });

  it('rejects unknown payload type', async () => {
    const res = await app.request('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'unknown', run_id: 'r1', batch: [{}] }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Unknown payload type');
  });

  it('rejects events without run_id', async () => {
    const res = await app.request('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'events', batch: [makeEvent('A')] }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('run_id');
  });
});

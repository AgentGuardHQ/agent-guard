import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSqliteQueue } from '../src/queue-sqlite.js';
import type { TelemetryPayloadEvent } from '../src/types.js';

function makeEvent(id: string): TelemetryPayloadEvent {
  return {
    event_id: id,
    timestamp: Math.floor(Date.now() / 1000),
    version: '1.0.0',
    runtime: 'claude-code',
    environment: 'local',
    event_type: 'guard_triggered',
    policy: 'default',
    result: 'allowed',
    latency_ms: 10,
  };
}

// Check if better-sqlite3 is available (optional dependency)
let hasSqlite = false;
try {
  await import('better-sqlite3');
  hasSqlite = true;
} catch {
  // better-sqlite3 not installed
}

describe.skipIf(!hasSqlite)('SQLite queue', () => {
  let tempDir: string;
  let dbPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ag-sqlite-queue-'));
    dbPath = join(tempDir, 'test-queue.db');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('enqueue and dequeue preserves order', async () => {
    const queue = await createSqliteQueue(dbPath);
    try {
      queue.enqueue(makeEvent('a'));
      queue.enqueue(makeEvent('b'));
      queue.enqueue(makeEvent('c'));

      const events = queue.dequeue(2);
      expect(events).toHaveLength(2);
      expect(events[0].event_id).toBe('a');
      expect(events[1].event_id).toBe('b');

      const remaining = queue.dequeue(10);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].event_id).toBe('c');
    } finally {
      queue.close();
    }
  });

  it('dequeue from empty queue returns empty array', async () => {
    const queue = await createSqliteQueue(dbPath);
    try {
      expect(queue.dequeue(10)).toEqual([]);
    } finally {
      queue.close();
    }
  });

  it('size tracks events correctly', async () => {
    const queue = await createSqliteQueue(dbPath);
    try {
      expect(queue.size()).toBe(0);

      queue.enqueue(makeEvent('x'));
      expect(queue.size()).toBe(1);

      queue.enqueue(makeEvent('y'));
      expect(queue.size()).toBe(2);

      queue.dequeue(1);
      expect(queue.size()).toBe(1);
    } finally {
      queue.close();
    }
  });

  it('sizeBytes returns database size', async () => {
    const queue = await createSqliteQueue(dbPath);
    try {
      const initialSize = queue.sizeBytes();
      expect(initialSize).toBeGreaterThan(0);

      queue.enqueue(makeEvent('x'));
      expect(queue.sizeBytes()).toBeGreaterThanOrEqual(initialSize);
    } finally {
      queue.close();
    }
  });

  it('clear removes all events', async () => {
    const queue = await createSqliteQueue(dbPath);
    try {
      queue.enqueue(makeEvent('a'));
      queue.enqueue(makeEvent('b'));

      queue.clear();
      expect(queue.size()).toBe(0);
    } finally {
      queue.close();
    }
  });

  it('close does not throw', async () => {
    const queue = await createSqliteQueue(dbPath);
    expect(() => queue.close()).not.toThrow();
  });

  it('persists data across queue instances', async () => {
    const queue1 = await createSqliteQueue(dbPath);
    queue1.enqueue(makeEvent('persist-1'));
    queue1.enqueue(makeEvent('persist-2'));
    queue1.close();

    const queue2 = await createSqliteQueue(dbPath);
    try {
      expect(queue2.size()).toBe(2);
      const events = queue2.dequeue(10);
      expect(events[0].event_id).toBe('persist-1');
    } finally {
      queue2.close();
    }
  });
});

describe.skipIf(hasSqlite)('SQLite queue (without better-sqlite3)', () => {
  it('throws when better-sqlite3 is not installed', async () => {
    await expect(createSqliteQueue('/tmp/test.db')).rejects.toThrow('better-sqlite3');
  });
});

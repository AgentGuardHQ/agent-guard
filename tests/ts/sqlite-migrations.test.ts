import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runMigrations, getSchemaVersion } from '../../src/storage/migrations.js';

describe('SQLite migrations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  it('creates all tables on first run', () => {
    const applied = runMigrations(db);
    expect(applied).toBe(2);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const names = tables.map((t) => t.name);

    expect(names).toContain('events');
    expect(names).toContain('decisions');
    expect(names).toContain('sessions');
    expect(names).toContain('migrations');
  });

  it('creates all expected indexes', () => {
    runMigrations(db);

    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
      .all() as { name: string }[];
    const names = indexes.map((i) => i.name);

    expect(names).toContain('idx_events_run_ts');
    expect(names).toContain('idx_events_run_kind');
    expect(names).toContain('idx_events_kind');
    expect(names).toContain('idx_events_timestamp');
    expect(names).toContain('idx_events_fingerprint');
    expect(names).toContain('idx_decisions_run_ts');
    expect(names).toContain('idx_decisions_outcome');
    expect(names).toContain('idx_events_kind_timestamp');
  });

  it('is idempotent — running twice applies nothing the second time', () => {
    const first = runMigrations(db);
    const second = runMigrations(db);

    expect(first).toBe(2);
    expect(second).toBe(0);
  });

  it('tracks schema version', () => {
    expect(getSchemaVersion(db)).toBe(0);
    runMigrations(db);
    expect(getSchemaVersion(db)).toBe(2);
  });

  it('enables WAL mode (on file-based databases)', () => {
    // In-memory databases use 'memory' journal mode and can't switch to WAL.
    // Test with a temp file to verify WAL mode is set for real databases.
    const tmpDir = mkdtempSync(join(tmpdir(), 'ag-wal-'));
    const fileDb = new Database(join(tmpDir, 'test.db'));
    try {
      runMigrations(fileDb);
      const mode = fileDb.pragma('journal_mode', { simple: true }) as string;
      expect(mode).toBe('wal');
    } finally {
      fileDb.close();
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('records migration timestamp', () => {
    runMigrations(db);
    const row = db.prepare('SELECT applied_at FROM migrations WHERE version = 1').get() as {
      applied_at: string;
    };
    expect(row.applied_at).toBeTruthy();
    // Should be a valid ISO timestamp
    expect(new Date(row.applied_at).getTime()).toBeGreaterThan(0);
  });

  it('applies v2 composite index incrementally on existing v1 database', () => {
    // Simulate a v1 database by manually creating the schema
    db.exec(
      'CREATE TABLE migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)'
    );
    db.exec("INSERT INTO migrations (version, applied_at) VALUES (1, '2026-01-01T00:00:00Z')");
    db.exec(`
      CREATE TABLE events (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL, kind TEXT NOT NULL,
        timestamp INTEGER NOT NULL, fingerprint TEXT NOT NULL, data TEXT NOT NULL
      )
    `);
    db.exec('CREATE INDEX idx_events_kind ON events (kind)');
    db.exec('CREATE INDEX idx_events_timestamp ON events (timestamp)');

    expect(getSchemaVersion(db)).toBe(1);

    const applied = runMigrations(db);
    expect(applied).toBe(1);
    expect(getSchemaVersion(db)).toBe(2);

    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name = 'idx_events_kind_timestamp'"
      )
      .all() as { name: string }[];
    expect(indexes).toHaveLength(1);
  });
});

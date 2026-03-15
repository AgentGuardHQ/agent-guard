import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { apiKeyAuth } from '../src/middleware/api-key.js';
import type { ServerConfig } from '../src/config.js';

function makeConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    port: 3001,
    allowedIps: [],
    apiKey: 'test-secret-key',
    isDev: false,
    enrollmentEnabled: true,
    maxRequestSizeMb: 1,
    rateLimitPerIp: 100,
    rateLimitPerInstall: 60,
    antiReplayWindowMs: 300_000,
    storageBackend: 'memory',
    ...overrides,
  };
}

function makeApp(config: ServerConfig) {
  const app = new Hono();
  app.use('/*', apiKeyAuth(config));
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

describe('apiKeyAuth middleware', () => {
  it('allows request with valid API key', async () => {
    const app = makeApp(makeConfig());
    const res = await app.request('/test', {
      headers: { 'x-api-key': 'test-secret-key' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('rejects request with missing API key', async () => {
    const app = makeApp(makeConfig());
    const res = await app.request('/test');

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('rejects request with incorrect API key', async () => {
    const app = makeApp(makeConfig());
    const res = await app.request('/test', {
      headers: { 'x-api-key': 'wrong-key' },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 500 when API key is not configured in production', async () => {
    const app = makeApp(makeConfig({ apiKey: undefined, isDev: false }));
    const res = await app.request('/test');

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('API_KEY not set');
  });

  it('skips auth in dev mode when no API key configured', async () => {
    const app = makeApp(makeConfig({ apiKey: undefined, isDev: true }));
    const res = await app.request('/test');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('enforces auth in dev mode when API key is configured', async () => {
    const app = makeApp(makeConfig({ apiKey: 'dev-key', isDev: true }));

    const resMissing = await app.request('/test');
    expect(resMissing.status).toBe(401);

    const resValid = await app.request('/test', {
      headers: { 'x-api-key': 'dev-key' },
    });
    expect(resValid.status).toBe(200);
  });

  it('rejects key with different length (timing-safe)', async () => {
    const app = makeApp(makeConfig({ apiKey: 'short' }));
    const res = await app.request('/test', {
      headers: { 'x-api-key': 'a-much-longer-key-than-expected' },
    });

    expect(res.status).toBe(401);
  });
});

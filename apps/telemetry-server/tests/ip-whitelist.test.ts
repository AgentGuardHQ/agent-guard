import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { ipWhitelist } from '../src/middleware/ip-whitelist.js';
import type { ServerConfig } from '../src/config.js';

function makeConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    port: 3001,
    allowedIps: [],
    apiKey: undefined,
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
  app.use('/*', ipWhitelist(config));
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

describe('ipWhitelist middleware', () => {
  it('allows all requests when no IPs are configured', async () => {
    const app = makeApp(makeConfig({ allowedIps: [] }));
    const res = await app.request('/test');

    expect(res.status).toBe(200);
  });

  it('allows request from whitelisted exact IP', async () => {
    const app = makeApp(makeConfig({ allowedIps: ['10.0.0.1'] }));
    const res = await app.request('/test', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });

    expect(res.status).toBe(200);
  });

  it('blocks request from non-whitelisted IP', async () => {
    const app = makeApp(makeConfig({ allowedIps: ['10.0.0.1'] }));
    const res = await app.request('/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('supports CIDR ranges', async () => {
    const app = makeApp(makeConfig({ allowedIps: ['10.0.0.0/24'] }));

    const resAllowed = await app.request('/test', {
      headers: { 'x-forwarded-for': '10.0.0.42' },
    });
    expect(resAllowed.status).toBe(200);

    const resBlocked = await app.request('/test', {
      headers: { 'x-forwarded-for': '10.0.1.1' },
    });
    expect(resBlocked.status).toBe(403);
  });

  it('uses first IP from x-forwarded-for with multiple entries', async () => {
    const app = makeApp(makeConfig({ allowedIps: ['10.0.0.1'] }));
    const res = await app.request('/test', {
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' },
    });

    expect(res.status).toBe(200);
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', async () => {
    const app = makeApp(makeConfig({ allowedIps: ['10.0.0.1'] }));
    const res = await app.request('/test', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });

    expect(res.status).toBe(200);
  });

  it('supports multiple whitelist entries', async () => {
    const app = makeApp(makeConfig({ allowedIps: ['10.0.0.1', '192.168.0.0/16'] }));

    const res1 = await app.request('/test', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(res1.status).toBe(200);

    const res2 = await app.request('/test', {
      headers: { 'x-forwarded-for': '192.168.5.10' },
    });
    expect(res2.status).toBe(200);

    const res3 = await app.request('/test', {
      headers: { 'x-forwarded-for': '172.16.0.1' },
    });
    expect(res3.status).toBe(403);
  });
});

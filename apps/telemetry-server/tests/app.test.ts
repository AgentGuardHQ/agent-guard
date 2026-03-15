import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../src/app.js';

describe('createApp', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'development' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('creates an app with health endpoint accessible without auth', async () => {
    const { app } = await createApp();
    const res = await app.request('/api/health');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('returns memory storage backend by default', async () => {
    const { config } = await createApp();
    expect(config.storageBackend).toBe('memory');
  });

  it('data routes require authentication when API_KEY is set', async () => {
    process.env.API_KEY = 'secret';
    process.env.NODE_ENV = 'production';

    const { app } = await createApp();

    const res = await app.request('/api/events');
    expect(res.status).toBe(401);

    const resWithKey = await app.request('/api/events', {
      headers: { 'x-api-key': 'secret' },
    });
    expect(resWithKey.status).toBe(200);
  });

  it('telemetry enrollment routes are accessible without API key auth', async () => {
    process.env.API_KEY = 'secret';
    process.env.NODE_ENV = 'production';

    const { app } = await createApp();

    // Enrollment endpoint should NOT require API key (it uses its own token auth)
    const res = await app.request('/api/v1/telemetry/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        install_id: 'not-a-uuid', // intentionally invalid to test routing, not enrollment
      }),
    });

    // Should reach the route handler (400 from validation, NOT 401 from auth)
    expect(res.status).toBe(400);
  });
});

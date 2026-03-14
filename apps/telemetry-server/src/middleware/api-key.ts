// API key authentication middleware — checks X-API-Key header.
// Uses timing-safe comparison to prevent timing attacks.

import { timingSafeEqual } from 'node:crypto';
import type { Context, Next } from 'hono';
import type { ServerConfig } from '../config.js';

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function apiKeyAuth(config: ServerConfig) {
  return async (c: Context, next: Next) => {
    // Skip auth in dev mode when no API key is configured
    if (config.isDev && !config.apiKey) {
      return next();
    }

    if (!config.apiKey) {
      return c.json({ error: 'Server misconfigured: API_KEY not set' }, 500);
    }

    const provided = c.req.header('x-api-key');
    if (!provided || !safeEqual(provided, config.apiKey)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return next();
  };
}

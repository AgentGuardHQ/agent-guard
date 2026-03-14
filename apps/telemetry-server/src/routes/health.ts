// Health check endpoint — no authentication required.

import { Hono } from 'hono';

const startTime = Date.now();

export const healthRoutes = new Hono();

healthRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

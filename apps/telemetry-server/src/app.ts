// Hono app — composes middleware and routes into a platform-agnostic application.

import { Hono } from 'hono';
import { loadConfig } from './config.js';
import { ipWhitelist } from './middleware/ip-whitelist.js';
import { apiKeyAuth } from './middleware/api-key.js';
import { healthRoutes } from './routes/health.js';
import { ingestRoutes } from './routes/ingest.js';
import { eventRoutes } from './routes/events.js';
import { decisionRoutes } from './routes/decisions.js';
import { traceRoutes } from './routes/traces.js';
import { createMemoryStore } from './store/memory-store.js';

const config = loadConfig();
const store = createMemoryStore();

const app = new Hono();

// Health check — no auth required
app.route('/api', healthRoutes);

// Auth middleware on all other /api routes
app.use('/api/*', ipWhitelist(config));
app.use('/api/*', apiKeyAuth(config));

// Data routes
app.route('/api', ingestRoutes(store));
app.route('/api', eventRoutes(store));
app.route('/api', decisionRoutes(store));
app.route('/api', traceRoutes(store));

export { app, config };

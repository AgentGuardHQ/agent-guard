// Standalone Node.js entry point — for local dev and self-hosted deployments.

import { serve } from '@hono/node-server';
import { app, config } from './app.js';

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`AgentGuard telemetry server listening on http://localhost:${info.port}`);
  if (config.allowedIps.length > 0) {
    console.log(`IP whitelist: ${config.allowedIps.join(', ')}`);
  } else {
    console.log('IP whitelist: disabled (all IPs allowed)');
  }
  if (config.isDev && !config.apiKey) {
    console.log('API key auth: disabled (development mode)');
  }
});

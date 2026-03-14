// AWS Lambda entry point — use behind API Gateway with {proxy+} route.

import { handle } from 'hono/aws-lambda';
import { app } from './app.js';

export const handler = handle(app);

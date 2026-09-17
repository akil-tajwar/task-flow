import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { ZodError } from 'zod';
import { routes } from './routes/index';
import { env } from './lib/env';

export const app = new Hono();

app.use('*', logger());
app.use('*', secureHeaders());
app.use('*', cors({ origin: env.FRONTEND_URL, credentials: true }));

app.route('/api', routes);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ error: 'Validation error', details: err.flatten() }, 400);
  }
  const msg = err.message || 'Internal server error';
  const status =
    msg.includes('Invalid credentials') || msg.includes('Unauthorized') ? 401
    : msg.includes('Forbidden') ? 403
    : msg.includes('not found') || msg.includes('Not found') ? 404
    : msg.includes('already') ? 409
    : 500;
  return c.json({ error: msg }, status as 400 | 401 | 403 | 404 | 409 | 500);
});

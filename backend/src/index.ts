import 'dotenv/config';
import { serve } from '@hono/node-server';
import { app } from './app';
import { connectRedis } from './lib/redis';
import { env } from './lib/env';

async function main() {
  await connectRedis();
  serve({ fetch: app.fetch, port: env.PORT }, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

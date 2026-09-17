import { createMiddleware } from 'hono/factory';
import { redis } from '../lib/redis';

export const rateLimitMiddleware = (limit: number, windowSeconds: number) =>
  createMiddleware(async (c, next) => {
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    const key = `rl:${c.req.path}:${ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    if (count > limit) {
      return c.json({ error: 'Too many requests' }, 429);
    }
    await next();
  });

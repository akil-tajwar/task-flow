import { createMiddleware } from 'hono/factory';
import type { Role } from '../types/index';

export const requireRole = (...roles: Role[]) =>
  createMiddleware(async (c, next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  });

import { createMiddleware } from 'hono/factory';

export const tenantMiddleware = createMiddleware(async (c, next) => {
  const user = c.get('user');
  if (user?.tenantId) {
    c.set('tenantId', user.tenantId);
  }
  await next();
});

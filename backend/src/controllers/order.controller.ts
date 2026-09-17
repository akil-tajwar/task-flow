import type { Context } from 'hono';
import { orderService } from '../services/order.service';
import { createOrderSchema } from '../validators/order.validator';
import { z } from 'zod';

const statusSchema = z.object({
  status: z.enum(['pending', 'completed', 'cancelled', 'refunded']),
});

export const orderController = {
  async list(c: Context) {
    return c.json(await orderService.list(c.get('tenantId')));
  },

  async get(c: Context) {
    const order = await orderService.get(c.get('tenantId'), c.req.param('id')!);
    if (!order) return c.json({ error: 'Not found' }, 404);
    return c.json(order);
  },

  async create(c: Context) {
    const input = createOrderSchema.parse(await c.req.json());
    return c.json(await orderService.create(c.get('tenantId'), c.get('user').id, input), 201);
  },

  async updateStatus(c: Context) {
    const { status } = statusSchema.parse(await c.req.json());
    const order = await orderService.updateStatus(c.get('tenantId'), c.req.param('id')!, status);
    if (!order) return c.json({ error: 'Not found' }, 404);
    return c.json(order);
  },
};

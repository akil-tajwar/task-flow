import type { Context } from 'hono';
import { z } from 'zod';
import { brandService } from '../services/brand.service';

const createSchema = z.object({ name: z.string().min(1).max(255) });

export const brandController = {
  async list(c: Context) {
    return c.json(await brandService.list(c.get('tenantId')));
  },

  async create(c: Context) {
    const { name } = createSchema.parse(await c.req.json());
    return c.json(await brandService.create(c.get('tenantId'), name), 201);
  },
};

import type { Context } from 'hono';
import { z } from 'zod';
import { categoryService } from '../services/category.service';

const createSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
});

export const categoryController = {
  async list(c: Context) {
    return c.json(await categoryService.list(c.get('tenantId')));
  },

  async create(c: Context) {
    const { name, parentId } = createSchema.parse(await c.req.json());
    return c.json(await categoryService.create(c.get('tenantId'), name, parentId), 201);
  },
};

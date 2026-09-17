import type { Context } from 'hono';
import { storeService } from '../services/store.service';
import { createStoreSchema, updateStoreSchema } from '../validators/store.validator';

export const storeController = {
  async list(c: Context) {
    return c.json(await storeService.list(c.get('tenantId')));
  },

  async get(c: Context) {
    const store = await storeService.get(c.get('tenantId'), c.req.param('id')!);
    if (!store) return c.json({ error: 'Store not found' }, 404);
    return c.json(store);
  },

  async create(c: Context) {
    const body  = await c.req.json();
    const input = createStoreSchema.parse(body);
    const store = await storeService.create(c.get('tenantId'), input);
    return c.json(store, 201);
  },

  async update(c: Context) {
    const body  = await c.req.json();
    const input = updateStoreSchema.parse(body);
    const store = await storeService.update(c.get('tenantId'), c.req.param('id')!, input);
    if (!store) return c.json({ error: 'Store not found' }, 404);
    return c.json(store);
  },

  async setDefault(c: Context) {
    const store = await storeService.setDefault(c.get('tenantId'), c.req.param('id')!);
    if (!store) return c.json({ error: 'Store not found' }, 404);
    return c.json(store);
  },

  async deactivate(c: Context) {
    const store = await storeService.deactivate(c.get('tenantId'), c.req.param('id')!);
    if (!store) return c.json({ error: 'Store not found' }, 404);
    return c.json({ success: true });
  },
};

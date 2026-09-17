import type { Context } from 'hono';
import { vendorService } from '../services/vendor.service';
import { createVendorSchema, updateVendorSchema } from '../validators/vendor.validator';

export const vendorController = {
  async list(c: Context) {
    const { page, limit, search } = c.req.query();
    return c.json(
      await vendorService.list(c.get('tenantId'), {
        page:   page  ? parseInt(page,  10) : undefined,
        limit:  limit ? parseInt(limit, 10) : undefined,
        search: search || undefined,
      }),
    );
  },

  async get(c: Context) {
    const vendor = await vendorService.get(c.get('tenantId'), c.req.param('id')!);
    if (!vendor) return c.json({ error: 'Vendor not found' }, 404);
    return c.json(vendor);
  },

  async create(c: Context) {
    const body = createVendorSchema.parse(await c.req.json());
    return c.json(await vendorService.create(c.get('tenantId'), body), 201);
  },

  async update(c: Context) {
    const body = updateVendorSchema.parse(await c.req.json());
    const vendor = await vendorService.update(c.get('tenantId'), c.req.param('id')!, body);
    if (!vendor) return c.json({ error: 'Vendor not found' }, 404);
    return c.json(vendor);
  },

  async delete(c: Context) {
    await vendorService.delete(c.get('tenantId'), c.req.param('id')!);
    return c.json({ message: 'Vendor removed' });
  },

  async getBalance(c: Context) {
    const balance = await vendorService.getBalance(c.get('tenantId'), c.req.param('id')!);
    return c.json({ balance });
  },

  async setOpeningBalance(c: Context) {
    const { amount, notes } = await c.req.json();
    if (typeof amount !== 'number' || amount < 0) {
      return c.json({ error: 'amount must be a non-negative number' }, 400);
    }
    await vendorService.setOpeningBalance(c.get('tenantId'), c.req.param('id')!, amount, notes, c.get('user').id);
    const balance = await vendorService.getBalance(c.get('tenantId'), c.req.param('id')!);
    return c.json({ balance });
  },

  async getLedger(c: Context) {
    const { page, limit, dateFrom, dateTo } = c.req.query();
    return c.json(await vendorService.getLedger(
      c.get('tenantId'), c.req.param('id')!,
      page  ? parseInt(page,  10) : 1,
      limit ? parseInt(limit, 10) : 500,
      dateFrom || undefined,
      dateTo   || undefined,
    ));
  },
};

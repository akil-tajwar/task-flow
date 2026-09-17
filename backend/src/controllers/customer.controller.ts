import type { Context } from 'hono';
import { customerService } from '../services/customer.service';
import { createCustomerSchema, updateCustomerSchema } from '../validators/customer.validator';

export const customerController = {
  async list(c: Context) {
    const { page, limit, search } = c.req.query();
    return c.json(
      await customerService.list(c.get('tenantId'), {
        page:   page  ? parseInt(page,  10) : undefined,
        limit:  limit ? parseInt(limit, 10) : undefined,
        search: search || undefined,
      }),
    );
  },

  async get(c: Context) {
    const customer = await customerService.get(c.get('tenantId'), c.req.param('id')!);
    if (!customer) return c.json({ error: 'Customer not found' }, 404);
    return c.json(customer);
  },

  async create(c: Context) {
    const body = createCustomerSchema.parse(await c.req.json());
    return c.json(await customerService.create(c.get('tenantId'), body), 201);
  },

  async update(c: Context) {
    const body = updateCustomerSchema.parse(await c.req.json());
    const customer = await customerService.update(c.get('tenantId'), c.req.param('id')!, body);
    if (!customer) return c.json({ error: 'Customer not found' }, 404);
    return c.json(customer);
  },

  async delete(c: Context) {
    await customerService.delete(c.get('tenantId'), c.req.param('id')!);
    return c.json({ message: 'Customer removed' });
  },

  async getBalance(c: Context) {
    const balance = await customerService.getBalance(c.get('tenantId'), c.req.param('id')!);
    return c.json({ balance });
  },

  async setOpeningBalance(c: Context) {
    const { amount, notes } = await c.req.json();
    if (typeof amount !== 'number' || amount < 0) {
      return c.json({ error: 'amount must be a non-negative number' }, 400);
    }
    await customerService.setOpeningBalance(c.get('tenantId'), c.req.param('id')!, amount, notes, c.get('user').id);
    const balance = await customerService.getBalance(c.get('tenantId'), c.req.param('id')!);
    return c.json({ balance });
  },

  async getLedger(c: Context) {
    const { page, limit } = c.req.query();
    return c.json(await customerService.getLedger(
      c.get('tenantId'), c.req.param('id')!,
      page  ? parseInt(page,  10) : 1,
      limit ? parseInt(limit, 10) : 30,
    ));
  },
};

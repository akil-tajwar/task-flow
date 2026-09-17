import type { Context } from 'hono';
import { salesService }         from '../services/sales.service';
import { createSaleSchema, addSalePaymentSchema } from '../validators/sales.validator';

export const salesController = {
  async list(c: Context) {
    const { storeId, status, paymentStatus, page, limit } = c.req.query();
    return c.json(await salesService.list(c.get('tenantId'), {
      storeId:       storeId       || undefined,
      status:        status        || undefined,
      paymentStatus: paymentStatus || undefined,
      page:          page  ? parseInt(page,  10) : undefined,
      limit:         limit ? parseInt(limit, 10) : undefined,
    }));
  },

  async get(c: Context) {
    const invoice = await salesService.get(c.get('tenantId'), c.req.param('id')!);
    if (!invoice) return c.json({ error: 'Invoice not found' }, 404);
    return c.json(invoice);
  },

  async create(c: Context) {
    const body = createSaleSchema.parse(await c.req.json());
    const invoice = await salesService.create(c.get('tenantId'), c.get('user').id, body);
    return c.json(invoice, 201);
  },

  async confirm(c: Context) {
    const result = await salesService.confirm(c.get('tenantId'), c.req.param('id')!, c.get('user').id);
    return c.json(result);
  },

  async cancel(c: Context) {
    await salesService.cancel(c.get('tenantId'), c.req.param('id')!);
    return c.json({ message: 'Invoice cancelled' });
  },

  async addPayment(c: Context) {
    const body = addSalePaymentSchema.parse(await c.req.json());
    const result = await salesService.addPayment(c.get('tenantId'), c.req.param('id')!, c.get('user').id, body);
    return c.json(result);
  },
};

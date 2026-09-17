import type { Context } from 'hono';
import { inventoryService } from '../services/inventory.service';
import { adjustStockSchema, createTransferSchema, openingBalanceSchema } from '../validators/inventory.validator';

export const inventoryController = {
  async list(c: Context) {
    const { storeId, productId, search, page, limit } = c.req.query();
    return c.json(await inventoryService.list(c.get('tenantId'), {
      storeId:   storeId   || undefined,
      productId: productId || undefined,
      search:    search    || undefined,
      page:  page  ? parseInt(page,  10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    }));
  },

  async listMovements(c: Context) {
    const { storeId, productId, page, limit } = c.req.query();
    return c.json(await inventoryService.listMovements(c.get('tenantId'), {
      storeId:   storeId   || undefined,
      productId: productId || undefined,
      page:  page  ? parseInt(page,  10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    }));
  },

  async storeLedger(c: Context) {
    const { storeId, productId, variantId, page, limit } = c.req.query();
    if (!storeId || !productId) {
      return c.json({ error: 'storeId and productId are required' }, 400);
    }
    return c.json(await inventoryService.storeLedger(
      c.get('tenantId'),
      storeId,
      productId,
      {
        variantId: variantId || undefined,
        page:  page  ? parseInt(page,  10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
    ));
  },

  async listTransfers(c: Context) {
    const { page, limit } = c.req.query();
    return c.json(await inventoryService.listTransfers(c.get('tenantId'), {
      page:  page  ? parseInt(page,  10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    }));
  },

  async adjust(c: Context) {
    const body  = await c.req.json();
    const input = adjustStockSchema.parse(body);
    await inventoryService.adjust(c.get('tenantId'), input, c.get('user').id);
    return c.json({ success: true });
  },

  async transfer(c: Context) {
    const body  = await c.req.json();
    const input = createTransferSchema.parse(body);
    const transfer = await inventoryService.transfer(c.get('tenantId'), input, c.get('user').id);
    return c.json(transfer, 201);
  },

  async getOpeningBalanceTemplate(c: Context) {
    const { storeId } = c.req.query();
    if (!storeId) return c.json({ error: 'storeId is required' }, 400);
    const rows = await inventoryService.getOpeningBalanceTemplate(c.get('tenantId'), storeId);
    return c.json(rows);
  },

  async openingBalance(c: Context) {
    const body  = await c.req.json();
    const input = openingBalanceSchema.parse(body);
    await inventoryService.openingBalance(c.get('tenantId'), input, c.get('user').id);
    return c.json({ success: true });
  },
};

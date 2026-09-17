import type { Context } from 'hono';
import { purchaseService } from '../services/purchase.service';
import {
  createPOSchema, updatePOStatusSchema,
  createPRSchema, addPaymentSchema,
} from '../validators/purchase.validator';

export const purchaseController = {

  // ── Purchase Orders ──────────────────────────────────────────────────────

  async listPOs(c: Context) {
    const { vendorId, status, page, limit } = c.req.query();
    return c.json(await purchaseService.listPOs(c.get('tenantId'), {
      vendorId, status,
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    }));
  },

  async getPO(c: Context) {
    const po = await purchaseService.getPO(c.get('tenantId'), c.req.param('id')!);
    if (!po) return c.json({ error: 'Not found' }, 404);
    return c.json(po);
  },

  async createPO(c: Context) {
    const input = createPOSchema.parse(await c.req.json());
    const po    = await purchaseService.createPO(c.get('tenantId'), input, c.get('user').id);
    return c.json(po, 201);
  },

  async updatePOStatus(c: Context) {
    const input   = updatePOStatusSchema.parse(await c.req.json());
    const updated = await purchaseService.updatePOStatus(c.get('tenantId'), c.req.param('id')!, input);
    if (!updated) return c.json({ error: 'Not found or cannot update status' }, 404);
    return c.json(updated);
  },

  // ── Purchase Receipts ────────────────────────────────────────────────────

  async listPRs(c: Context) {
    const { vendorId, storeId, status, paymentStatus, page, limit } = c.req.query();
    return c.json(await purchaseService.listPRs(c.get('tenantId'), {
      vendorId, storeId, status, paymentStatus,
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    }));
  },

  async getPR(c: Context) {
    const pr = await purchaseService.getPR(c.get('tenantId'), c.req.param('id')!);
    if (!pr) return c.json({ error: 'Not found' }, 404);
    return c.json(pr);
  },

  async createPR(c: Context) {
    const input = createPRSchema.parse(await c.req.json());
    const pr    = await purchaseService.createPR(c.get('tenantId'), input, c.get('user').id);
    return c.json(pr, 201);
  },

  async confirmPR(c: Context) {
    try {
      await purchaseService.confirmPR(c.get('tenantId'), c.req.param('id')!, c.get('user').id);
      return c.json({ success: true });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      return c.json({ error: e.message ?? 'Failed to confirm' }, (e.status ?? 500) as 400 | 404 | 409 | 500);
    }
  },

  async cancelPR(c: Context) {
    const updated = await purchaseService.cancelPR(c.get('tenantId'), c.req.param('id')!);
    if (!updated) return c.json({ error: 'Not found or already confirmed' }, 404);
    return c.json(updated);
  },

  async addPayment(c: Context) {
    const input = addPaymentSchema.parse(await c.req.json());
    try {
      await purchaseService.addPayment(c.get('tenantId'), c.req.param('id')!, input, c.get('user').id);
      return c.json({ success: true });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      return c.json({ error: e.message ?? 'Failed to add payment' }, (e.status ?? 500) as 400 | 404 | 500);
    }
  },

  // ── Vendor Ledger ────────────────────────────────────────────────────────

  async getVendorLedger(c: Context) {
    const { page, limit } = c.req.query();
    return c.json(
      await purchaseService.getVendorLedger(
        c.get('tenantId'), c.req.param('vendorId')!,
        page  ? parseInt(page,  10) : 1,
        limit ? parseInt(limit, 10) : 30,
      ),
    );
  },
};

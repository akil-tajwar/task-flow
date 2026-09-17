import type { Context } from 'hono';
import { financeService } from '../services/finance.service';
import {
  createAccountSchema,
  updateAccountSchema,
  setOpeningBalanceSchema,
  transferSchema,
} from '../validators/finance.validator';

export const financeController = {
  async listAccounts(c: Context) {
    return c.json(await financeService.listAccounts(c.get('tenantId')));
  },

  async getAccount(c: Context) {
    const account = await financeService.getAccount(c.get('tenantId'), c.req.param('id')!);
    if (!account) return c.json({ error: 'Not found' }, 404);
    return c.json(account);
  },

  async createAccount(c: Context) {
    const input   = createAccountSchema.parse(await c.req.json());
    const account = await financeService.createAccount(c.get('tenantId'), input, c.get('user').id);
    return c.json(account, 201);
  },

  async updateAccount(c: Context) {
    const input   = updateAccountSchema.parse(await c.req.json());
    const account = await financeService.updateAccount(c.get('tenantId'), c.req.param('id')!, input);
    if (!account) return c.json({ error: 'Not found' }, 404);
    return c.json(account);
  },

  async deleteAccount(c: Context) {
    await financeService.deleteAccount(c.get('tenantId'), c.req.param('id')!);
    return c.json({ success: true });
  },

  async setOpeningBalance(c: Context) {
    const input   = setOpeningBalanceSchema.parse(await c.req.json());
    const account = await financeService.setOpeningBalance(
      c.get('tenantId'), c.req.param('id')!, input, c.get('user').id,
    );
    return c.json(account);
  },

  async listTransactions(c: Context) {
    const { page, limit } = c.req.query();
    return c.json(
      await financeService.listTransactions(
        c.get('tenantId'),
        c.req.param('id')!,
        page  ? parseInt(page,  10) : 1,
        limit ? parseInt(limit, 10) : 30,
      ),
    );
  },

  async transfer(c: Context) {
    const input  = transferSchema.parse(await c.req.json());
    const result = await financeService.transfer(c.get('tenantId'), c.get('user').id, input);
    return c.json(result, 201);
  },

  async getLedger(c: Context) {
    const { dateFrom, dateTo } = c.req.query();
    const result = await financeService.getLedger(
      c.get('tenantId'), c.req.param('id')!,
      dateFrom || undefined, dateTo || undefined,
    );
    if (!result) return c.json({ error: 'Not found' }, 404);
    return c.json(result);
  },

  async listTransfers(c: Context) {
    const { page, limit } = c.req.query();
    return c.json(
      await financeService.listTransfers(
        c.get('tenantId'),
        page  ? parseInt(page,  10) : 1,
        limit ? parseInt(limit, 10) : 30,
      ),
    );
  },
};

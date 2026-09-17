import type { Context } from 'hono';
import { expenseService } from '../services/expense.service';
import {
  createExpenseHeadSchema,
  updateExpenseHeadSchema,
  createExpenseSchema,
} from '../validators/expense.validator';

export const expenseController = {

  // ── Heads ──────────────────────────────────────────────────────────────────

  async listHeads(c: Context) {
    const includeInactive = c.req.query('includeInactive') === 'true';
    return c.json(await expenseService.listHeads(c.get('tenantId'), includeInactive));
  },

  async createHead(c: Context) {
    const input = createExpenseHeadSchema.parse(await c.req.json());
    return c.json(await expenseService.createHead(c.get('tenantId'), input), 201);
  },

  async updateHead(c: Context) {
    const input = updateExpenseHeadSchema.parse(await c.req.json());
    const head  = await expenseService.updateHead(c.get('tenantId'), c.req.param('id')!, input);
    if (!head) return c.json({ error: 'Not found' }, 404);
    return c.json(head);
  },

  async deleteHead(c: Context) {
    return c.json(await expenseService.deleteHead(c.get('tenantId'), c.req.param('id')!));
  },

  // ── Expenses ───────────────────────────────────────────────────────────────

  async list(c: Context) {
    const { expenseHeadId, accountId, dateFrom, dateTo, page, limit } = c.req.query();
    return c.json(await expenseService.list(c.get('tenantId'), {
      expenseHeadId: expenseHeadId || undefined,
      accountId:     accountId     || undefined,
      dateFrom:      dateFrom      || undefined,
      dateTo:        dateTo        || undefined,
      page:          page  ? parseInt(page,  10) : 1,
      limit:         limit ? parseInt(limit, 10) : 30,
    }));
  },

  async create(c: Context) {
    const input = createExpenseSchema.parse(await c.req.json());
    return c.json(
      await expenseService.create(c.get('tenantId'), c.get('user').id, input),
      201,
    );
  },

  async deleteExpense(c: Context) {
    return c.json(await expenseService.deleteExpense(c.get('tenantId'), c.req.param('id')!));
  },
};

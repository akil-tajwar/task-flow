import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { expenseHeads, expenses }          from '../db/schema';
import { financialAccounts, accountTransactions } from '../db/schema';
import type {
  CreateExpenseHeadInput,
  UpdateExpenseHeadInput,
  CreateExpenseInput,
} from '../validators/expense.validator';

export const expenseService = {

  // ── Expense Heads ─────────────────────────────────────────────────────────

  async listHeads(tenantId: string, includeInactive = false) {
    return db.query.expenseHeads.findMany({
      where: and(
        eq(expenseHeads.tenantId, tenantId),
        includeInactive ? undefined : eq(expenseHeads.isActive, true),
      ),
      with: { expenses: { columns: { id: true } } },
      orderBy: [expenseHeads.name],
    });
  },

  async createHead(tenantId: string, input: CreateExpenseHeadInput) {
    const [head] = await db.insert(expenseHeads)
      .values({ tenantId, name: input.name, description: input.description ?? null })
      .returning();
    return head;
  },

  async updateHead(tenantId: string, id: string, input: UpdateExpenseHeadInput) {
    const [head] = await db.update(expenseHeads)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(expenseHeads.id, id), eq(expenseHeads.tenantId, tenantId)))
      .returning();
    return head ?? null;
  },

  async deleteHead(tenantId: string, id: string) {
    // Soft-delete: mark inactive. Hard-delete only if no transactions exist.
    const [inUse] = await db.select({ cnt: sql<number>`cast(count(*) as integer)` })
      .from(expenses)
      .where(and(eq(expenses.expenseHeadId, id), eq(expenses.tenantId, tenantId)));

    if ((inUse?.cnt ?? 0) > 0) {
      // Has transactions — just deactivate
      await db.update(expenseHeads)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(expenseHeads.id, id), eq(expenseHeads.tenantId, tenantId)));
      return { deleted: false, deactivated: true };
    }

    await db.delete(expenseHeads)
      .where(and(eq(expenseHeads.id, id), eq(expenseHeads.tenantId, tenantId)));
    return { deleted: true, deactivated: false };
  },

  // ── Expenses ──────────────────────────────────────────────────────────────

  async list(tenantId: string, opts: {
    expenseHeadId?: string; accountId?: string;
    dateFrom?: string; dateTo?: string;
    page?: number; limit?: number;
  } = {}) {
    const page   = Math.max(1, opts.page  ?? 1);
    const limit  = Math.min(100, opts.limit ?? 30);
    const offset = (page - 1) * limit;

    const conds = [
      eq(expenses.tenantId, tenantId),
      opts.expenseHeadId ? eq(expenses.expenseHeadId, opts.expenseHeadId) : undefined,
      opts.accountId     ? eq(expenses.accountId,     opts.accountId)     : undefined,
      opts.dateFrom      ? gte(expenses.expenseDate,  opts.dateFrom)      : undefined,
      opts.dateTo        ? lte(expenses.expenseDate,  opts.dateTo)        : undefined,
    ].filter(Boolean) as Parameters<typeof and>;

    const where = and(...conds);

    const [rows, [{ total }]] = await Promise.all([
      db.query.expenses.findMany({
        where, limit, offset,
        orderBy: [desc(expenses.expenseDate), desc(expenses.createdAt)],
        with: {
          expenseHead:   { columns: { id: true, name: true } },
          account:       { columns: { id: true, name: true, category: true } },
          createdByUser: { columns: { id: true, name: true } },
        },
      }),
      db.select({ total: sql<number>`cast(count(*) as integer)` })
        .from(expenses).where(where),
    ]);

    // Aggregate totals for the filtered set
    const [totals] = await db.select({
      totalAmount: sql<string>`coalesce(sum(amount::numeric), 0)`,
    }).from(expenses).where(where);

    return {
      data: rows, total, page, limit,
      totalPages: Math.ceil(total / limit),
      totalAmount: parseFloat(totals?.totalAmount ?? '0'),
    };
  },

  async create(tenantId: string, userId: string, input: CreateExpenseInput) {
    return db.transaction(async (tx) => {
      // Validate account
      const [acct] = await tx.select()
        .from(financialAccounts)
        .where(and(eq(financialAccounts.id, input.accountId), eq(financialAccounts.tenantId, tenantId)));

      if (!acct) throw Object.assign(new Error('Account not found'), { status: 404 });

      const amount     = parseFloat(String(input.amount));
      const curBalance = parseFloat(acct.currentBalance);

      if (acct.accountType !== 'overdraft' && curBalance < amount) {
        throw Object.assign(
          new Error(`Insufficient balance in "${acct.name}". Available: ${curBalance.toFixed(2)}`),
          { status: 422 },
        );
      }

      const newBalance = curBalance - amount;

      // Deduct from account
      await tx.update(financialAccounts)
        .set({ currentBalance: String(newBalance.toFixed(2)), updatedAt: new Date() })
        .where(eq(financialAccounts.id, acct.id));

      // Insert expense record
      const [expense] = await tx.insert(expenses).values({
        tenantId,
        expenseHeadId:   input.expenseHeadId,
        accountId:       input.accountId,
        amount:          String(amount.toFixed(2)),
        expenseDate:     input.expenseDate,
        referenceNumber: input.referenceNumber ?? null,
        notes:           input.notes ?? null,
        createdBy:       userId,
      }).returning();

      // Account transaction (payment out)
      await tx.insert(accountTransactions).values({
        tenantId, accountId: acct.id,
        type:          'payment',
        direction:     'out',
        amount:        String(amount.toFixed(2)),
        balanceAfter:  String(newBalance.toFixed(2)),
        notes:         input.notes ?? `Expense payment`,
        referenceType: 'expense',
        referenceId:   expense.id,
        createdBy:     userId,
      });

      return expense;
    });
  },

  async deleteExpense(tenantId: string, id: string) {
    return db.transaction(async (tx) => {
      const [exp] = await tx.select().from(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.tenantId, tenantId)));

      if (!exp) throw Object.assign(new Error('Expense not found'), { status: 404 });

      const amount = parseFloat(exp.amount);

      // Reverse the account transaction (add back)
      const [acct] = await tx.select().from(financialAccounts)
        .where(eq(financialAccounts.id, exp.accountId));

      if (acct) {
        const newBalance = parseFloat(acct.currentBalance) + amount;
        await tx.update(financialAccounts)
          .set({ currentBalance: String(newBalance.toFixed(2)), updatedAt: new Date() })
          .where(eq(financialAccounts.id, acct.id));

        await tx.insert(accountTransactions).values({
          tenantId, accountId: acct.id,
          type:          'deposit',
          direction:     'in',
          amount:        String(amount.toFixed(2)),
          balanceAfter:  String(newBalance.toFixed(2)),
          notes:         `Expense reversal`,
          referenceType: 'expense_reversal',
          referenceId:   exp.id,
        });
      }

      await tx.delete(expenses).where(eq(expenses.id, id));
      return { deleted: true };
    });
  },
};

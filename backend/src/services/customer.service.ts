import { eq, and, ilike, or, sql, desc } from 'drizzle-orm';
import { db } from '../db/index';
import { customers, customerLedger } from '../db/schema/index';
import type { CreateCustomerInput, UpdateCustomerInput } from '../validators/customer.validator';

export interface CustomerListOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export const customerService = {
  async list(tenantId: string, opts: CustomerListOptions = {}) {
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;

    const where = and(
      eq(customers.tenantId, tenantId),
      eq(customers.isActive, true),
      opts.search?.trim()
        ? or(
            ilike(customers.name,  `%${opts.search}%`),
            ilike(customers.email, `%${opts.search}%`),
            ilike(customers.phone, `%${opts.search}%`),
          )
        : undefined,
    );

    const [data, [countRow]] = await Promise.all([
      db.query.customers.findMany({
        where,
        limit,
        offset,
        orderBy: (c, { asc }) => [asc(c.name)],
      }),
      db.select({ total: sql<number>`cast(count(*) as integer)` }).from(customers).where(where),
    ]);

    return { data, total: countRow.total, page, limit, totalPages: Math.ceil(countRow.total / limit) };
  },

  async get(tenantId: string, id: string) {
    return db.query.customers.findFirst({
      where: and(eq(customers.id, id), eq(customers.tenantId, tenantId)),
    });
  },

  async create(tenantId: string, input: CreateCustomerInput) {
    const [customer] = await db
      .insert(customers)
      .values({ ...input, email: input.email || null, tenantId })
      .returning();
    return customer;
  },

  async update(tenantId: string, id: string, input: UpdateCustomerInput) {
    const [customer] = await db
      .update(customers)
      .set({
        ...input,
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .returning();
    return customer ?? null;
  },

  async delete(tenantId: string, id: string) {
    await db
      .update(customers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
  },

  async getBalance(tenantId: string, customerId: string): Promise<number> {
    const [last] = await db
      .select({ bal: customerLedger.balanceAfter })
      .from(customerLedger)
      .where(and(eq(customerLedger.tenantId, tenantId), eq(customerLedger.customerId, customerId)))
      .orderBy(desc(customerLedger.createdAt))
      .limit(1);
    return last ? parseFloat(last.bal) : 0;
  },

  async setOpeningBalance(tenantId: string, customerId: string, amount: number, notes: string | undefined, userId: string) {
    const current = await customerService.getBalance(tenantId, customerId);
    const diff    = amount - current;
    if (diff === 0) return;

    const isDebit = diff > 0;
    await db.insert(customerLedger).values({
      tenantId, customerId,
      type:          'adjustment',
      referenceType: 'opening_balance',
      debit:         isDebit ? String(diff.toFixed(2))         : '0',
      credit:        isDebit ? '0'                             : String(Math.abs(diff).toFixed(2)),
      balanceAfter:  String(amount.toFixed(2)),
      notes:         notes ?? `Opening balance set to ${amount.toFixed(2)}`,
      createdBy:     userId,
    });
  },

  async getLedger(tenantId: string, customerId: string, page = 1, limit = 30) {
    const offset = (page - 1) * limit;
    const where  = and(eq(customerLedger.tenantId, tenantId), eq(customerLedger.customerId, customerId));

    const [rows, [{ cnt }]] = await Promise.all([
      db.query.customerLedger.findMany({
        where,
        with: { createdByUser: { columns: { id: true, name: true } } },
        orderBy: [desc(customerLedger.createdAt)],
        limit, offset,
      }),
      db.select({ cnt: sql<string>`count(*)` }).from(customerLedger).where(where),
    ]);

    const currentBalance = rows[0] ? parseFloat(rows[0].balanceAfter) : 0;
    return { data: rows, total: Number(cnt), page, limit, totalPages: Math.ceil(Number(cnt) / limit), currentBalance };
  },
};

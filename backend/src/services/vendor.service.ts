import { eq, and, ilike, or, sql, desc, asc, gte, lte, lt } from 'drizzle-orm';
import { db } from '../db/index';
import { vendors, vendorLedger } from '../db/schema/index';
import type { CreateVendorInput, UpdateVendorInput } from '../validators/vendor.validator';

export interface VendorListOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export const vendorService = {
  async list(tenantId: string, opts: VendorListOptions = {}) {
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;

    const where = and(
      eq(vendors.tenantId, tenantId),
      eq(vendors.isActive, true),
      opts.search?.trim()
        ? or(
            ilike(vendors.name,          `%${opts.search}%`),
            ilike(vendors.email,         `%${opts.search}%`),
            ilike(vendors.phone,         `%${opts.search}%`),
            ilike(vendors.contactPerson, `%${opts.search}%`),
          )
        : undefined,
    );

    const [data, [countRow]] = await Promise.all([
      db.query.vendors.findMany({
        where,
        limit,
        offset,
        orderBy: (v, { asc }) => [asc(v.name)],
      }),
      db.select({ total: sql<number>`cast(count(*) as integer)` }).from(vendors).where(where),
    ]);

    return { data, total: countRow.total, page, limit, totalPages: Math.ceil(countRow.total / limit) };
  },

  async get(tenantId: string, id: string) {
    return db.query.vendors.findFirst({
      where: and(eq(vendors.id, id), eq(vendors.tenantId, tenantId)),
    });
  },

  async create(tenantId: string, input: CreateVendorInput) {
    const [vendor] = await db
      .insert(vendors)
      .values({ ...input, email: input.email || null, tenantId })
      .returning();
    return vendor;
  },

  async update(tenantId: string, id: string, input: UpdateVendorInput) {
    const [vendor] = await db
      .update(vendors)
      .set({
        ...input,
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(vendors.id, id), eq(vendors.tenantId, tenantId)))
      .returning();
    return vendor ?? null;
  },

  async delete(tenantId: string, id: string) {
    await db
      .update(vendors)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(vendors.id, id), eq(vendors.tenantId, tenantId)));
  },

  async getBalance(tenantId: string, vendorId: string): Promise<number> {
    const [last] = await db
      .select({ bal: vendorLedger.balanceAfter })
      .from(vendorLedger)
      .where(and(eq(vendorLedger.tenantId, tenantId), eq(vendorLedger.vendorId, vendorId)))
      .orderBy(desc(vendorLedger.createdAt))
      .limit(1);
    return last ? parseFloat(last.bal) : 0;
  },

  async setOpeningBalance(tenantId: string, vendorId: string, amount: number, notes: string | undefined, userId: string) {
    const current = await vendorService.getBalance(tenantId, vendorId);
    const diff    = amount - current;
    if (diff === 0) return;

    const isCredit = diff > 0;
    await db.insert(vendorLedger).values({
      tenantId, vendorId,
      type:         'adjustment',
      referenceType: 'opening_balance',
      debit:        isCredit ? '0'                        : String(Math.abs(diff).toFixed(2)),
      credit:       isCredit ? String(diff.toFixed(2))    : '0',
      balanceAfter: String(amount.toFixed(2)),
      notes:        notes ?? `Opening balance set to ${amount.toFixed(2)}`,
      createdBy:    userId,
    });
  },

  async getLedger(
    tenantId: string,
    vendorId: string,
    page     = 1,
    limit    = 30,
    dateFrom?: string,
    dateTo?:   string,
  ) {
    const offset = (page - 1) * limit;

    const baseConditions = [
      eq(vendorLedger.tenantId, tenantId),
      eq(vendorLedger.vendorId, vendorId),
    ] as const;

    const dateConditions = [
      dateFrom ? gte(vendorLedger.createdAt, new Date(`${dateFrom}T00:00:00`)) : undefined,
      dateTo   ? lte(vendorLedger.createdAt, new Date(`${dateTo}T23:59:59`))   : undefined,
    ].filter(Boolean);

    const where = and(...baseConditions, ...dateConditions);

    // Opening balance: last entry strictly before dateFrom
    const openingBalanceRow = dateFrom
      ? await db
          .select({ bal: vendorLedger.balanceAfter })
          .from(vendorLedger)
          .where(and(
            eq(vendorLedger.tenantId, tenantId),
            eq(vendorLedger.vendorId, vendorId),
            lt(vendorLedger.createdAt, new Date(`${dateFrom}T00:00:00`)),
          ))
          .orderBy(desc(vendorLedger.createdAt))
          .limit(1)
      : [];

    const [rows, [{ cnt }]] = await Promise.all([
      db.query.vendorLedger.findMany({
        where,
        with: { createdByUser: { columns: { id: true, name: true } } },
        orderBy: [asc(vendorLedger.createdAt)],
        limit, offset,
      }),
      db.select({ cnt: sql<string>`count(*)` }).from(vendorLedger).where(where),
    ]);

    // Current balance = last entry overall (not filtered)
    const [lastEntry] = await db
      .select({ bal: vendorLedger.balanceAfter })
      .from(vendorLedger)
      .where(and(eq(vendorLedger.tenantId, tenantId), eq(vendorLedger.vendorId, vendorId)))
      .orderBy(desc(vendorLedger.createdAt))
      .limit(1);

    const closingBalance = rows.length > 0
      ? parseFloat(rows[rows.length - 1].balanceAfter)
      : (openingBalanceRow[0] ? parseFloat(openingBalanceRow[0].bal) : 0);

    return {
      data:           rows,
      total:          Number(cnt),
      page,
      limit,
      totalPages:     Math.ceil(Number(cnt) / limit),
      currentBalance: lastEntry ? parseFloat(lastEntry.bal) : 0,
      openingBalance: openingBalanceRow[0] ? parseFloat(openingBalanceRow[0].bal) : 0,
      closingBalance,
      dateFrom:       dateFrom ?? null,
      dateTo:         dateTo   ?? null,
    };
  },
};

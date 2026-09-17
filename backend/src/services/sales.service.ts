import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '../db';
import { salesInvoices, salesInvoiceItems, salesPayments } from '../db/schema';
import { inventory, stockMovements }                        from '../db/schema';
import { financialAccounts, accountTransactions }           from '../db/schema';
import { customerLedger }                                   from '../db/schema';
import type { z } from 'zod';
import type { createSaleSchema, addSalePaymentSchema } from '../validators/sales.validator';

export type CreateSaleInput      = z.infer<typeof createSaleSchema>;
export type AddSalePaymentInput  = z.infer<typeof addSalePaymentSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function nextInvoiceNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const [{ cnt }] = await db
    .select({ cnt: sql<string>`count(*)` })
    .from(salesInvoices)
    .where(and(
      eq(salesInvoices.tenantId, tenantId),
      sql`EXTRACT(YEAR FROM created_at) = ${year}`,
    ));
  const seq = (parseInt(cnt, 10) + 1).toString().padStart(4, '0');
  return `INV-${year}-${seq}`;
}

// ─── Customer ledger helper ───────────────────────────────────────────────────
// type='sale'    → debit (customer owes us more)
// type='payment' → credit (customer pays us, balance reduces)

async function postCustomerLedger(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  tenantId: string,
  customerId: string,
  referenceId: string,
  invoiceNumber: string,
  amount: number,
  type: 'sale' | 'payment',
  userId: string,
) {
  const [last] = await tx
    .select({ bal: customerLedger.balanceAfter })
    .from(customerLedger)
    .where(and(eq(customerLedger.tenantId, tenantId), eq(customerLedger.customerId, customerId)))
    .orderBy(desc(customerLedger.createdAt))
    .limit(1);

  const prev       = last ? parseFloat(last.bal) : 0;
  const isSale     = type === 'sale';
  const newBalance = isSale ? prev + amount : Math.max(0, prev - amount);

  await tx.insert(customerLedger).values({
    tenantId, customerId,
    type,
    referenceType: 'sales_invoice',
    referenceId,
    debit:        isSale ? String(amount.toFixed(2)) : '0',
    credit:       isSale ? '0'                        : String(amount.toFixed(2)),
    balanceAfter: String(newBalance.toFixed(2)),
    notes:        isSale
      ? `Credit sale — ${invoiceNumber}`
      : `Payment received — ${invoiceNumber}`,
    createdBy: userId,
  });
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const salesService = {

  // ── List ──────────────────────────────────────────────────────────────────

  async list(tenantId: string, opts: {
    storeId?: string; status?: string; paymentStatus?: string;
    page?: number; limit?: number;
  } = {}) {
    const page   = Math.max(1, opts.page  ?? 1);
    const limit  = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [
      eq(salesInvoices.tenantId, tenantId),
      opts.storeId       ? eq(salesInvoices.storeId,       opts.storeId)       : undefined,
      opts.status        ? eq(salesInvoices.status,        opts.status as never)        : undefined,
      opts.paymentStatus ? eq(salesInvoices.paymentStatus, opts.paymentStatus as never) : undefined,
    ].filter(Boolean) as Parameters<typeof and>;

    const where = and(...conditions);

    const [rows, [{ cnt }]] = await Promise.all([
      db.query.salesInvoices.findMany({
        where,
        with: {
          store:    { columns: { id: true, name: true } },
          customer: { columns: { id: true, name: true, phone: true } },
          createdByUser: { columns: { id: true, name: true } },
          items:    { columns: { id: true, quantity: true, total: true, grossProfit: true } },
        },
        orderBy: [desc(salesInvoices.createdAt)],
        limit, offset,
      }),
      db.select({ cnt: sql<string>`count(*)` }).from(salesInvoices).where(where),
    ]);

    return { data: rows, total: Number(cnt), page, limit, totalPages: Math.ceil(Number(cnt) / limit) };
  },

  // ── Get one ───────────────────────────────────────────────────────────────

  async get(tenantId: string, id: string) {
    return db.query.salesInvoices.findFirst({
      where: and(eq(salesInvoices.id, id), eq(salesInvoices.tenantId, tenantId)),
      with: {
        store:    true,
        customer: true,
        createdByUser: { columns: { id: true, name: true } },
        items: {
          with: {
            product: { columns: { id: true, name: true, sku: true } },
            variant: { columns: { id: true, attributes: true } },
          },
        },
        payments: {
          with: { account: { columns: { id: true, name: true, category: true } } },
        },
      },
    });
  },

  // ── Create (draft) ────────────────────────────────────────────────────────

  async create(tenantId: string, userId: string, input: CreateSaleInput) {
    const invoiceNumber = await nextInvoiceNumber(tenantId);

    // Calculate line totals
    let subtotal = 0;
    let taxAmount = 0;
    let totalCost = 0;

    const lineItems = input.items.map((item) => {
      const lineSubtotal = item.quantity * item.unitPrice - (item.discountAmount ?? 0);
      const lineTax      = parseFloat(((lineSubtotal * (item.taxRate ?? 0)) / 100).toFixed(2));
      const lineTotal    = lineSubtotal + lineTax;
      subtotal  += lineSubtotal;
      taxAmount += lineTax;
      return { ...item, lineSubtotal, lineTax, lineTotal };
    });

    const discountAmount = input.discountAmount ?? 0;
    const total          = Math.max(0, subtotal + taxAmount - discountAmount);

    return db.transaction(async (tx) => {
      const [invoice] = await tx.insert(salesInvoices).values({
        tenantId, storeId: input.storeId,
        invoiceNumber, invoiceDate: input.invoiceDate,
        customerId:    input.customerId    ?? null,
        customerName:  input.customerName  ?? null,
        customerPhone: input.customerPhone ?? null,
        subtotal: String(subtotal.toFixed(2)),
        discountAmount: String(discountAmount.toFixed(2)),
        taxAmount:  String(taxAmount.toFixed(2)),
        total:      String(total.toFixed(2)),
        totalCost:  '0',
        grossProfit:'0',
        paidAmount: '0',
        balanceDue: String(total.toFixed(2)),
        notes: input.notes ?? null,
        createdBy: userId,
      }).returning();

      await tx.insert(salesInvoiceItems).values(
        lineItems.map((li) => ({
          invoiceId:      invoice.id,
          productId:      li.productId,
          variantId:      li.variantId ?? null,
          quantity:       li.quantity,
          unitPrice:      String(li.unitPrice.toFixed(2)),
          unitCost:       '0',
          discountAmount: String((li.discountAmount ?? 0).toFixed(2)),
          taxRate:        String((li.taxRate ?? 0).toFixed(2)),
          taxAmount:      String(li.lineTax.toFixed(2)),
          subtotal:       String(li.lineSubtotal.toFixed(2)),
          total:          String(li.lineTotal.toFixed(2)),
          costTotal:      '0',
          grossProfit:    '0',
          notes:          li.notes ?? null,
        })),
      );

      // Attach payments if provided
      if (input.payments?.length) {
        await tx.insert(salesPayments).values(
          input.payments.map((p) => ({
            tenantId, invoiceId: invoice.id,
            paymentMode: p.paymentMode,
            accountId:   p.accountId ?? null,
            amount:      String(parseFloat(String(p.amount)).toFixed(2)),
            paymentDate: p.paymentDate ?? input.invoiceDate,
            referenceNumber: p.referenceNumber ?? null,
            notes:       p.notes ?? null,
            createdBy:   userId,
          })),
        );
      }

      return invoice;
    });
  },

  // ── Confirm ───────────────────────────────────────────────────────────────
  // Commits stock out, updates avg cost in inventory, posts to cash/bank ledger.

  async confirm(tenantId: string, invoiceId: string, userId: string) {
    return db.transaction(async (tx) => {
      const invoice = await tx.query.salesInvoices.findFirst({
        where: and(eq(salesInvoices.id, invoiceId), eq(salesInvoices.tenantId, tenantId)),
      });
      if (!invoice)             throw Object.assign(new Error('Invoice not found'), { status: 404 });
      if (invoice.status !== 'draft') throw Object.assign(new Error('Invoice already confirmed'), { status: 409 });

      const items    = await tx.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, invoiceId));
      const payments = await tx.select().from(salesPayments).where(eq(salesPayments.invoiceId, invoiceId));

      if (items.length === 0) throw Object.assign(new Error('No items on invoice'), { status: 400 });

      // ── Pre-fetch inventory & check stock ───────────────────────────────────
      // Build a map keyed by "productId:variantId" so we only query once per item.
      const invMap = new Map<string, typeof inventory.$inferSelect>();

      for (const item of items) {
        const key = `${item.productId}:${item.variantId ?? 'null'}`;
        if (!invMap.has(key)) {
          const [inv] = await tx.select().from(inventory).where(and(
            eq(inventory.tenantId, tenantId),
            eq(inventory.storeId,  invoice.storeId),
            eq(inventory.productId, item.productId),
            item.variantId ? eq(inventory.variantId, item.variantId) : isNull(inventory.variantId),
          ));
          invMap.set(key, inv);
        }
      }

      // Aggregate required quantities per inventory row (handles duplicate product lines)
      const requiredQty = new Map<string, number>();
      for (const item of items) {
        const key = `${item.productId}:${item.variantId ?? 'null'}`;
        requiredQty.set(key, (requiredQty.get(key) ?? 0) + item.quantity);
      }

      // Collect ALL shortfalls before throwing so the error lists every problem at once
      const shortfalls: string[] = [];
      for (const [key, needed] of requiredQty) {
        const inv      = invMap.get(key);
        const available = inv?.quantity ?? 0;
        if (available < needed) {
          const productId = key.split(':')[0];
          shortfalls.push(
            `Product ${productId}: need ${needed}, have ${available}`
          );
        }
      }
      if (shortfalls.length > 0) {
        throw Object.assign(
          new Error(`Insufficient stock:\n${shortfalls.join('\n')}`),
          { status: 422 },
        );
      }

      // ── Stock out + COGS ────────────────────────────────────────────────────
      let totalCost   = 0;
      let grossProfit = 0;

      for (const item of items) {
        const key = `${item.productId}:${item.variantId ?? 'null'}`;
        const inv = invMap.get(key);

        const avgCost   = inv ? parseFloat(inv.averageCost ?? '0') : 0;
        const costTotal = avgCost * item.quantity;
        const lineProfit = parseFloat(item.total) - costTotal;

        totalCost   += costTotal;
        grossProfit += lineProfit;

        // Update inventory (reduce qty, average cost stays the same on outflow)
        if (inv) {
          await tx.update(inventory)
            .set({ quantity: inv.quantity - item.quantity, updatedAt: new Date() })
            .where(eq(inventory.id, inv.id));
          // Reflect the deduction locally so duplicate lines in the same invoice
          // don't double-consume from the pre-fetched snapshot.
          invMap.set(key, { ...inv, quantity: inv.quantity - item.quantity });
        }

        // Stock movement: sale (negative qty)
        await tx.insert(stockMovements).values({
          tenantId, storeId: invoice.storeId,
          productId: item.productId, variantId: item.variantId ?? null,
          type: 'sale', quantity: -item.quantity,
          unitCost: String(avgCost.toFixed(4)),
          referenceType: 'sales_invoice', referenceId: invoiceId,
          notes: item.notes ?? null, createdBy: userId,
        });

        // Update item with actual COGS
        await tx.update(salesInvoiceItems)
          .set({
            unitCost:    String(avgCost.toFixed(4)),
            costTotal:   String(costTotal.toFixed(2)),
            grossProfit: String(lineProfit.toFixed(2)),
          })
          .where(eq(salesInvoiceItems.id, item.id));
      }

      // ── Cash / Bank payments ─────────────────────────────────────────────────
      let totalPaid = 0;

      for (const payment of payments) {
        const amount = parseFloat(payment.amount);
        totalPaid += amount;

        if (payment.paymentMode === 'cash' || payment.paymentMode === 'bank') {
          if (!payment.accountId) throw Object.assign(new Error(`Account required for ${payment.paymentMode} payment`), { status: 400 });

          const [acct] = await tx.select().from(financialAccounts)
            .where(and(eq(financialAccounts.id, payment.accountId), eq(financialAccounts.tenantId, tenantId)));
          if (!acct) throw Object.assign(new Error('Account not found'), { status: 400 });

          const newBalance = parseFloat(acct.currentBalance) + amount;

          await tx.update(financialAccounts)
            .set({ currentBalance: String(newBalance.toFixed(2)), updatedAt: new Date() })
            .where(eq(financialAccounts.id, acct.id));

          await tx.insert(accountTransactions).values({
            tenantId, accountId: acct.id,
            type: 'receipt', direction: 'in',
            amount: String(amount.toFixed(2)),
            balanceAfter: String(newBalance.toFixed(2)),
            notes: payment.notes ?? `Payment for ${invoice.invoiceNumber}`,
            referenceType: 'sales_invoice', referenceId: invoiceId,
            createdBy: userId,
          });

          // If customer is linked, record their cash/bank payment in customer ledger (reduces their balance)
          if (invoice.customerId) {
            await postCustomerLedger(tx, tenantId, invoice.customerId, invoiceId, invoice.invoiceNumber, amount, 'payment', userId);
          }

        } else if (payment.paymentMode === 'credit') {
          // Credit sale — customer owes us. Requires linked customer.
          if (!invoice.customerId) throw Object.assign(new Error('Credit sales require a linked customer account'), { status: 400 });
          await postCustomerLedger(tx, tenantId, invoice.customerId, invoiceId, invoice.invoiceNumber, amount, 'sale', userId);
        }
      }

      const total          = parseFloat(invoice.total);
      const paymentStatus  = totalPaid >= total ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

      await tx.update(salesInvoices).set({
        status: 'confirmed',
        paymentStatus,
        paidAmount:  String(totalPaid.toFixed(2)),
        balanceDue:  String(Math.max(0, total - totalPaid).toFixed(2)),
        totalCost:   String(totalCost.toFixed(2)),
        grossProfit: String(grossProfit.toFixed(2)),
        confirmedAt: new Date(),
        updatedAt:   new Date(),
      }).where(eq(salesInvoices.id, invoiceId));

      return { invoiceId, totalCost, grossProfit, paymentStatus };
    });
  },

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancel(tenantId: string, invoiceId: string) {
    const invoice = await db.query.salesInvoices.findFirst({
      where: and(eq(salesInvoices.id, invoiceId), eq(salesInvoices.tenantId, tenantId)),
    });
    if (!invoice)             throw Object.assign(new Error('Invoice not found'), { status: 404 });
    if (invoice.status !== 'draft') throw Object.assign(new Error('Only draft invoices can be cancelled'), { status: 409 });

    await db.update(salesInvoices)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(salesInvoices.id, invoiceId));
  },

  // ── Add payment (after confirmation, for credit/partial) ─────────────────

  async addPayment(tenantId: string, invoiceId: string, userId: string, input: AddSalePaymentInput) {
    return db.transaction(async (tx) => {
      const invoice = await tx.query.salesInvoices.findFirst({
        where: and(eq(salesInvoices.id, invoiceId), eq(salesInvoices.tenantId, tenantId)),
      });
      if (!invoice)                   throw Object.assign(new Error('Invoice not found'), { status: 404 });
      if (invoice.status !== 'confirmed') throw Object.assign(new Error('Invoice is not confirmed'), { status: 409 });
      if (invoice.paymentStatus === 'paid') throw Object.assign(new Error('Invoice already fully paid'), { status: 409 });

      const amount = parseFloat(String(input.amount));

      await tx.insert(salesPayments).values({
        tenantId, invoiceId,
        paymentMode: input.paymentMode,
        accountId:   input.accountId ?? null,
        amount:      String(amount.toFixed(2)),
        paymentDate: input.paymentDate,
        referenceNumber: input.referenceNumber ?? null,
        notes:       input.notes ?? null,
        createdBy:   userId,
      });

      if (input.paymentMode === 'cash' || input.paymentMode === 'bank') {
        if (!input.accountId) throw Object.assign(new Error('Account required'), { status: 400 });

        const [acct] = await tx.select().from(financialAccounts)
          .where(and(eq(financialAccounts.id, input.accountId), eq(financialAccounts.tenantId, tenantId)));
        if (!acct) throw Object.assign(new Error('Account not found'), { status: 400 });

        const newBalance = parseFloat(acct.currentBalance) + amount;
        await tx.update(financialAccounts)
          .set({ currentBalance: String(newBalance.toFixed(2)), updatedAt: new Date() })
          .where(eq(financialAccounts.id, acct.id));

        await tx.insert(accountTransactions).values({
          tenantId, accountId: acct.id,
          type: 'receipt', direction: 'in',
          amount: String(amount.toFixed(2)),
          balanceAfter: String(newBalance.toFixed(2)),
          notes: input.notes ?? `Payment for ${invoice.invoiceNumber}`,
          referenceType: 'sales_invoice', referenceId: invoiceId,
          createdBy: userId,
        });

        // Cash/bank payment on a credit invoice reduces the customer's balance
        if (invoice.customerId) {
          await postCustomerLedger(tx, tenantId, invoice.customerId, invoiceId, invoice.invoiceNumber, amount, 'payment', userId);
        }

      } else if (input.paymentMode === 'credit') {
        if (!invoice.customerId) throw Object.assign(new Error('Credit sales require a linked customer account'), { status: 400 });
        await postCustomerLedger(tx, tenantId, invoice.customerId, invoiceId, invoice.invoiceNumber, amount, 'sale', userId);
      }

      const newPaid      = parseFloat(invoice.paidAmount) + amount;
      const total        = parseFloat(invoice.total);
      const newBalance   = Math.max(0, total - newPaid);
      const paymentStatus = newPaid >= total ? 'paid' : 'partial';

      await tx.update(salesInvoices).set({
        paidAmount:    String(newPaid.toFixed(2)),
        balanceDue:    String(newBalance.toFixed(2)),
        paymentStatus, updatedAt: new Date(),
      }).where(eq(salesInvoices.id, invoiceId));

      return { invoiceId, paidAmount: newPaid, balanceDue: newBalance, paymentStatus };
    });
  },
};

import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { db } from '../db';
import {
  purchaseOrders, purchaseOrderItems,
  purchaseReceipts, purchaseReceiptItems,
  purchasePayments, vendorLedger,
} from '../db/schema';
import { inventory, stockMovements }       from '../db/schema';
import { financialAccounts, accountTransactions } from '../db/schema';
import type { CreatePOInput, UpdatePOStatusInput, CreatePRInput, AddPaymentInput } from '../validators/purchase.validator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function nextPoNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const [{ cnt }] = await db
    .select({ cnt: sql<string>`count(*)` })
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.tenantId, tenantId), sql`EXTRACT(YEAR FROM created_at) = ${year}`));
  return `PO-${year}-${String(Number(cnt) + 1).padStart(4, '0')}`;
}

async function nextPrNumber(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const [{ cnt }] = await db
    .select({ cnt: sql<string>`count(*)` })
    .from(purchaseReceipts)
    .where(and(eq(purchaseReceipts.tenantId, tenantId), sql`EXTRACT(YEAR FROM created_at) = ${year}`));
  return `PR-${year}-${String(Number(cnt) + 1).padStart(4, '0')}`;
}

function calcLineTotals(items: Array<{ quantity: number; unitPrice: number; taxRate?: number }>) {
  let subtotal = 0;
  let taxAmount = 0;
  const lines = items.map((i) => {
    const lineBase = i.quantity * i.unitPrice;
    const lineTax  = lineBase * ((i.taxRate ?? 0) / 100);
    subtotal  += lineBase;
    taxAmount += lineTax;
    return {
      taxAmount: String(lineTax.toFixed(2)),
      total:     String((lineBase + lineTax).toFixed(2)),
    };
  });
  return { lines, subtotal, taxAmount, total: subtotal + taxAmount };
}

export interface ListPOOptions  { vendorId?: string; status?: string; page?: number; limit?: number }
export interface ListPROptions  { vendorId?: string; storeId?: string; status?: string; paymentStatus?: string; page?: number; limit?: number }

// ─── Service ──────────────────────────────────────────────────────────────────

export const purchaseService = {

  // ══════════════════════════════════════════════════════════════════════════════
  // PURCHASE ORDERS
  // ══════════════════════════════════════════════════════════════════════════════

  async listPOs(tenantId: string, opts: ListPOOptions = {}) {
    const page   = Math.max(1, opts.page  ?? 1);
    const limit  = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;

    const where = and(
      eq(purchaseOrders.tenantId, tenantId),
      opts.vendorId ? eq(purchaseOrders.vendorId, opts.vendorId) : undefined,
      opts.status   ? sql`${purchaseOrders.status} = ${opts.status}` : undefined,
    );

    const [rows, [{ cnt }]] = await Promise.all([
      db.query.purchaseOrders.findMany({
        where,
        with: { vendor: true, store: true, items: { columns: { id: true } } },
        orderBy: [desc(purchaseOrders.createdAt)],
        limit, offset,
      }),
      db.select({ cnt: sql<string>`count(*)` }).from(purchaseOrders).where(where),
    ]);

    return {
      data:  rows.map((r) => ({ ...r, itemCount: r.items.length })),
      total: Number(cnt), page, limit, totalPages: Math.ceil(Number(cnt) / limit),
    };
  },

  async getPO(tenantId: string, id: string) {
    return db.query.purchaseOrders.findFirst({
      where: and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)),
      with:  {
        vendor: true,
        store:  true,
        createdByUser: { columns: { id: true, name: true } },
        items:  { with: { product: true, variant: true } },
      },
    });
  },

  async createPO(tenantId: string, input: CreatePOInput, userId: string) {
    const poNumber = await nextPoNumber(tenantId);
    const { lines, subtotal, taxAmount, total } = calcLineTotals(input.items);

    return db.transaction(async (tx) => {
      const [po] = await tx.insert(purchaseOrders).values({
        tenantId,
        vendorId:     input.vendorId,
        storeId:      input.storeId,
        poNumber,
        orderDate:    input.orderDate,
        expectedDate: input.expectedDate ?? null,
        notes:        input.notes ?? null,
        subtotal:     String(subtotal.toFixed(2)),
        taxAmount:    String(taxAmount.toFixed(2)),
        total:        String(total.toFixed(2)),
        createdBy:    userId,
      }).returning();

      await tx.insert(purchaseOrderItems).values(
        input.items.map((item, idx) => ({
          tenantId,
          poId:      po.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity:  item.quantity,
          unitPrice: String(item.unitPrice.toFixed(2)),
          taxRate:   String((item.taxRate ?? 0).toFixed(2)),
          taxAmount: lines[idx].taxAmount,
          total:     lines[idx].total,
          notes:     item.notes ?? null,
        })),
      );

      return tx.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, po.id),
        with:  { vendor: true, store: true, items: { with: { product: true, variant: true } } },
      });
    });
  },

  async updatePOStatus(tenantId: string, id: string, input: UpdatePOStatusInput) {
    const [updated] = await db
      .update(purchaseOrders)
      .set({ status: input.status, updatedAt: new Date() })
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.status, 'draft')))
      .returning();
    return updated ?? null;
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // PURCHASE RECEIPTS
  // ══════════════════════════════════════════════════════════════════════════════

  async listPRs(tenantId: string, opts: ListPROptions = {}) {
    const page   = Math.max(1, opts.page  ?? 1);
    const limit  = Math.min(100, opts.limit ?? 20);
    const offset = (page - 1) * limit;

    const where = and(
      eq(purchaseReceipts.tenantId, tenantId),
      opts.vendorId      ? eq(purchaseReceipts.vendorId,    opts.vendorId)      : undefined,
      opts.storeId       ? eq(purchaseReceipts.storeId,     opts.storeId)       : undefined,
      opts.status        ? sql`${purchaseReceipts.status} = ${opts.status}`        : undefined,
      opts.paymentStatus ? sql`${purchaseReceipts.paymentStatus} = ${opts.paymentStatus}` : undefined,
    );

    const [rows, [{ cnt }]] = await Promise.all([
      db.query.purchaseReceipts.findMany({
        where,
        with: {
          vendor:   true,
          store:    true,
          po:       { columns: { id: true, poNumber: true } },
          items:    { columns: { id: true } },
          payments: { columns: { id: true, amount: true, paymentMode: true } },
        },
        orderBy: [desc(purchaseReceipts.createdAt)],
        limit, offset,
      }),
      db.select({ cnt: sql<string>`count(*)` }).from(purchaseReceipts).where(where),
    ]);

    return {
      data:  rows.map((r) => ({ ...r, itemCount: r.items.length })),
      total: Number(cnt), page, limit, totalPages: Math.ceil(Number(cnt) / limit),
    };
  },

  async getPR(tenantId: string, id: string) {
    return db.query.purchaseReceipts.findFirst({
      where: and(eq(purchaseReceipts.id, id), eq(purchaseReceipts.tenantId, tenantId)),
      with:  {
        vendor:          true,
        store:           true,
        po:              { columns: { id: true, poNumber: true } },
        confirmedByUser: { columns: { id: true, name: true } },
        createdByUser:   { columns: { id: true, name: true } },
        items:   { with: { product: true, variant: true } },
        payments: { with: { account: { columns: { id: true, name: true, category: true } } } },
      },
    });
  },

  async createPR(tenantId: string, input: CreatePRInput, userId: string) {
    const receiptNumber = await nextPrNumber(tenantId);
    const today = new Date().toISOString().slice(0, 10);
    const { lines, subtotal, taxAmount, total } = calcLineTotals(input.items);
    const paidAmount = input.payments.reduce((s, p) => s + p.amount, 0);

    return db.transaction(async (tx) => {
      const [pr] = await tx.insert(purchaseReceipts).values({
        tenantId,
        vendorId:      input.vendorId,
        storeId:       input.storeId,
        poId:          input.poId ?? null,
        receiptNumber,
        receiptDate:   input.receiptDate,
        notes:         input.notes ?? null,
        subtotal:      String(subtotal.toFixed(2)),
        taxAmount:     String(taxAmount.toFixed(2)),
        total:         String(total.toFixed(2)),
        paidAmount:    String(paidAmount.toFixed(2)),
        balanceDue:    String(Math.max(0, total - paidAmount).toFixed(2)),
        createdBy:     userId,
      }).returning();

      await tx.insert(purchaseReceiptItems).values(
        input.items.map((item, idx) => ({
          tenantId,
          receiptId: pr.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          poItemId:  item.poItemId  ?? null,
          quantity:  item.quantity,
          unitPrice: String(item.unitPrice.toFixed(2)),
          taxRate:   String((item.taxRate ?? 0).toFixed(2)),
          taxAmount: lines[idx].taxAmount,
          total:     lines[idx].total,
          notes:     item.notes ?? null,
        })),
      );

      if (input.payments.length > 0) {
        await tx.insert(purchasePayments).values(
          input.payments.map((p) => ({
            tenantId,
            receiptId:       pr.id,
            vendorId:        input.vendorId,
            paymentDate:     p.paymentDate ?? today,
            paymentMode:     p.paymentMode,
            accountId:       p.accountId ?? null,
            amount:          String(p.amount.toFixed(2)),
            referenceNumber: p.referenceNumber ?? null,
            notes:           p.notes ?? null,
            createdBy:       userId,
          })),
        );
      }

      return pr;
    });
  },

  async confirmPR(tenantId: string, prId: string, userId: string) {
    return db.transaction(async (tx) => {
      // ── 1. Lock and validate ───────────────────────────────────────────────
      const pr = await tx.query.purchaseReceipts.findFirst({
        where: and(eq(purchaseReceipts.id, prId), eq(purchaseReceipts.tenantId, tenantId)),
      });

      if (!pr)               throw Object.assign(new Error('Receipt not found'), { status: 404 });
      if (pr.status !== 'draft') throw Object.assign(new Error('Receipt already confirmed'), { status: 409 });

      const items    = await tx.select().from(purchaseReceiptItems).where(eq(purchaseReceiptItems.receiptId, prId));
      const payments = await tx.select().from(purchasePayments).where(eq(purchasePayments.receiptId, prId));

      if (items.length === 0) throw Object.assign(new Error('No items on receipt'), { status: 400 });

      // ── 2. Inventory + stock movements ────────────────────────────────────
      for (const item of items) {
        const invWhere = and(
          eq(inventory.tenantId, tenantId),
          eq(inventory.storeId, pr.storeId),
          eq(inventory.productId, item.productId),
          item.variantId ? eq(inventory.variantId, item.variantId) : isNull(inventory.variantId),
        );

        const [existing] = await tx.select().from(inventory).where(invWhere);

        const receivedUnitPrice = parseFloat(item.unitPrice);

        if (existing) {
          // Weighted average cost: (old_qty * old_cost + new_qty * new_cost) / total_qty
          const oldQty  = existing.quantity;
          const oldCost = parseFloat(existing.averageCost ?? '0');
          const newQty  = item.quantity;
          const newAvg  = oldQty + newQty > 0
            ? (oldQty * oldCost + newQty * receivedUnitPrice) / (oldQty + newQty)
            : receivedUnitPrice;

          await tx.update(inventory)
            .set({ quantity: oldQty + newQty, averageCost: String(newAvg.toFixed(4)), updatedAt: new Date() })
            .where(eq(inventory.id, existing.id));
        } else {
          await tx.insert(inventory).values({
            tenantId, storeId: pr.storeId,
            productId: item.productId, variantId: item.variantId ?? null,
            quantity: item.quantity,
            averageCost: String(receivedUnitPrice.toFixed(4)),
          });
        }

        await tx.insert(stockMovements).values({
          tenantId, storeId: pr.storeId,
          productId: item.productId, variantId: item.variantId ?? null,
          type: 'receive', quantity: item.quantity,
          unitCost: String(receivedUnitPrice.toFixed(4)),
          referenceType: 'purchase_receipt', referenceId: prId,
          notes: item.notes, createdBy: userId,
        });

        // Update PO item received qty if linked
        if (item.poItemId) {
          await tx.update(purchaseOrderItems)
            .set({ receivedQty: sql`received_qty + ${item.quantity}` })
            .where(eq(purchaseOrderItems.id, item.poItemId));
        }
      }

      // ── 3. Process payments ───────────────────────────────────────────────
      let totalPaid = 0;

      for (const payment of payments) {
        const amount = parseFloat(payment.amount);
        totalPaid += amount;

        if (payment.paymentMode === 'cash' || payment.paymentMode === 'bank') {
          // Debit the financial account
          const [acct] = await tx.select().from(financialAccounts)
            .where(and(eq(financialAccounts.id, payment.accountId!), eq(financialAccounts.tenantId, tenantId)));

          if (!acct) throw Object.assign(new Error(`Account ${payment.accountId} not found`), { status: 400 });

          const newBalance = parseFloat(acct.currentBalance) - amount;

          await tx.update(financialAccounts)
            .set({ currentBalance: String(newBalance.toFixed(2)) })
            .where(eq(financialAccounts.id, acct.id));

          await tx.insert(accountTransactions).values({
            tenantId, accountId: acct.id,
            type: 'payment', direction: 'out',
            amount: String(amount.toFixed(2)),
            balanceAfter: String(newBalance.toFixed(2)),
            notes: payment.notes ?? `Payment for ${pr.receiptNumber}`,
            referenceType: 'purchase_receipt', referenceId: prId,
            createdBy: userId,
          });

        } else if (payment.paymentMode === 'credit') {
          // Credit vendor ledger — increases outstanding balance
          const [lastEntry] = await tx.select()
            .from(vendorLedger)
            .where(and(eq(vendorLedger.tenantId, tenantId), eq(vendorLedger.vendorId, pr.vendorId)))
            .orderBy(desc(vendorLedger.createdAt))
            .limit(1);

          const prevBalance = lastEntry ? parseFloat(lastEntry.balanceAfter) : 0;
          const newVendorBalance = prevBalance + amount;

          await tx.insert(vendorLedger).values({
            tenantId, vendorId: pr.vendorId,
            type: 'purchase',
            referenceType: 'purchase_receipt', referenceId: prId,
            debit: '0', credit: String(amount.toFixed(2)),
            balanceAfter: String(newVendorBalance.toFixed(2)),
            notes: `Credit for ${pr.receiptNumber}`,
            createdBy: userId,
          });
        }
      }

      // ── 4. Update PR status ───────────────────────────────────────────────
      const total        = parseFloat(pr.total);
      const paymentStatus = totalPaid >= total ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

      await tx.update(purchaseReceipts).set({
        status: 'confirmed', paymentStatus,
        paidAmount: String(totalPaid.toFixed(2)),
        balanceDue: String(Math.max(0, total - totalPaid).toFixed(2)),
        confirmedAt: new Date(), confirmedBy: userId, updatedAt: new Date(),
      }).where(eq(purchaseReceipts.id, prId));

      // ── 5. Update linked PO status ────────────────────────────────────────
      if (pr.poId) {
        const poItems = await tx.select().from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.poId, pr.poId));

        const allDone = poItems.every((i) => i.receivedQty >= i.quantity);
        const anyDone = poItems.some((i) => i.receivedQty > 0);
        const newPoStatus = allDone ? 'received' : anyDone ? 'partially_received' : 'sent';

        await tx.update(purchaseOrders)
          .set({ status: newPoStatus, updatedAt: new Date() })
          .where(eq(purchaseOrders.id, pr.poId));
      }

      return { success: true };
    });
  },

  async cancelPR(tenantId: string, id: string) {
    const [updated] = await db
      .update(purchaseReceipts)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(
        eq(purchaseReceipts.id, id),
        eq(purchaseReceipts.tenantId, tenantId),
        eq(purchaseReceipts.status, 'draft'),
      ))
      .returning();
    return updated ?? null;
  },

  async addPayment(tenantId: string, prId: string, input: AddPaymentInput, userId: string) {
    return db.transaction(async (tx) => {
      const pr = await tx.query.purchaseReceipts.findFirst({
        where: and(eq(purchaseReceipts.id, prId), eq(purchaseReceipts.tenantId, tenantId)),
      });

      if (!pr)                     throw Object.assign(new Error('Receipt not found'), { status: 404 });
      if (pr.status !== 'confirmed') throw Object.assign(new Error('Receipt not confirmed'), { status: 400 });
      if (pr.paymentStatus === 'paid') throw Object.assign(new Error('Receipt fully paid'), { status: 400 });

      const amount = input.amount;

      // Insert payment record
      await tx.insert(purchasePayments).values({
        tenantId, receiptId: prId, vendorId: pr.vendorId,
        paymentDate:     input.paymentDate,
        paymentMode:     input.paymentMode,
        accountId:       input.accountId ?? null,
        amount:          String(amount.toFixed(2)),
        referenceNumber: input.referenceNumber ?? null,
        notes:           input.notes ?? null,
        createdBy:       userId,
      });

      if (input.paymentMode === 'cash' || input.paymentMode === 'bank') {
        // Debit account
        const [acct] = await tx.select().from(financialAccounts)
          .where(and(eq(financialAccounts.id, input.accountId!), eq(financialAccounts.tenantId, tenantId)));

        if (!acct) throw Object.assign(new Error('Account not found'), { status: 400 });

        const newBalance = parseFloat(acct.currentBalance) - amount;
        await tx.update(financialAccounts)
          .set({ currentBalance: String(newBalance.toFixed(2)) })
          .where(eq(financialAccounts.id, acct.id));

        await tx.insert(accountTransactions).values({
          tenantId, accountId: acct.id, type: 'payment', direction: 'out',
          amount: String(amount.toFixed(2)), balanceAfter: String(newBalance.toFixed(2)),
          notes: input.notes ?? `Payment for ${pr.receiptNumber}`,
          referenceType: 'purchase_receipt', referenceId: prId, createdBy: userId,
        });

        // Debit vendor ledger if there was any credit balance for this vendor
        const [lastEntry] = await tx.select()
          .from(vendorLedger)
          .where(and(eq(vendorLedger.tenantId, tenantId), eq(vendorLedger.vendorId, pr.vendorId)))
          .orderBy(desc(vendorLedger.createdAt))
          .limit(1);

        if (lastEntry && parseFloat(lastEntry.balanceAfter) > 0) {
          const prevBalance    = parseFloat(lastEntry.balanceAfter);
          const newVendorBalance = Math.max(0, prevBalance - amount);
          await tx.insert(vendorLedger).values({
            tenantId, vendorId: pr.vendorId, type: 'payment',
            referenceType: 'purchase_receipt', referenceId: prId,
            debit: String(amount.toFixed(2)), credit: '0',
            balanceAfter: String(newVendorBalance.toFixed(2)),
            notes: input.notes ?? `Payment for ${pr.receiptNumber}`, createdBy: userId,
          });
        }
      }

      // Update PR payment totals
      const newPaid      = parseFloat(pr.paidAmount) + amount;
      const total        = parseFloat(pr.total);
      const newBalance   = Math.max(0, total - newPaid);
      const payStatus    = newPaid >= total ? 'paid' : 'partial';

      await tx.update(purchaseReceipts).set({
        paidAmount: String(newPaid.toFixed(2)),
        balanceDue: String(newBalance.toFixed(2)),
        paymentStatus: payStatus,
        updatedAt: new Date(),
      }).where(eq(purchaseReceipts.id, prId));
    });
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // VENDOR LEDGER
  // ══════════════════════════════════════════════════════════════════════════════

  async getVendorLedger(tenantId: string, vendorId: string, page = 1, limit = 30) {
    const offset = (page - 1) * limit;

    const [rows, [{ cnt }]] = await Promise.all([
      db.query.vendorLedger.findMany({
        where: and(eq(vendorLedger.tenantId, tenantId), eq(vendorLedger.vendorId, vendorId)),
        with:  { createdByUser: { columns: { id: true, name: true } } },
        orderBy: [desc(vendorLedger.createdAt)],
        limit, offset,
      }),
      db.select({ cnt: sql<string>`count(*)` }).from(vendorLedger)
        .where(and(eq(vendorLedger.tenantId, tenantId), eq(vendorLedger.vendorId, vendorId))),
    ]);

    return { data: rows, total: Number(cnt), page, limit, totalPages: Math.ceil(Number(cnt) / limit) };
  },
};

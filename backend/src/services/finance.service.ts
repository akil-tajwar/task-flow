import { eq, and, desc, sql, ne, lt, gte, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db';
import { financialAccounts, accountTransactions } from '../db/schema';
import type {
  CreateAccountInput,
  UpdateAccountInput,
  SetOpeningBalanceInput,
  TransferInput,
} from '../validators/finance.validator';

export const financeService = {

  // ── Accounts ──────────────────────────────────────────────────────────────

  async listAccounts(tenantId: string) {
    return db.query.financialAccounts.findMany({
      where: and(
        eq(financialAccounts.tenantId, tenantId),
        eq(financialAccounts.isActive, true),
      ),
      with:    { store: true },
      orderBy: [
        desc(financialAccounts.isDefault),
        desc(financialAccounts.category),
        desc(financialAccounts.createdAt),
      ],
    });
  },

  async getAccount(tenantId: string, id: string) {
    return db.query.financialAccounts.findFirst({
      where: and(eq(financialAccounts.id, id), eq(financialAccounts.tenantId, tenantId)),
      with:  { store: true, transactions: { with: { createdByUser: true }, orderBy: [desc(accountTransactions.createdAt)], limit: 50 } },
    });
  },

  async createAccount(tenantId: string, input: CreateAccountInput, userId: string) {
    const { openingBalance, isDefault, ...rest } = input;

    return db.transaction(async (tx) => {
      // Swap default if needed
      if (isDefault) {
        await tx
          .update(financialAccounts)
          .set({ isDefault: false })
          .where(
            and(
              eq(financialAccounts.tenantId, tenantId),
              eq(financialAccounts.category, input.category),
              eq(financialAccounts.isDefault, true),
            ),
          );
      }

      const balance = String(openingBalance ?? 0);

      const [account] = await tx
        .insert(financialAccounts)
        .values({
          ...rest,
          tenantId,
          storeId:        rest.storeId ?? null,
          bankName:       rest.bankName ?? null,
          accountNumber:  rest.accountNumber ?? null,
          ifscCode:       rest.ifscCode ?? null,
          branchName:     rest.branchName ?? null,
          notes:          rest.notes ?? null,
          openingBalance: balance,
          currentBalance: balance,
          isDefault:      isDefault ?? false,
        })
        .returning();

      // Record opening balance transaction if > 0
      if (openingBalance && openingBalance > 0) {
        await tx.insert(accountTransactions).values({
          tenantId,
          accountId:    account.id,
          type:         'opening_balance',
          direction:    'in',
          amount:       balance,
          balanceAfter: balance,
          notes:        input.notes ?? 'Opening balance',
          createdBy:    userId,
        });
      }

      return account;
    });
  },

  async updateAccount(tenantId: string, id: string, input: UpdateAccountInput) {
    const { isDefault, ...rest } = input;

    return db.transaction(async (tx) => {
      if (isDefault) {
        const [current] = await tx
          .select({ category: financialAccounts.category })
          .from(financialAccounts)
          .where(and(eq(financialAccounts.id, id), eq(financialAccounts.tenantId, tenantId)));

        if (current) {
          await tx
            .update(financialAccounts)
            .set({ isDefault: false })
            .where(
              and(
                eq(financialAccounts.tenantId, tenantId),
                eq(financialAccounts.category, current.category),
                eq(financialAccounts.isDefault, true),
                ne(financialAccounts.id, id),
              ),
            );
        }
      }

      const [account] = await tx
        .update(financialAccounts)
        .set({ ...rest, ...(isDefault !== undefined ? { isDefault } : {}), updatedAt: new Date() })
        .where(and(eq(financialAccounts.id, id), eq(financialAccounts.tenantId, tenantId)))
        .returning();

      return account ?? null;
    });
  },

  async deleteAccount(tenantId: string, id: string) {
    await db
      .update(financialAccounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(financialAccounts.id, id), eq(financialAccounts.tenantId, tenantId)));
  },

  // ── Opening balance ────────────────────────────────────────────────────────
  // Sets the opening balance and rebuilds currentBalance = openingBalance + later txns.

  async setOpeningBalance(
    tenantId: string,
    accountId: string,
    input: SetOpeningBalanceInput,
    userId: string,
  ) {
    const { openingBalance, notes } = input;

    return db.transaction(async (tx) => {
      // Verify account belongs to tenant
      const account = await tx.query.financialAccounts.findFirst({
        where: and(eq(financialAccounts.id, accountId), eq(financialAccounts.tenantId, tenantId)),
      });
      if (!account) throw new Error('Account not found');

      // Remove old opening_balance entry
      await tx
        .delete(accountTransactions)
        .where(
          and(
            eq(accountTransactions.accountId, accountId),
            eq(accountTransactions.type, 'opening_balance'),
          ),
        );

      const newOB = String(openingBalance);

      // Sum all non-opening-balance transactions to recalculate current balance
      const [txSum] = await tx
        .select({
          inSum:  sql<string>`coalesce(sum(case when direction='in' then amount::numeric else 0 end), 0)`,
          outSum: sql<string>`coalesce(sum(case when direction='out' then amount::numeric else 0 end), 0)`,
        })
        .from(accountTransactions)
        .where(
          and(
            eq(accountTransactions.accountId, accountId),
            ne(accountTransactions.type, 'opening_balance'),
          ),
        );

      const currentBalance =
        openingBalance +
        parseFloat(txSum?.inSum ?? '0') -
        parseFloat(txSum?.outSum ?? '0');

      // Upsert opening_balance transaction
      if (openingBalance > 0) {
        await tx.insert(accountTransactions).values({
          tenantId,
          accountId,
          type:         'opening_balance',
          direction:    'in',
          amount:       newOB,
          balanceAfter: String(currentBalance),
          notes:        notes ?? 'Opening balance',
          createdBy:    userId,
        });
      }

      // Update account balances
      const [updated] = await tx
        .update(financialAccounts)
        .set({
          openingBalance: newOB,
          currentBalance: String(currentBalance),
          updatedAt:      new Date(),
        })
        .where(and(eq(financialAccounts.id, accountId), eq(financialAccounts.tenantId, tenantId)))
        .returning();

      return updated;
    });
  },

  // ── Transfers ─────────────────────────────────────────────────────────────

  async transfer(tenantId: string, userId: string, input: TransferInput) {
    return db.transaction(async (tx) => {
      const [fromAcct, toAcct] = await Promise.all([
        tx.query.financialAccounts.findFirst({
          where: and(eq(financialAccounts.id, input.fromAccountId), eq(financialAccounts.tenantId, tenantId)),
        }),
        tx.query.financialAccounts.findFirst({
          where: and(eq(financialAccounts.id, input.toAccountId), eq(financialAccounts.tenantId, tenantId)),
        }),
      ]);

      if (!fromAcct) throw Object.assign(new Error('Source account not found'), { status: 404 });
      if (!toAcct)   throw Object.assign(new Error('Destination account not found'), { status: 404 });

      const amount       = parseFloat(String(input.amount));
      const fromBalance  = parseFloat(fromAcct.currentBalance);

      if (fromAcct.accountType !== 'overdraft' && fromBalance < amount) {
        throw Object.assign(
          new Error(`Insufficient balance in "${fromAcct.name}". Available: ${fromBalance.toFixed(2)}`),
          { status: 422 },
        );
      }

      const newFromBalance = fromBalance - amount;
      const newToBalance   = parseFloat(toAcct.currentBalance) + amount;
      const transferId     = crypto.randomUUID();
      const transferDate   = input.transferDate ?? new Date().toISOString().slice(0, 10);
      const notes          = input.notes ?? null;
      const ref            = input.referenceNumber ?? null;

      await Promise.all([
        tx.update(financialAccounts)
          .set({ currentBalance: String(newFromBalance.toFixed(2)), updatedAt: new Date() })
          .where(eq(financialAccounts.id, fromAcct.id)),
        tx.update(financialAccounts)
          .set({ currentBalance: String(newToBalance.toFixed(2)), updatedAt: new Date() })
          .where(eq(financialAccounts.id, toAcct.id)),
      ]);

      await tx.insert(accountTransactions).values([
        {
          tenantId, accountId: fromAcct.id,
          type: 'transfer_out', direction: 'out',
          amount: String(amount.toFixed(2)),
          balanceAfter: String(newFromBalance.toFixed(2)),
          referenceType: 'transfer', referenceId: transferId,
          notes: notes ?? `Transfer to ${toAcct.name}`,
          createdBy: userId,
        },
        {
          tenantId, accountId: toAcct.id,
          type: 'transfer_in', direction: 'in',
          amount: String(amount.toFixed(2)),
          balanceAfter: String(newToBalance.toFixed(2)),
          referenceType: 'transfer', referenceId: transferId,
          notes: notes ?? `Transfer from ${fromAcct.name}`,
          createdBy: userId,
        },
      ]);

      return {
        transferId, transferDate, amount, ref, notes,
        from: { id: fromAcct.id, name: fromAcct.name, category: fromAcct.category, balanceAfter: newFromBalance },
        to:   { id: toAcct.id,   name: toAcct.name,   category: toAcct.category,   balanceAfter: newToBalance },
      };
    });
  },

  async listTransfers(tenantId: string, page = 1, limit = 30) {
    const offset = (Math.max(1, page) - 1) * limit;

    const txOut    = alias(accountTransactions, 'txn_out');
    const txIn     = alias(accountTransactions, 'txn_in');
    const acctFrom = alias(financialAccounts, 'acct_from');
    const acctTo   = alias(financialAccounts, 'acct_to');

    const baseWhere = and(
      eq(txOut.tenantId,      tenantId),
      eq(txOut.type,          'transfer_out'),
      eq(txOut.referenceType, 'transfer'),
    );

    const [rows, [countRow]] = await Promise.all([
      db.select({
        transferId:      txOut.referenceId,
        amount:          txOut.amount,
        notes:           txOut.notes,
        createdAt:       txOut.createdAt,
        fromAccountId:   txOut.accountId,
        fromAccountName: acctFrom.name,
        fromCategory:    acctFrom.category,
        toAccountId:     txIn.accountId,
        toAccountName:   acctTo.name,
        toCategory:      acctTo.category,
        createdBy:       txOut.createdBy,
      })
      .from(txOut)
      .innerJoin(txIn,     and(eq(txIn.referenceId, txOut.referenceId), eq(txIn.type, 'transfer_in')))
      .innerJoin(acctFrom, eq(acctFrom.id, txOut.accountId))
      .innerJoin(acctTo,   eq(acctTo.id,   txIn.accountId))
      .where(baseWhere)
      .orderBy(desc(txOut.createdAt))
      .limit(limit)
      .offset(offset),

      db.select({ total: sql<number>`cast(count(*) as integer)` })
        .from(txOut)
        .where(baseWhere),
    ]);

    return { data: rows, total: countRow.total, page, limit, totalPages: Math.ceil(countRow.total / limit) };
  },

  // ── Account Ledger (date-ranged, with opening balance) ───────────────────

  async getLedger(tenantId: string, accountId: string, dateFrom?: string, dateTo?: string) {
    const acct = await db.query.financialAccounts.findFirst({
      where: and(eq(financialAccounts.id, accountId), eq(financialAccounts.tenantId, tenantId)),
    });
    if (!acct) return null;

    // Opening balance = sum of all transactions strictly before dateFrom
    let openingBalance = parseFloat(acct.openingBalance);
    if (dateFrom) {
      const cutoff = new Date(dateFrom);
      const [ob] = await db.select({
        inSum:  sql<string>`coalesce(sum(case when direction='in'  then amount::numeric else 0 end), 0)`,
        outSum: sql<string>`coalesce(sum(case when direction='out' then amount::numeric else 0 end), 0)`,
      }).from(accountTransactions)
        .where(and(
          eq(accountTransactions.accountId, accountId),
          lt(accountTransactions.createdAt, cutoff),
        ));
      openingBalance = parseFloat(acct.openingBalance)
        + parseFloat(ob?.inSum ?? '0')
        - parseFloat(ob?.outSum ?? '0');
    }

    // Transactions in range — ASC so we can compute running balance
    const conds = [
      eq(accountTransactions.accountId, accountId),
      dateFrom ? gte(accountTransactions.createdAt, new Date(dateFrom))           : undefined,
      dateTo   ? lte(accountTransactions.createdAt, new Date(`${dateTo}T23:59:59`)) : undefined,
    ].filter(Boolean) as Parameters<typeof and>;

    const rows = await db.query.accountTransactions.findMany({
      where: and(...conds),
      with:  { createdByUser: { columns: { id: true, name: true } } },
      orderBy: [accountTransactions.createdAt],
    });

    // Attach running balance
    let running = openingBalance;
    const transactions = rows.map((t) => {
      const amt = parseFloat(t.amount);
      running = t.direction === 'in' ? running + amt : running - amt;
      return { ...t, runningBalance: parseFloat(running.toFixed(2)) };
    });

    const totalIn  = rows.filter((t) => t.direction === 'in' ).reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalOut = rows.filter((t) => t.direction === 'out').reduce((s, t) => s + parseFloat(t.amount), 0);

    return {
      account: acct,
      openingBalance: parseFloat(openingBalance.toFixed(2)),
      closingBalance: parseFloat(running.toFixed(2)),
      totalIn:  parseFloat(totalIn.toFixed(2)),
      totalOut: parseFloat(totalOut.toFixed(2)),
      transactions,
      dateFrom: dateFrom ?? null,
      dateTo:   dateTo   ?? null,
    };
  },

  // ── Transactions ──────────────────────────────────────────────────────────

  async listTransactions(tenantId: string, accountId: string, page = 1, limit = 30) {
    const offset = (Math.max(1, page) - 1) * limit;
    const where  = and(
      eq(accountTransactions.tenantId, tenantId),
      eq(accountTransactions.accountId, accountId),
    );

    const [data, [countRow]] = await Promise.all([
      db.query.accountTransactions.findMany({
        where,
        with:    { createdByUser: true },
        limit,
        offset,
        orderBy: [desc(accountTransactions.createdAt)],
      }),
      db.select({ total: sql<number>`cast(count(*) as integer)` })
        .from(accountTransactions)
        .where(where),
    ]);

    return { data, total: countRow.total, page, limit, totalPages: Math.ceil(countRow.total / limit) };
  },
};

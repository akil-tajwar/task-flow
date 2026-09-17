import { eq, and, isNull, ilike, or, sql, desc } from 'drizzle-orm';
import { db } from '../db';
import { inventory, stockMovements, stockTransfers, stockTransferItems, products, productVariants, stores, users } from '../db/schema';
import type { AdjustStockInput, CreateTransferInput, OpeningBalanceInput } from '../validators/inventory.validator';

// Delta direction by movement type (all adjust calls pass positive quantity)
const MOVEMENT_DELTA: Record<string, 1 | -1> = {
  receive:    1,
  adjustment: 1,   // UI sends positive for add, negative for remove via 'adjustment_remove'
  transfer_in: 1,
  return:     1,
  sale:       -1,
  transfer_out: -1,
  damage:     -1,
};

function buildInventoryWhere(storeId: string, productId: string, variantId?: string | null) {
  return and(
    eq(inventory.storeId, storeId),
    eq(inventory.productId, productId),
    variantId ? eq(inventory.variantId, variantId) : isNull(inventory.variantId),
  );
}

export interface InventoryListOptions {
  storeId?:   string;
  productId?: string;
  search?:    string;
  page?:      number;
  limit?:     number;
}

export interface MovementListOptions {
  storeId?:   string;
  productId?: string;
  page?:      number;
  limit?:     number;
}

export const inventoryService = {
  // ─── Stock levels ──────────────────────────────────────────────────────────

  async list(tenantId: string, opts: InventoryListOptions = {}) {
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
    const offset = (page - 1) * limit;

    const where = and(
      eq(inventory.tenantId, tenantId),
      opts.storeId   ? eq(inventory.storeId, opts.storeId)     : undefined,
      opts.productId ? eq(inventory.productId, opts.productId)  : undefined,
    );

    // If search provided, filter via a sub-select on products
    let searchWhere = where;
    if (opts.search?.trim()) {
      const pattern = `%${opts.search.trim()}%`;
      const matchingProductIds = await db.select({ id: products.id }).from(products)
        .where(or(ilike(products.name, pattern), ilike(products.sku, pattern)));
      const ids = matchingProductIds.map((p) => p.id);
      if (!ids.length) return { data: [], total: 0, page, limit, totalPages: 0 };
      searchWhere = and(where, sql`${inventory.productId} = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)}])`);
    }

    const [data, [countRow]] = await Promise.all([
      db.query.inventory.findMany({
        where: searchWhere,
        with: { store: true, product: true, variant: true },
        limit,
        offset,
        orderBy: (inv, { asc }) => [asc(inv.productId)],
      }),
      db.select({ total: sql<number>`cast(count(*) as integer)` }).from(inventory).where(searchWhere),
    ]);

    return { data, total: countRow.total, page, limit, totalPages: Math.ceil(countRow.total / limit) };
  },

  // Get aggregate stock across all stores for a single product/variant
  async getProductStock(tenantId: string, productId: string, variantId?: string) {
    const rows = await db.query.inventory.findMany({
      where: and(
        eq(inventory.tenantId, tenantId),
        eq(inventory.productId, productId),
        variantId ? eq(inventory.variantId, variantId) : isNull(inventory.variantId),
      ),
      with: { store: true },
    });
    return rows;
  },

  // ─── Adjust stock ──────────────────────────────────────────────────────────

  async adjust(tenantId: string, input: AdjustStockInput, userId: string) {
    const { storeId, productId, variantId, type, quantity, notes } = input;
    const delta = (MOVEMENT_DELTA[type] ?? 1) * quantity;

    await db.transaction(async (tx) => {
      const existing = await tx.query.inventory.findFirst({
        where: and(eq(inventory.tenantId, tenantId), buildInventoryWhere(storeId, productId, variantId)),
      });

      const newQty = Math.max(0, (existing?.quantity ?? 0) + delta);

      if (existing) {
        await tx.update(inventory)
          .set({ quantity: newQty, updatedAt: new Date() })
          .where(eq(inventory.id, existing.id));
      } else {
        await tx.insert(inventory).values({
          tenantId, storeId, productId,
          variantId: variantId ?? null,
          quantity: Math.max(0, delta),
          updatedAt: new Date(),
        });
      }

      await tx.insert(stockMovements).values({
        tenantId, storeId, productId,
        variantId: variantId ?? null,
        type: type as any,
        quantity: delta,
        referenceType: 'manual',
        notes: notes ?? null,
        createdBy: userId,
      });
    });
  },

  // ─── Transfer stock ────────────────────────────────────────────────────────

  async transfer(tenantId: string, input: CreateTransferInput, userId: string) {
    return db.transaction(async (tx) => {
      // Validate source has enough stock for every item
      for (const item of input.items) {
        const src = await tx.query.inventory.findFirst({
          where: and(
            eq(inventory.tenantId, tenantId),
            buildInventoryWhere(input.fromStoreId, item.productId, item.variantId),
          ),
        });
        const available = (src?.quantity ?? 0) - (src?.reservedQuantity ?? 0);
        if (available < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}. Available: ${available}, requested: ${item.quantity}`);
        }
      }

      // Create transfer record
      const [transfer] = await tx.insert(stockTransfers).values({
        tenantId,
        fromStoreId: input.fromStoreId,
        toStoreId:   input.toStoreId,
        status:      'completed',
        notes:       input.notes ?? null,
        createdBy:   userId,
        completedAt: new Date(),
      }).returning();

      // Process each item
      for (const item of input.items) {
        const { productId, variantId, quantity } = item;

        // Insert transfer item
        await tx.insert(stockTransferItems).values({
          transferId: transfer.id, productId,
          variantId: variantId ?? null, quantity,
        });

        // Deduct from source
        const srcRow = await tx.query.inventory.findFirst({
          where: and(eq(inventory.tenantId, tenantId), buildInventoryWhere(input.fromStoreId, productId, variantId)),
        });
        if (srcRow) {
          await tx.update(inventory)
            .set({ quantity: Math.max(0, srcRow.quantity - quantity), updatedAt: new Date() })
            .where(eq(inventory.id, srcRow.id));
        }

        // Add to destination
        const dstRow = await tx.query.inventory.findFirst({
          where: and(eq(inventory.tenantId, tenantId), buildInventoryWhere(input.toStoreId, productId, variantId)),
        });
        if (dstRow) {
          await tx.update(inventory)
            .set({ quantity: dstRow.quantity + quantity, updatedAt: new Date() })
            .where(eq(inventory.id, dstRow.id));
        } else {
          await tx.insert(inventory).values({
            tenantId, storeId: input.toStoreId, productId,
            variantId: variantId ?? null, quantity, updatedAt: new Date(),
          });
        }

        // Movement records
        await tx.insert(stockMovements).values([
          {
            tenantId, storeId: input.fromStoreId, productId,
            variantId: variantId ?? null, type: 'transfer_out',
            quantity: -quantity, referenceId: transfer.id, referenceType: 'transfer',
            createdBy: userId,
          },
          {
            tenantId, storeId: input.toStoreId, productId,
            variantId: variantId ?? null, type: 'transfer_in',
            quantity, referenceId: transfer.id, referenceType: 'transfer',
            createdBy: userId,
          },
        ]);
      }

      return transfer;
    });
  },

  // ─── Opening balance template ──────────────────────────────────────────────
  // Returns all active products/variants flat with their current qty at a store.
  // Used to pre-fill the opening balance entry spreadsheet.

  async getOpeningBalanceTemplate(tenantId: string, storeId: string) {
    const [productList, existingInventory] = await Promise.all([
      db.query.products.findMany({
        where: and(eq(products.tenantId, tenantId), eq(products.isActive, true)),
        with: {
          variants: {
            where: eq(productVariants.isActive, true),
            orderBy: (v, { asc }) => [asc(v.sku)],
          },
        },
        orderBy: (p, { asc }) => [asc(p.name)],
      }),
      db.query.inventory.findMany({
        where: and(eq(inventory.tenantId, tenantId), eq(inventory.storeId, storeId)),
      }),
    ]);

    // Build quick lookup: `productId-variantId` → quantity
    const invMap: Record<string, number> = {};
    for (const row of existingInventory) {
      invMap[`${row.productId}-${row.variantId ?? 'null'}`] = row.quantity;
    }

    const rows: Array<{
      productId:        string;
      productName:      string;
      productSku:       string | null;
      variantId:        string | null;
      variantSku:       string | null;
      variantAttributes: Record<string, string> | null;
      currentQuantity:  number;
    }> = [];

    for (const product of productList) {
      if (product.hasVariants && product.variants.length) {
        for (const variant of product.variants) {
          rows.push({
            productId:         product.id,
            productName:       product.name,
            productSku:        product.sku ?? null,
            variantId:         variant.id,
            variantSku:        variant.sku ?? null,
            variantAttributes: variant.attributes as Record<string, string>,
            currentQuantity:   invMap[`${product.id}-${variant.id}`] ?? 0,
          });
        }
      } else {
        rows.push({
          productId:         product.id,
          productName:       product.name,
          productSku:        product.sku ?? null,
          variantId:         null,
          variantSku:        null,
          variantAttributes: null,
          currentQuantity:   invMap[`${product.id}-null`] ?? 0,
        });
      }
    }

    return rows;
  },

  // ─── Opening balance submission ────────────────────────────────────────────
  // Sets absolute quantities (not deltas). Records a movement of type
  // 'opening_balance' only for rows where the quantity actually changed.

  async openingBalance(tenantId: string, input: OpeningBalanceInput, userId: string) {
    const { storeId, entries, notes } = input;

    await db.transaction(async (tx) => {
      for (const entry of entries) {
        const { productId, variantId, quantity } = entry;
        const vid = variantId ?? null;

        const existing = await tx.query.inventory.findFirst({
          where: and(
            eq(inventory.tenantId, tenantId),
            buildInventoryWhere(storeId, productId, vid),
          ),
        });

        const prevQty = existing?.quantity ?? 0;
        const delta   = quantity - prevQty;

        // No change — skip
        if (delta === 0) continue;

        if (existing) {
          await tx.update(inventory)
            .set({ quantity, updatedAt: new Date() })
            .where(eq(inventory.id, existing.id));
        } else if (quantity > 0) {
          await tx.insert(inventory).values({
            tenantId, storeId, productId, variantId: vid, quantity, updatedAt: new Date(),
          });
        } else {
          continue; // quantity 0 and no existing row — nothing to do
        }

        await tx.insert(stockMovements).values({
          tenantId, storeId, productId,
          variantId: vid,
          type: 'opening_balance',
          quantity: delta,            // signed: positive = opening in, negative = correction down
          referenceType: 'manual',
          notes: notes ?? `Opening balance: ${prevQty} → ${quantity}`,
          createdBy: userId,
        });
      }
    });
  },

  // ─── Movements history ─────────────────────────────────────────────────────

  async listMovements(tenantId: string, opts: MovementListOptions = {}) {
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
    const offset = (page - 1) * limit;

    const where = and(
      eq(stockMovements.tenantId, tenantId),
      opts.storeId   ? eq(stockMovements.storeId, opts.storeId)     : undefined,
      opts.productId ? eq(stockMovements.productId, opts.productId)  : undefined,
    );

    const [data, [countRow]] = await Promise.all([
      db.query.stockMovements.findMany({
        where,
        with: { store: true, product: true, variant: true, createdByUser: true },
        limit,
        offset,
        orderBy: [desc(stockMovements.createdAt)],
      }),
      db.select({ total: sql<number>`cast(count(*) as integer)` }).from(stockMovements).where(where),
    ]);

    return { data, total: countRow.total, page, limit, totalPages: Math.ceil(countRow.total / limit) };
  },

  // ─── Store ledger (per product per store, running balance) ────────────────

  async storeLedger(
    tenantId:  string,
    storeId:   string,
    productId: string,
    opts: { variantId?: string; page?: number; limit?: number } = {},
  ) {
    const page   = Math.max(1, opts.page  ?? 1);
    const limit  = Math.min(200, Math.max(1, opts.limit ?? 50));
    const offset = (page - 1) * limit;

    // Current on-hand (all variants combined or specific variant)
    const invWhere = opts.variantId
      ? and(
          eq(inventory.tenantId, tenantId),
          eq(inventory.storeId, storeId),
          eq(inventory.productId, productId),
          eq(inventory.variantId, opts.variantId),
        )
      : and(
          eq(inventory.tenantId, tenantId),
          eq(inventory.storeId, storeId),
          eq(inventory.productId, productId),
        );

    const invRows = await db.select({ qty: inventory.quantity }).from(inventory).where(invWhere);
    const currentQty = invRows.reduce((s, r) => s + r.qty, 0);

    // Window-function query for running balance
    const variantFilter = opts.variantId
      ? sql`AND sm.variant_id = ${opts.variantId}::uuid`
      : sql``;

    const rows = await db.execute<{
      id:              string;
      type:            string;
      quantity:        number;
      reference_id:    string | null;
      reference_type:  string | null;
      notes:           string | null;
      created_at:      string;
      variant_id:      string | null;
      variant_attrs:   string | null;
      product_name:    string;
      product_sku:     string | null;
      store_name:      string;
      created_by_name: string | null;
      balance_after:   number;
      total:           number;
    }>(sql`
      WITH ledger AS (
        SELECT
          sm.id,
          sm.type,
          sm.quantity,
          sm.reference_id,
          sm.reference_type,
          sm.notes,
          sm.created_at,
          sm.variant_id,
          pv.attributes::text   AS variant_attrs,
          p.name                AS product_name,
          p.sku                 AS product_sku,
          s.name                AS store_name,
          u.name                AS created_by_name,
          SUM(sm.quantity) OVER (
            ORDER BY sm.created_at ASC, sm.id ASC
            ROWS UNBOUNDED PRECEDING
          ) AS balance_after
        FROM  stock_movements sm
        JOIN  products  p  ON p.id  = sm.product_id
        JOIN  stores    s  ON s.id  = sm.store_id
        LEFT JOIN product_variants pv ON pv.id = sm.variant_id
        LEFT JOIN users            u  ON u.id  = sm.created_by
        WHERE sm.tenant_id  = ${tenantId}::uuid
          AND sm.store_id   = ${storeId}::uuid
          AND sm.product_id = ${productId}::uuid
          ${variantFilter}
      ),
      counted AS (
        SELECT *, COUNT(*) OVER () AS total FROM ledger
      )
      SELECT * FROM counted
      ORDER BY created_at DESC, id DESC
      LIMIT  ${limit}
      OFFSET ${offset}
    `);

    const total = rows.length > 0 ? Number(rows[0].total) : 0;

    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      currentQty,
    };
  },

  // ─── Transfers history ─────────────────────────────────────────────────────

  async listTransfers(tenantId: string, opts: { page?: number; limit?: number } = {}) {
    const page  = Math.max(1, opts.page  ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;

    const where = eq(stockTransfers.tenantId, tenantId);

    const [data, [countRow]] = await Promise.all([
      db.query.stockTransfers.findMany({
        where,
        with: { fromStore: true, toStore: true, items: { with: { product: true, variant: true } }, createdByUser: true },
        limit,
        offset,
        orderBy: [desc(stockTransfers.createdAt)],
      }),
      db.select({ total: sql<number>`cast(count(*) as integer)` }).from(stockTransfers).where(where),
    ]);

    return { data, total: countRow.total, page, limit, totalPages: Math.ceil(countRow.total / limit) };
  },
};

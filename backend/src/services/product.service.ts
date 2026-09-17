import { eq, and, ilike, or, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index';
import {
  products, productUoms, productVariantOptions, productVariants,
  inventory, stores,
} from '../db/schema/index';
import type { CreateProductInput, UpdateProductInput } from '../validators/product.validator';

export interface ProductListOptions {
  page?:       number;
  limit?:      number;
  search?:     string;
  brandId?:    string;
  categoryId?: string;
}

// ─── Inventory summary helpers ────────────────────────────────────────────────

interface StoreStock {
  storeId:   string;
  storeName: string;
  storeCode: string;
  quantity:  number;
}

interface InventorySummary {
  total:  number;
  stores: StoreStock[];
}

async function fetchInventorySummary(tenantId: string, productIds: string[]): Promise<Record<string, InventorySummary>> {
  if (!productIds.length) return {};

  const rows = await db
    .select({
      productId: inventory.productId,
      quantity:  inventory.quantity,
      storeId:   inventory.storeId,
      storeName: stores.name,
      storeCode: stores.code,
    })
    .from(inventory)
    .innerJoin(stores, eq(inventory.storeId, stores.id))
    .where(
      and(
        eq(inventory.tenantId, tenantId),
        inArray(inventory.productId, productIds),
      ),
    );

  const map: Record<string, InventorySummary> = {};
  for (const row of rows) {
    if (!map[row.productId]) map[row.productId] = { total: 0, stores: [] };
    const existing = map[row.productId].stores.find((s) => s.storeId === row.storeId);
    if (existing) {
      existing.quantity += row.quantity;
    } else {
      map[row.productId].stores.push({ storeId: row.storeId, storeName: row.storeName, storeCode: row.storeCode, quantity: row.quantity });
    }
    map[row.productId].total += row.quantity;
  }
  return map;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const productService = {
  async list(tenantId: string, opts: ProductListOptions = {}) {
    const page   = Math.max(1, opts.page  ?? 1);
    const limit  = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;

    const where = and(
      eq(products.tenantId, tenantId),
      eq(products.isActive, true),
      opts.search?.trim()
        ? or(ilike(products.name, `%${opts.search}%`), ilike(products.sku, `%${opts.search}%`))
        : undefined,
      opts.brandId    ? sql`${products.brandId}    = ${opts.brandId}::uuid`    : undefined,
      opts.categoryId ? sql`${products.categoryId} = ${opts.categoryId}::uuid` : undefined,
    );

    const [data, [countRow]] = await Promise.all([
      db.query.products.findMany({
        where,
        with: { brand: true, category: true },
        limit,
        offset,
        orderBy: (p, { desc }) => [desc(p.createdAt)],
      }),
      db.select({ total: sql<number>`cast(count(*) as integer)` }).from(products).where(where),
    ]);

    const inventoryMap = await fetchInventorySummary(tenantId, data.map((p) => p.id));
    const enriched = data.map((p) => ({
      ...p,
      inventorySummary: inventoryMap[p.id] ?? { total: 0, stores: [] },
    }));

    return { data: enriched, total: countRow.total, page, limit, totalPages: Math.ceil(countRow.total / limit) };
  },

  async get(tenantId: string, id: string) {
    const product = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.tenantId, tenantId)),
      with: {
        brand:          true,
        category:       true,
        uoms:           true,
        variantOptions: true,
        variants:       {
          with: {
            inventory: { with: { store: true } },
          },
        },
        inventory: { with: { store: true } },
      },
    });
    return product ?? null;
  },

  async create(tenantId: string, input: CreateProductInput) {
    const { uoms, variantOptions, variants, basePrice, ...rest } = input;
    const hasVariants = !!(variantOptions?.length && variants?.length);

    return db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values({ ...rest, tenantId, basePrice: String(basePrice), hasVariants })
        .returning();

      if (uoms?.length) {
        await tx.insert(productUoms).values(
          uoms.map((u) => ({
            ...u,
            productId: product.id,
            tenantId,
            conversionFactor: String(u.conversionFactor),
            price: u.price !== undefined ? String(u.price) : null,
          })),
        );
      }

      if (hasVariants) {
        await tx.insert(productVariantOptions).values(
          variantOptions!.map((o) => ({ ...o, productId: product.id, tenantId })),
        );
        await tx.insert(productVariants).values(
          variants!.map((v) => ({
            ...v,
            productId: product.id,
            tenantId,
            price: v.price !== undefined ? String(v.price) : null,
          })),
        );
      }

      return product;
    });
  },

  async update(tenantId: string, id: string, input: UpdateProductInput) {
    const { basePrice, uoms, ...rest } = input;

    return db.transaction(async (tx) => {
      const [product] = await tx
        .update(products)
        .set({
          ...rest,
          ...(basePrice !== undefined ? { basePrice: String(basePrice) } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
        .returning();

      if (!product) return null;

      if (uoms !== undefined) {
        await tx.delete(productUoms).where(eq(productUoms.productId, id));
        if (uoms.length) {
          await tx.insert(productUoms).values(
            uoms.map((u) => ({
              ...u,
              productId: id,
              tenantId,
              conversionFactor: String(u.conversionFactor),
              price: u.price !== undefined ? String(u.price) : null,
            })),
          );
        }
      }

      return product;
    });
  },

  async delete(tenantId: string, id: string) {
    await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
  },
};

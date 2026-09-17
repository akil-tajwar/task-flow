import { eq, and, ne } from 'drizzle-orm';
import { db } from '../db';
import { stores } from '../db/schema';
import type { CreateStoreInput, UpdateStoreInput } from '../validators/store.validator';

export const storeService = {
  async list(tenantId: string) {
    return db.query.stores.findMany({
      where: and(eq(stores.tenantId, tenantId), eq(stores.isActive, true)),
      orderBy: (s, { asc, desc }) => [desc(s.isDefault), asc(s.name)],
    });
  },

  async get(tenantId: string, id: string) {
    return db.query.stores.findFirst({
      where: and(eq(stores.id, id), eq(stores.tenantId, tenantId), eq(stores.isActive, true)),
    });
  },

  async create(tenantId: string, input: CreateStoreInput) {
    return db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx.update(stores).set({ isDefault: false }).where(eq(stores.tenantId, tenantId));
      }
      const [store] = await tx.insert(stores).values({ ...input, tenantId }).returning();
      return store;
    });
  },

  async update(tenantId: string, id: string, input: UpdateStoreInput) {
    return db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx.update(stores).set({ isDefault: false })
          .where(and(eq(stores.tenantId, tenantId), ne(stores.id, id)));
      }
      const [store] = await tx.update(stores)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(stores.id, id), eq(stores.tenantId, tenantId)))
        .returning();
      return store ?? null;
    });
  },

  async setDefault(tenantId: string, id: string) {
    return db.transaction(async (tx) => {
      await tx.update(stores).set({ isDefault: false }).where(eq(stores.tenantId, tenantId));
      const [store] = await tx.update(stores)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(and(eq(stores.id, id), eq(stores.tenantId, tenantId)))
        .returning();
      return store ?? null;
    });
  },

  async deactivate(tenantId: string, id: string) {
    const [store] = await db.update(stores)
      .set({ isActive: false, isDefault: false, updatedAt: new Date() })
      .where(and(eq(stores.id, id), eq(stores.tenantId, tenantId)))
      .returning();
    return store ?? null;
  },
};

import { eq, and } from 'drizzle-orm';
import { db } from '../db/index';
import { categories } from '../db/schema/index';

export const categoryService = {
  async list(tenantId: string) {
    return db.query.categories.findMany({
      where: and(eq(categories.tenantId, tenantId), eq(categories.isActive, true)),
      orderBy: (c, { asc }) => [asc(c.name)],
    });
  },

  async create(tenantId: string, name: string, parentId?: string) {
    const [category] = await db
      .insert(categories)
      .values({ tenantId, name, ...(parentId ? { parentId } : {}) })
      .returning();
    return category;
  },
};

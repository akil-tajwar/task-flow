import { eq, and } from 'drizzle-orm';
import { db } from '../db/index';
import { brands } from '../db/schema/index';

export const brandService = {
  async list(tenantId: string) {
    return db.query.brands.findMany({
      where: and(eq(brands.tenantId, tenantId), eq(brands.isActive, true)),
      orderBy: (b, { asc }) => [asc(b.name)],
    });
  },

  async create(tenantId: string, name: string) {
    const [brand] = await db.insert(brands).values({ tenantId, name }).returning();
    return brand;
  },
};

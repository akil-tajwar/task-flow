import { eq, and } from 'drizzle-orm';
import { db } from '../db/index';
import { orders } from '../db/schema/index';
import type { CreateOrderInput } from '../validators/order.validator';

export const orderService = {
  async list(tenantId: string) {
    return db.query.orders.findMany({
      where: eq(orders.tenantId, tenantId),
      orderBy: (o, { desc }) => [desc(o.createdAt)],
    });
  },

  async get(tenantId: string, id: string) {
    return db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.tenantId, tenantId)),
    });
  },

  async create(tenantId: string, userId: string, input: CreateOrderInput) {
    const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = +(subtotal * 0.1).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    const [order] = await db
      .insert(orders)
      .values({
        tenantId,
        userId,
        items: input.items,
        subtotal: String(subtotal),
        tax: String(tax),
        total: String(total),
      })
      .returning();
    return order;
  },

  async updateStatus(tenantId: string, id: string, status: 'pending' | 'completed' | 'cancelled' | 'refunded') {
    const [order] = await db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
      .returning();
    return order ?? null;
  },
};

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index";
import { users, clients } from "../db/schema/index.schema";
import type {
  CreateClientInput,
  UpdateClientInput,
} from "../validators/clients.validator";

export const clientService = {
  async create(tenantId: string, input: CreateClientInput) {
    const existing = await db.query.users.findFirst({
      where: and(eq(users.email, input.email), eq(users.tenantId, tenantId)),
    });
    if (existing) throw new Error("Email already in use");

    const passwordHash = await bcrypt.hash(input.password, 12);

    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          tenantId,
          name: input.name,
          email: input.email,
          passwordHash,
          role: "client",
        })
        .returning();

      const [client] = await tx
        .insert(clients)
        .values({
          tenantId,
          userId: user.id,
          name: input.name,
          email: input.email,
          industry: input.industry,
          website: input.website,
          phone: input.phone,
          street: input.street,
          city: input.city,
          state: input.state,
          country: input.country,
          postalCode: input.postalCode,
          notes: input.notes,
        })
        .returning();

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        client,
      };
    });
  },

  async getAll(tenantId: string, page = 1, limit = 20) {
    const offset = (Math.max(1, page) - 1) * limit;
    const where = eq(clients.tenantId, tenantId);

    const [rows, [countRow]] = await Promise.all([
      db.query.clients.findMany({
        where,
        limit,
        offset,
        orderBy: (c, { desc }) => [desc(c.createdAt)],
      }),
      db
        .select({ total: db.$count(clients, where) })
        .from(clients)
        .where(where),
    ]);

    return rows;
  },

  async getById(tenantId: string, id: string) {
    const client = await db.query.clients.findFirst({
      where: and(eq(clients.id, id), eq(clients.tenantId, tenantId)),
    });
    if (!client) throw new Error("Client not found");
    return client;
  },

  async update(tenantId: string, id: string, input: UpdateClientInput) {
    const existing = await db.query.clients.findFirst({
      where: and(eq(clients.id, id), eq(clients.tenantId, tenantId)),
    });
    if (!existing) throw new Error("Client not found");

    if (input.email && input.email !== existing.email) {
      const emailTaken = await db.query.users.findFirst({
        where: and(eq(users.email, input.email), eq(users.tenantId, tenantId)),
      });
      if (emailTaken) throw new Error("Email already in use");
    }

    const hasAddressField =
      input.street !== undefined ||
      input.city !== undefined ||
      input.state !== undefined ||
      input.country !== undefined ||
      input.postalCode !== undefined;

    return db.transaction(async (tx) => {
      const [client] = await tx
        .update(clients)
        .set({
          name: input.name,
          email: input.email,
          industry: input.industry,
          website: input.website,
          phone: input.phone,
          notes: input.notes,
          ...(hasAddressField
            ? {
                address: {
                  street: input.street,
                  city: input.city,
                  state: input.state,
                  country: input.country,
                  postalCode: input.postalCode,
                },
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
        .returning();

      if (existing.userId && (input.name || input.email)) {
        await tx
          .update(users)
          .set({
            ...(input.name ? { name: input.name } : {}),
            ...(input.email ? { email: input.email } : {}),
          })
          .where(
            and(eq(users.id, existing.userId), eq(users.tenantId, tenantId)),
          );
      }

      return client;
    });
  },

  async delete(tenantId: string, id: string) {
    const existing = await db.query.clients.findFirst({
      where: and(eq(clients.id, id), eq(clients.tenantId, tenantId)),
    });
    if (!existing) throw new Error("Client not found");

    return db.transaction(async (tx) => {
      await tx
        .delete(clients)
        .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)));

      if (existing.userId) {
        await tx
          .delete(users)
          .where(
            and(eq(users.id, existing.userId), eq(users.tenantId, tenantId)),
          );
      }
    });
  },
};

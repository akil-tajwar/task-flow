import bcrypt from "bcryptjs";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index";
import { users, tenants, activityLogs } from "../db/schema/index.schema";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";
import { redis } from "../lib/redis";
import type { LoginInput, RegisterInput } from "../validators/auth.validator";

interface RequestMeta {
  ip?: string | null;
  ua?: string | null;
}

const REFRESH_TTL = 60 * 60 * 24 * 7; // 7 days

export const authService = {
  async register(input: RegisterInput) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });
    if (existing) throw new Error("Email already in use");

    let tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, input.tenantSlug),
    });
    if (!tenant) {
      [tenant] = await db
        .insert(tenants)
        .values({ name: input.tenantName, slug: input.tenantSlug })
        .returning();
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const [user] = await db
      .insert(users)
      .values({
        tenantId: tenant!.id,
        name: input.name,
        email: input.email,
        passwordHash,
        role: "admin",
      })
      .returning();

    const payload = { sub: user.id, tenantId: tenant!.id, role: user.role };
    const refreshToken = signRefreshToken(payload);
    await redis.set(`refresh:${user.id}`, refreshToken, { EX: REFRESH_TTL });

    return {
      accessToken: signAccessToken(payload),
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  },

  async login(input: LoginInput, meta?: RequestMeta) {
    try {
      console.log("1. Finding user:", input.email);

      const user = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      console.log("2. User:", user);

      if (!user) {
        throw new Error("User not found");
      }

      console.log("3. Comparing password");

      const passwordValid = await bcrypt.compare(
        input.password,
        user.passwordHash,
      );

      console.log("4. Password valid:", passwordValid);

      if (!passwordValid) {
        throw new Error("Invalid credentials");
      }

      const payload = {
        sub: user.id,
        tenantId: user.tenantId!,
        role: user.role,
      };

      console.log("5. Payload:", payload);

      const refreshToken = signRefreshToken(payload);

      console.log("6. Refresh token created");

      await redis.set(`refresh:${user.id}`, refreshToken, { EX: REFRESH_TTL });

      console.log("7. Redis success");

      await db.insert(activityLogs).values({
        tenantId: user.tenantId,
        userId: user.id,
        action: "login",
        ipAddress: meta?.ip ?? null,
        userAgent: meta?.ua ?? null,
      });

      console.log("8. Activity log success");

      return {
        accessToken: signAccessToken(payload),
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      throw error;
    }
  },

  async refresh(token: string) {
    const payload = verifyRefreshToken(token);
    const stored = await redis.get(`refresh:${payload.sub}`);
    if (stored !== token) throw new Error("Invalid refresh token");
    return { accessToken: signAccessToken(payload) };
  },

  async logout(userId: string, tenantId?: string | null, meta?: RequestMeta) {
    await Promise.all([
      redis.del(`refresh:${userId}`),
      tenantId
        ? db.insert(activityLogs).values({
            tenantId,
            userId,
            action: "logout",
            ipAddress: meta?.ip ?? null,
            userAgent: meta?.ua ?? null,
          })
        : Promise.resolve(),
    ]);
  },

  async getMe(userId: string) {
    return db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
      },
    });
  },

  async getAllUsers(tenantId: string, page = 1, limit = 20) {
    const currentPage = Math.max(1, page);
    const currentLimit = Math.max(1, limit);
    const offset = (currentPage - 1) * currentLimit;

    const where = eq(users.tenantId, tenantId);

    const [rows, [countRow]] = await Promise.all([
      db.query.users.findMany({
        where,
        columns: {
          id: true,
          tenantId: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        limit: currentLimit,
        offset,
        orderBy: [desc(users.createdAt)],
      }),

      db
        .select({
          total: db.$count(users, where),
        })
        .from(users)
        .where(where),
    ]);

    return rows
  },

  async listActivity(
    userId: string,
    tenantId: string,
    isAdmin: boolean,
    page = 1,
    limit = 20,
  ) {
    const offset = (Math.max(1, page) - 1) * limit;
    const where = isAdmin
      ? eq(activityLogs.tenantId, tenantId)
      : eq(activityLogs.userId, userId);

    const [rows, [countRow]] = await Promise.all([
      db.query.activityLogs.findMany({
        where,
        with: { user: true },
        limit,
        offset,
        orderBy: [desc(activityLogs.createdAt)],
      }),
      db
        .select({ total: db.$count(activityLogs, where) })
        .from(activityLogs)
        .where(where),
    ]);

    return {
      data: rows,
      total: Number(countRow.total),
      page,
      limit,
      totalPages: Math.ceil(Number(countRow.total) / limit),
    };
  },
};

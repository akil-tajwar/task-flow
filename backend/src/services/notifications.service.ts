import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  notifications,
  type Notification,
} from "../db/schema/notifications.schema";

export interface ListNotificationsQuery {
  isRead?: boolean;
  page?: number;
  limit?: number;
}

export interface NotificationsListResult {
  data: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const notificationService = {
  /**
   * List all notifications belonging to the given user in the tenant.
   */
  async getAllByUser(
    tenantId: string,
    userId: string,
    query: ListNotificationsQuery = {}
  ): Promise<NotificationsListResult> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions = [
      eq(notifications.tenantId, tenantId),
      eq(notifications.userId, userId),
    ];

    if (query.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, query.isRead));
    }

    const whereClause = and(...conditions);

    const [rows, [countRow], [unreadRow]] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(whereClause),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.tenantId, tenantId),
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        ),
    ]);

    const total = countRow?.count ?? 0;
    const unreadCount = unreadRow?.count ?? 0;

    return {
      data: rows,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Mark a single notification as read.
   * Scoped by tenant + userId so a user can only touch their own rows.
   */
  async markAsRead(
    tenantId: string,
    userId: string,
    notificationId: string
  ): Promise<Notification> {
    const [updated] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error("Notification not found");
    }

    return updated;
  },

  /**
   * Optional convenience: mark every unread notification for a user as read.
   */
  async markAllAsRead(tenantId: string, userId: string): Promise<number> {
    const updated = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      )
      .returning({ id: notifications.id });

    return updated.length;
  },
};

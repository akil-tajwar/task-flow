import type { Context } from "hono";
import { notificationService } from "../services/notifications.service";

export const notificationController = {
  async getAll(c: Context) {
    const currentUser = c.get("user");
    const { page, limit, isRead } = c.req.query();

    const result = await notificationService.getAllByUser(
      currentUser.tenantId,
      currentUser.id,
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        isRead:
          isRead === undefined ? undefined : isRead === "true" ? true : false,
      }
    );

    return c.json(result);
  },

  async markAsRead(c: Context) {
    const currentUser = c.get("user");
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Notification ID is required" }, 400);
    }

    const notification = await notificationService.markAsRead(
      currentUser.tenantId,
      currentUser.id,
      id
    );

    return c.json(notification);
  },

  async markAllAsRead(c: Context) {
    const currentUser = c.get("user");

    const count = await notificationService.markAllAsRead(
      currentUser.tenantId,
      currentUser.id
    );

    return c.json({ message: "All notifications marked as read", count });
  },
};

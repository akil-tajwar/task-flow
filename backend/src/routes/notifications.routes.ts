import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import { notificationController } from "../controllers/notifications.controller";

export const notificationsRoutes = new Hono();

notificationsRoutes.use("*", authMiddleware, tenantMiddleware);

notificationsRoutes.get("/getAll", notificationController.getAll);
notificationsRoutes.put("/read/:id", notificationController.markAsRead);
notificationsRoutes.put("/readAll", notificationController.markAllAsRead);
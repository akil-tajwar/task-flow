import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import { pushController } from "../controllers/push.controller";

export const pushRoutes = new Hono();

pushRoutes.use("*", authMiddleware, tenantMiddleware);

pushRoutes.post("/subscribe", pushController.subscribe);
pushRoutes.post("/unsubscribe", pushController.unsubscribe);
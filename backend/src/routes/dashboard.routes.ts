import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import { dashboardController } from "../controllers/dashboard.controller";

const dashboardRoutes = new Hono();

dashboardRoutes.use("*", authMiddleware, tenantMiddleware);
dashboardRoutes.get("/dashboard", dashboardController.get);

export { dashboardRoutes };

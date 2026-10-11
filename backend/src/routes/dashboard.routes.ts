// src/routes/dashboard.routes.ts
import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import { dashboardController } from "../controllers/dashboard.controller";

export const dashboardRoutes = new Hono();

dashboardRoutes.use("*", authMiddleware, tenantMiddleware);

// GET /dashboard
dashboardRoutes.get("/", dashboardController.getDashboard);
// src/controllers/dashboard.controller.ts
import type { Context } from "hono";
import { dashboardService } from "../services/dashboard.service";

export const dashboardController = {
  /**
   * GET /dashboard
   * Role-aware dashboard payload. Range filtering happens client-side
   * via `byRange`, so no query param is needed here.
   */
  async getDashboard(c: Context) {
    const currentUser = c.get("user");

    const data = await dashboardService.getDashboard(currentUser.tenantId, {
      id: currentUser.id,
      role: currentUser.role,
    });

    return c.json(data);
  },
};
import type { Context } from "hono";
import { dashboardService } from "../services/dashboard.service";

export const dashboardController = {
  async get(c: Context) {
    const tenantId = c.get("tenantId") as string;
    const user = c.get("user") as { role: string };
    const data = await dashboardService.get(tenantId, user.role);
    return c.json(data);
  },
};

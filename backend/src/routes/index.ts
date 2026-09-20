import { Hono } from "hono";
import { authRoutes } from "./auth.routes";
import { dashboardRoutes } from "./dashboard.routes";

const routes = new Hono();

routes.route("/auth", authRoutes);
routes.route("/dashboard", dashboardRoutes);

export { routes };

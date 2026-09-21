import { Hono } from "hono";
import { authRoutes } from "./auth.routes";
import { dashboardRoutes } from "./dashboard.routes";
import { clientsRoutes } from "./clients.routes";
import { projectsRoutes } from "./projects.routes";

const routes = new Hono();

routes.route("/auth", authRoutes);
routes.route("/dashboard", dashboardRoutes);
routes.route("/clients", clientsRoutes);
routes.route("/projects", projectsRoutes);

export { routes };

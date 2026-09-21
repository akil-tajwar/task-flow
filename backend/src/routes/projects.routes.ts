import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import {
  archiveProjectHandler,
  createProjectHandler,
  deleteProjectHandler,
  getProjectHandler,
  listProjectsHandler,
  restoreProjectHandler,
  updateProjectHandler,
} from "../controllers/projects.controller";

export const projectsRoutes = new Hono();

projectsRoutes.use("*", authMiddleware, tenantMiddleware);

projectsRoutes.post("/create", createProjectHandler);
projectsRoutes.get("/getAll", listProjectsHandler);
projectsRoutes.get("/get/:id", getProjectHandler);
projectsRoutes.patch("/update/:id", updateProjectHandler);
projectsRoutes.patch("/archive/:id", archiveProjectHandler);
projectsRoutes.patch("/restore/:id", restoreProjectHandler);
projectsRoutes.delete("/delete/:id", deleteProjectHandler);

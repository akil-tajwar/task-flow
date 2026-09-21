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

export const projects = new Hono();

projects.use("*", authMiddleware, tenantMiddleware);

projects.post("/create", createProjectHandler);
projects.get("/getAll", listProjectsHandler);
projects.get("/get/:id", getProjectHandler);
projects.patch("/update/:id", updateProjectHandler);
projects.patch("/archive/:id", archiveProjectHandler);
projects.patch("/restore/:id", restoreProjectHandler);
projects.delete("/delete/:id", deleteProjectHandler);

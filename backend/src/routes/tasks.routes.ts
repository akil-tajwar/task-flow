import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import { taskController } from "../controllers/tasks.controller";
import { commentUpload } from "../middleware/multer.middleware";
import { runMulter } from "../lib/multer";

export const tasksRoutes = new Hono();

tasksRoutes.use("*", authMiddleware, tenantMiddleware);

// =========================================================
// TASKS
// =========================================================

tasksRoutes.get("/getAll", taskController.getAll);
tasksRoutes.get("/getById/:id", taskController.getById);
tasksRoutes.post("/create", taskController.create);
tasksRoutes.put("/edit/:id", taskController.update);
tasksRoutes.delete("/delete/:id", taskController.delete);

// =========================================================
// DEPENDENCIES
// =========================================================

tasksRoutes.post("/dependencies/create", taskController.addDependency);
tasksRoutes.get("/dependencies/getAll/:taskId", taskController.getDependencies);
tasksRoutes.delete(
  "/dependencies/delete/:dependencyId",
  taskController.deleteDependency,
);

// =========================================================
// COMMENTS
// =========================================================

tasksRoutes.post(
  "/comments/create",
  runMulter(commentUpload.array("attachments", 10)),
  taskController.createComment,
);
tasksRoutes.get("/comments/getAll/:taskId", taskController.getTaskComments);
tasksRoutes.get("/comments/getById/:commentId", taskController.getCommentById);
tasksRoutes.put("/comments/update/:commentId", taskController.updateComment);
tasksRoutes.delete("/comments/delete/:commentId", taskController.deleteComment);

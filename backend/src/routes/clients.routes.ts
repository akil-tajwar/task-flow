import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import { clientController } from "../controllers/clients.controller";

export const clientsRoutes = new Hono();

clientsRoutes.use("*", authMiddleware, tenantMiddleware);

clientsRoutes.get("/getAll", clientController.getAll);
clientsRoutes.get("/getById/:id", clientController.getById);
clientsRoutes.post("/create", clientController.create);
clientsRoutes.put("/edit/:id", clientController.update);
clientsRoutes.delete("/delete/:id", clientController.delete);


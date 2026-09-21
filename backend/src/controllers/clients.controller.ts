import type { Context } from "hono";
import { clientService } from "../services/clients.service";
import {
  createClientSchema,
  updateClientSchema,
} from "../validators/clients.validator";

export const clientController = {
  async create(c: Context) {
    const currentUser = c.get("user");
    if (currentUser.role !== "admin") throw new Error("Forbidden");

    const input = createClientSchema.parse(await c.req.json());
    const result = await clientService.create(currentUser.tenantId, input);
    return c.json(result, 201);
  },

  async getAll(c: Context) {
    const currentUser = c.get("user");
    const { page, limit } = c.req.query();

    const result = await clientService.getAll(
      currentUser.tenantId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return c.json(result);
  },

  async getById(c: Context) {
    const currentUser = c.get("user");
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Client ID is required" }, 400);
    }
    const client = await clientService.getById(currentUser.tenantId, id);
    return c.json(client);
  },

  async update(c: Context) {
    const currentUser = c.get("user");
    if (currentUser.role !== "admin") throw new Error("Forbidden");

    const id = c.req.param("id");
    const input = updateClientSchema.parse(await c.req.json());
    if (!id) {
      return c.json({ error: "Client ID is required" }, 400);
    }
    const client = await clientService.update(currentUser.tenantId, id, input);
    return c.json(client);
  },

  async delete(c: Context) {
    const currentUser = c.get("user");
    if (currentUser.role !== "admin") throw new Error("Forbidden");

    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "Client ID is required" }, 400);
    }
    await clientService.delete(currentUser.tenantId, id);
    return c.json({ message: "Client deleted" });
  },
};

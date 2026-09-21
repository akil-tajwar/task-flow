import type { Context } from "hono";
import { authService } from "../services/auth.service";
import { registerSchema, loginSchema } from "../validators/auth.validator";

export const authController = {
  async register(c: Context) {
    const input = registerSchema.parse(await c.req.json());
    const result = await authService.register(input);
    return c.json(result, 201);
  },

  async login(c: Context) {
    const input = loginSchema.parse(await c.req.json());
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
      c.req.header("x-real-ip");
    const ua = c.req.header("user-agent");
    const result = await authService.login(input, { ip, ua });
    return c.json(result);
  },

  async refresh(c: Context) {
    const { refreshToken } = await c.req.json();
    const result = await authService.refresh(refreshToken);
    return c.json(result);
  },

  async logout(c: Context) {
    const user = c.get("user");
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
      c.req.header("x-real-ip");
    const ua = c.req.header("user-agent");
    await authService.logout(user.id, user.tenantId, { ip, ua });
    return c.json({ message: "Logged out" });
  },

  async me(c: Context) {
    const { id, tenantId, role } = c.get("user");
    const user = await authService.getMe(id);
    if (!user) return c.json({ error: "User not found" }, 404);
    return c.json({
      user: { id, tenantId, role, name: user.name, email: user.email },
    });
  },

  async listActivity(c: Context) {
    const user = c.get("user");
    const { page, limit } = c.req.query();
    const isAdmin = user.role === "admin";
    const result = await authService.listActivity(
      user.id,
      user.tenantId,
      isAdmin,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
    return c.json(result);
  },
};

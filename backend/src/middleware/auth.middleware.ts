import { createMiddleware } from "hono/factory";
import { verifyAccessToken } from "../lib/jwt";

export const authMiddleware = createMiddleware(async (c, next) => {
  const authorization = c.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const payload = verifyAccessToken(authorization.slice(7));
    c.set("user", {
      id: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    });
    await next();
  } catch (err) {
    console.log("[AUTH ERROR]", err); // add this line
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

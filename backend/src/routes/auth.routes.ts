import { Hono } from "hono";
import { authController } from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { rateLimitMiddleware } from "../middleware/rate-limit.middleware";

const router = new Hono();

router.post("/register", rateLimitMiddleware(5, 60), authController.register);
router.post("/login", rateLimitMiddleware(10, 60), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authMiddleware, authController.logout);
router.get("/me", authMiddleware, authController.me);
router.get("/getAllUsers", authMiddleware, authController.getAllUsers);
router.get("/activity", authMiddleware, authController.listActivity);

export { router as authRoutes };

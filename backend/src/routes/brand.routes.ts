import { Hono } from 'hono';
import { brandController } from '../controllers/brand.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = new Hono();

router.use('*', authMiddleware, tenantMiddleware);
router.get('/', brandController.list);
router.post('/', requireRole('admin', 'super_admin'), brandController.create);

export { router as brandRoutes };

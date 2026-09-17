import { Hono } from 'hono';
import { categoryController } from '../controllers/category.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = new Hono();

router.use('*', authMiddleware, tenantMiddleware);
router.get('/', categoryController.list);
router.post('/', requireRole('admin', 'super_admin'), categoryController.create);

export { router as categoryRoutes };

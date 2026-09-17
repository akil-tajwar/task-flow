import { Hono } from 'hono';
import { orderController } from '../controllers/order.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = new Hono();

router.use('*', authMiddleware, tenantMiddleware);

router.get('/', orderController.list);
router.get('/:id', orderController.get);
router.post('/', orderController.create);
router.patch('/:id/status', requireRole('admin', 'super_admin'), orderController.updateStatus);

export { router as orderRoutes };

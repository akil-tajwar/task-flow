import { Hono } from 'hono';
import { productController } from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = new Hono();

router.use('*', authMiddleware, tenantMiddleware);

router.get('/', productController.list);
router.get('/:id', productController.get);
router.post('/', requireRole('admin', 'super_admin'), productController.create);
router.put('/:id', requireRole('admin', 'super_admin'), productController.update);
router.delete('/:id', requireRole('admin', 'super_admin'), productController.delete);

export { router as productRoutes };

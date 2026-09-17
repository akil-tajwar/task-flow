import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { storeController } from '../controllers/store.controller';

const storeRoutes = new Hono();

storeRoutes.use('*', authMiddleware, tenantMiddleware);

storeRoutes.get('/',             storeController.list);
storeRoutes.get('/:id',          storeController.get);
storeRoutes.post('/',            requireRole('admin', 'super_admin'), storeController.create);
storeRoutes.put('/:id',          requireRole('admin', 'super_admin'), storeController.update);
storeRoutes.put('/:id/default',  requireRole('admin', 'super_admin'), storeController.setDefault);
storeRoutes.delete('/:id',       requireRole('admin', 'super_admin'), storeController.deactivate);

export { storeRoutes };

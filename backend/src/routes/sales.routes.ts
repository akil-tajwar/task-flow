import { Hono } from 'hono';
import { authMiddleware }   from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireRole }      from '../middleware/rbac.middleware';
import { salesController }  from '../controllers/sales.controller';

const salesRoutes = new Hono();

salesRoutes.use('*', authMiddleware, tenantMiddleware);

salesRoutes.get ('/',              salesController.list);
salesRoutes.get ('/:id',           salesController.get);
salesRoutes.post('/',              requireRole('admin', 'super_admin', 'user'), salesController.create);
salesRoutes.patch('/:id/confirm',  requireRole('admin', 'super_admin', 'user'), salesController.confirm);
salesRoutes.patch('/:id/cancel',   requireRole('admin', 'super_admin'),         salesController.cancel);
salesRoutes.post('/:id/payments',  requireRole('admin', 'super_admin', 'user'), salesController.addPayment);

export { salesRoutes };

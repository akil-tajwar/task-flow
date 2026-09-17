import { Hono } from 'hono';
import { customerController } from '../controllers/customer.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = new Hono();

router.use('*', authMiddleware, tenantMiddleware);

router.get('/', customerController.list);
router.get('/:id', customerController.get);
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.delete('/:id', requireRole('admin', 'super_admin'), customerController.delete);

router.get('/:id/balance',        customerController.getBalance);
router.get('/:id/ledger',         customerController.getLedger);
router.post('/:id/opening-balance', requireRole('admin', 'super_admin'), customerController.setOpeningBalance);

export { router as customerRoutes };

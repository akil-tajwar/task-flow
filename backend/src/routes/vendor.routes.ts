import { Hono } from 'hono';
import { vendorController } from '../controllers/vendor.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = new Hono();

router.use('*', authMiddleware, tenantMiddleware);

router.get('/', vendorController.list);
router.get('/:id', vendorController.get);
router.post('/', requireRole('admin', 'super_admin'), vendorController.create);
router.put('/:id', requireRole('admin', 'super_admin'), vendorController.update);
router.delete('/:id', requireRole('admin', 'super_admin'), vendorController.delete);

router.get('/:id/balance',        vendorController.getBalance);
router.get('/:id/ledger',         vendorController.getLedger);
router.post('/:id/opening-balance', requireRole('admin', 'super_admin'), vendorController.setOpeningBalance);

export { router as vendorRoutes };

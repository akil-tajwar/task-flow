import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { inventoryController } from '../controllers/inventory.controller';

const inventoryRoutes = new Hono();

inventoryRoutes.use('*', authMiddleware, tenantMiddleware);

inventoryRoutes.get('/',                         inventoryController.list);
inventoryRoutes.get('/movements',                inventoryController.listMovements);
inventoryRoutes.get('/ledger',                   inventoryController.storeLedger);
inventoryRoutes.get('/transfers',                inventoryController.listTransfers);
inventoryRoutes.get('/opening-balance-template', requireRole('admin', 'super_admin'), inventoryController.getOpeningBalanceTemplate);
inventoryRoutes.post('/adjust',                  requireRole('admin', 'super_admin'), inventoryController.adjust);
inventoryRoutes.post('/transfer',                requireRole('admin', 'super_admin'), inventoryController.transfer);
inventoryRoutes.post('/opening-balance',         requireRole('admin', 'super_admin'), inventoryController.openingBalance);

export { inventoryRoutes };

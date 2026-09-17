import { Hono } from 'hono';
import { authMiddleware }   from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireRole }      from '../middleware/rbac.middleware';
import { financeController } from '../controllers/finance.controller';

const financeRoutes = new Hono();

financeRoutes.use('*', authMiddleware, tenantMiddleware);

// Static routes first — must precede /:id to avoid route collision
financeRoutes.get('/transfers',  financeController.listTransfers);
financeRoutes.post('/transfers', financeController.transfer);

financeRoutes.get('/',       financeController.listAccounts);
financeRoutes.post('/',      requireRole('admin', 'super_admin'), financeController.createAccount);

financeRoutes.get('/:id',    financeController.getAccount);
financeRoutes.put('/:id',    requireRole('admin', 'super_admin'), financeController.updateAccount);
financeRoutes.delete('/:id', requireRole('admin', 'super_admin'), financeController.deleteAccount);
financeRoutes.patch('/:id/opening-balance', requireRole('admin', 'super_admin'), financeController.setOpeningBalance);
financeRoutes.get('/:id/transactions', financeController.listTransactions);
financeRoutes.get('/:id/ledger',       financeController.getLedger);

export { financeRoutes };

import { Hono } from 'hono';
import { authMiddleware }    from '../middleware/auth.middleware';
import { tenantMiddleware }  from '../middleware/tenant.middleware';
import { requireRole }       from '../middleware/rbac.middleware';
import { expenseController } from '../controllers/expense.controller';

const expenseRoutes = new Hono();
expenseRoutes.use('*', authMiddleware, tenantMiddleware);

// Expense heads
expenseRoutes.get( '/heads',        expenseController.listHeads);
expenseRoutes.post('/heads',        requireRole('admin', 'super_admin'), expenseController.createHead);
expenseRoutes.put( '/heads/:id',    requireRole('admin', 'super_admin'), expenseController.updateHead);
expenseRoutes.delete('/heads/:id',  requireRole('admin', 'super_admin'), expenseController.deleteHead);

// Expense transactions
expenseRoutes.get(   '/',    expenseController.list);
expenseRoutes.post(  '/',    expenseController.create);
expenseRoutes.delete('/:id', requireRole('admin', 'super_admin'), expenseController.deleteExpense);

export { expenseRoutes };

import { Hono } from 'hono';
import { authMiddleware }  from '../middleware/auth.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { requireRole }     from '../middleware/rbac.middleware';
import { purchaseController } from '../controllers/purchase.controller';

const purchaseRoutes = new Hono();

purchaseRoutes.use('*', authMiddleware, tenantMiddleware);

// ── Purchase Orders ──────────────────────────────────────────────────────────

purchaseRoutes.get ('/orders',           purchaseController.listPOs);
purchaseRoutes.get ('/orders/:id',       purchaseController.getPO);
purchaseRoutes.post('/orders',           requireRole('admin', 'super_admin'), purchaseController.createPO);
purchaseRoutes.patch('/orders/:id/status', requireRole('admin', 'super_admin'), purchaseController.updatePOStatus);

// ── Purchase Receipts ─────────────────────────────────────────────────────────

purchaseRoutes.get ('/receipts',              purchaseController.listPRs);
purchaseRoutes.get ('/receipts/:id',          purchaseController.getPR);
purchaseRoutes.post('/receipts',              requireRole('admin', 'super_admin'), purchaseController.createPR);
purchaseRoutes.patch('/receipts/:id/confirm', requireRole('admin', 'super_admin'), purchaseController.confirmPR);
purchaseRoutes.patch('/receipts/:id/cancel',  requireRole('admin', 'super_admin'), purchaseController.cancelPR);
purchaseRoutes.post('/receipts/:id/payments', requireRole('admin', 'super_admin'), purchaseController.addPayment);

// ── Vendor Ledger ──────────────────────────────────────────────────────────────

purchaseRoutes.get('/vendors/:vendorId/ledger', purchaseController.getVendorLedger);

export { purchaseRoutes };

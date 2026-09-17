import { Hono } from 'hono';
import { authRoutes } from './auth.routes';
import { productRoutes } from './product.routes';
import { orderRoutes } from './order.routes';
import { brandRoutes } from './brand.routes';
import { categoryRoutes } from './category.routes';
import { vendorRoutes } from './vendor.routes';
import { customerRoutes } from './customer.routes';
import { storeRoutes } from './store.routes';
import { inventoryRoutes } from './inventory.routes';
import { financeRoutes }   from './finance.routes';
import { purchaseRoutes }  from './purchase.routes';
import { salesRoutes }     from './sales.routes';
import { expenseRoutes }    from './expense.routes';
import { dashboardRoutes }  from './dashboard.routes';

const routes = new Hono();

routes.route('/dashboard', dashboardRoutes);
routes.route('/auth',      authRoutes);
routes.route('/products',  productRoutes);
routes.route('/orders',    orderRoutes);
routes.route('/brands',    brandRoutes);
routes.route('/categories', categoryRoutes);
routes.route('/vendors',   vendorRoutes);
routes.route('/customers', customerRoutes);
routes.route('/stores',    storeRoutes);
routes.route('/inventory', inventoryRoutes);
routes.route('/finance',   financeRoutes);
routes.route('/purchases', purchaseRoutes);
routes.route('/sales',     salesRoutes);
routes.route('/expenses',  expenseRoutes);

export { routes };

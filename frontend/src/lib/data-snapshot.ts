import { api } from './api';
import { cacheProducts, cacheCustomers, setMeta } from './offline-db';

export async function refreshOfflineSnapshot(): Promise<void> {
  try {
    const [productsRes, customersRes, storesRes, accountsRes] = await Promise.allSettled([
      api.get('/products',  { params: { limit: 500 } }),
      api.get('/customers', { params: { limit: 500 } }),
      api.get('/stores'),
      api.get('/finance'),
    ]);

    if (productsRes.status === 'fulfilled') {
      const raw = productsRes.value.data;
      const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
      await cacheProducts(
        list.map((p: { id: string; name: string; sku?: string; basePrice: string; isActive?: boolean }) => ({
          id: p.id, name: p.name, sku: p.sku ?? '', basePrice: p.basePrice, isActive: p.isActive ?? true,
        }))
      );
    }

    if (customersRes.status === 'fulfilled') {
      const raw = customersRes.value.data;
      const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
      await cacheCustomers(
        list.map((c: { id: string; name: string; phone?: string | null; email?: string | null }) => ({
          id: c.id, name: c.name, phone: c.phone ?? null, email: c.email ?? null,
        }))
      );
    }

    if (storesRes.status === 'fulfilled') {
      await setMeta('stores', storesRes.value.data);
    }

    if (accountsRes.status === 'fulfilled') {
      await setMeta('accounts', accountsRes.value.data);
    }

    await setMeta('lastSync', new Date().toISOString());
  } catch (err) {
    console.warn('[offline] snapshot refresh failed', err);
  }
}

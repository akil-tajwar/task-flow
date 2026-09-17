import { api } from './api';
import { getPendingSales, updateSaleInQueue } from './offline-db';

export interface SyncResult {
  localId:        number;
  localDisplayId: string;
  success:        boolean;
  serverId?:      string;
  error?:         string;
}

export async function drainSalesQueue(): Promise<SyncResult[]> {
  const pending = await getPendingSales();
  if (pending.length === 0) return [];

  const results: SyncResult[] = [];

  for (const sale of pending) {
    const localId = sale.localId!;
    await updateSaleInQueue(localId, { status: 'syncing' });

    try {
      const { data: invoice } = await api.post('/sales', sale.payload);
      await api.patch(`/sales/${invoice.id}/confirm`);

      await updateSaleInQueue(localId, {
        status:   'synced',
        serverId: invoice.id,
        syncedAt: new Date().toISOString(),
        error:    null,
      });
      results.push({ localId, localDisplayId: sale.localDisplayId, success: true, serverId: invoice.id });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Sync failed — please retry manually';
      await updateSaleInQueue(localId, { status: 'failed', error: msg });
      results.push({ localId, localDisplayId: sale.localDisplayId, success: false, error: msg });
    }
  }

  return results;
}

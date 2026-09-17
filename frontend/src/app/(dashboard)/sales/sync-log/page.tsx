'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getAllSalesQueue,
  retrySale,
  clearSyncedSales,
  type PendingSale,
} from '@/lib/offline-db';
import { useOnlineStatus }  from '@/hooks/use-online-status';
import { useOfflineSync }   from '@/hooks/use-offline-sync';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function saleTotal(sale: PendingSale): number {
  return (sale.payload.items ?? []).reduce((sum, item) => {
    const subtotal = item.quantity * item.unitPrice - (item.discountAmount ?? 0);
    const tax      = (subtotal * (item.taxRate ?? 0)) / 100;
    return sum + subtotal + tax;
  }, 0) - (sale.payload.discountAmount ?? 0);
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  syncing:  { label: 'Syncing',  cls: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500 animate-pulse' },
  synced:   { label: 'Synced',   cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  failed:   { label: 'Failed',   cls: 'bg-red-100 text-red-700',       dot: 'bg-red-500' },
};

function StatusBadge({ status }: { status: PendingSale['status'] }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function SaleRow({
  sale,
  isOnline,
  onRetry,
}: {
  sale:     PendingSale;
  isOnline: boolean;
  onRetry:  (id: number) => void;
}) {
  const total     = saleTotal(sale);
  const itemCount = (sale.payload.items ?? []).length;
  const customer  = sale.payload.customerName ?? sale.payload.customerPhone ?? 'Walk-in';

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Local ID */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <span className="font-mono text-sm font-bold text-gray-800">{sale.localDisplayId}</span>
      </td>

      {/* Created */}
      <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">
        <p>{new Date(sale.createdAt).toLocaleDateString('en', { day: '2-digit', month: 'short' })}</p>
        <p className="text-xs text-gray-400">{timeAgo(sale.createdAt)}</p>
      </td>

      {/* Customer */}
      <td className="px-5 py-3.5 text-sm text-gray-700 max-w-[140px] truncate">{customer}</td>

      {/* Items */}
      <td className="px-5 py-3.5 text-center text-sm font-medium text-gray-600">{itemCount}</td>

      {/* Amount */}
      <td className="px-5 py-3.5 text-right text-sm font-black text-gray-900">{fmt(total)}</td>

      {/* Status */}
      <td className="px-5 py-3.5"><StatusBadge status={sale.status} /></td>

      {/* Server invoice / error */}
      <td className="px-5 py-3.5">
        {sale.status === 'synced' && sale.serverId ? (
          <Link
            href={`/sales/invoices/${sale.serverId}`}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
          >
            View Invoice →
          </Link>
        ) : sale.status === 'synced' ? (
          <span className="text-xs text-gray-400">Synced</span>
        ) : sale.status === 'failed' ? (
          <span className="text-xs text-red-600 line-clamp-2 max-w-[180px]">{sale.error ?? 'Unknown error'}</span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>

      {/* Synced at */}
      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
        {sale.syncedAt
          ? new Date(sale.syncedAt).toLocaleString('en', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
          : '—'}
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5 text-right">
        {sale.status === 'failed' && isOnline && (
          <button
            onClick={() => onRetry(sale.localId!)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
          >
            Retry
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SyncLogPage() {
  const isOnline               = useOnlineStatus();
  const { syncing, sync }      = useOfflineSync();
  const [sales, setSales]      = useState<PendingSale[]>([]);
  const [loading, setLoading]  = useState(true);
  const [clearing, setClearing] = useState(false);
  const [filter, setFilter]    = useState<'all' | PendingSale['status']>('all');

  const load = useCallback(async () => {
    const all = await getAllSalesQueue();
    // Newest first
    setSales(all.reverse());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reload after sync finishes
  useEffect(() => {
    if (!syncing) load();
  }, [syncing, load]);

  async function handleRetry(localId: number) {
    await retrySale(localId);
    await load();
    sync();
  }

  async function handleClearSynced() {
    setClearing(true);
    await clearSyncedSales();
    await load();
    setClearing(false);
  }

  const counts = {
    all:     sales.length,
    pending: sales.filter((s) => s.status === 'pending').length,
    syncing: sales.filter((s) => s.status === 'syncing').length,
    synced:  sales.filter((s) => s.status === 'synced').length,
    failed:  sales.filter((s) => s.status === 'failed').length,
  };

  const displayed = filter === 'all' ? sales : sales.filter((s) => s.status === filter);
  const hasSynced = counts.synced > 0;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offline Sync Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sales created while offline and their sync status</p>
        </div>
        <div className="flex items-center gap-2">
          {hasSynced && (
            <button
              onClick={handleClearSynced}
              disabled={clearing}
              className="px-3 py-2 text-sm font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-lg transition-colors"
            >
              {clearing ? 'Clearing…' : 'Clear Synced'}
            </button>
          )}
          {isOnline && counts.pending > 0 && (
            <button
              onClick={() => sync()}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {syncing ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              {syncing ? 'Syncing…' : `Sync Now (${counts.pending})`}
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'pending' as const, label: 'Pending',  value: counts.pending, color: 'text-amber-600',   bg: 'bg-amber-50   border-amber-200' },
          { key: 'syncing' as const, label: 'Syncing',  value: counts.syncing, color: 'text-indigo-600',  bg: 'bg-indigo-50  border-indigo-200' },
          { key: 'synced'  as const, label: 'Synced',   value: counts.synced,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { key: 'failed'  as const, label: 'Failed',   value: counts.failed,  color: 'text-red-600',     bg: 'bg-red-50     border-red-200' },
        ].map(({ key, label, value, color, bg }) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${bg} ${filter === key ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}`}
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-black mt-1 ${color}`}>{value}</p>
          </button>
        ))}
      </div>

      {/* Offline notice */}
      {!isOnline && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 font-medium">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          You are offline — sales will sync automatically when the connection is restored.
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Local ID', 'Created', 'Customer', 'Items', 'Amount', 'Status', 'Result / Error', 'Synced At', ''].map((h, i) => (
                  <th key={h || i}
                    className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Amount' ? 'text-right' : h === 'Items' ? 'text-center' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <svg className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-400 text-sm font-medium">
                      {filter === 'all' ? 'No offline sales recorded yet' : `No ${filter} sales`}
                    </p>
                    {filter !== 'all' && (
                      <button onClick={() => setFilter('all')} className="mt-2 text-xs text-indigo-500 hover:text-indigo-700">
                        Show all
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayed.map((sale) => (
                  <SaleRow
                    key={sale.localId}
                    sale={sale}
                    isOnline={isOnline}
                    onRetry={handleRetry}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {displayed.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
            Showing {displayed.length} of {counts.all} entries
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="ml-2 text-indigo-500 hover:text-indigo-700 font-medium">
                Show all
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

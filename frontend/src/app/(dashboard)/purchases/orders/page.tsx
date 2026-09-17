'use client';

import { useState }  from 'react';
import Link          from 'next/link';
import { usePurchaseOrders, useUpdatePOStatus } from '@/hooks/use-purchases';
import type { POStatus, PurchaseOrder } from '@/types';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const STATUS_META: Record<POStatus, { label: string; cls: string }> = {
  draft:              { label: 'Draft',             cls: 'bg-gray-100 text-gray-600' },
  sent:               { label: 'Sent',              cls: 'bg-blue-100 text-blue-700' },
  partially_received: { label: 'Part. Received',    cls: 'bg-amber-100 text-amber-700' },
  received:           { label: 'Received',          cls: 'bg-emerald-100 text-emerald-700' },
  cancelled:          { label: 'Cancelled',         cls: 'bg-red-100 text-red-600' },
};

const fmt = (v: string) =>
  `$${parseFloat(v).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Row ──────────────────────────────────────────────────────────────────────

function PORow({ po, onMarkSent, updating }: {
  po: PurchaseOrder;
  onMarkSent: (id: string) => void;
  updating: string | null;
}) {
  const sm = STATUS_META[po.status];
  const receivedItems = po.items?.filter((i) => i.receivedQty > 0).length ?? 0;
  const totalItems    = po.items?.length ?? po.itemCount ?? 0;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-mono text-sm font-semibold text-indigo-700">{po.poNumber}</div>
        <div className="text-xs text-gray-400">{po.orderDate}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-gray-900">{po.vendor?.name ?? '—'}</div>
        {po.vendor?.contactPerson && <div className="text-xs text-gray-400">{po.vendor.contactPerson}</div>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{po.store?.name ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{po.expectedDate ?? '—'}</td>
      <td className="px-4 py-3 text-center text-sm text-gray-600">
        {receivedItems > 0 ? `${receivedItems}/${totalItems}` : totalItems}
      </td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{fmt(po.total)}</td>
      <td className="px-4 py-3 text-center">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/purchases/orders/${po.id}`}
            className="text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-md transition-colors"
          >
            View
          </Link>
          {po.status === 'draft' && (
            <button
              onClick={() => onMarkSent(po.id)}
              disabled={updating === po.id}
              className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
            >
              {updating === po.id ? '…' : 'Mark Sent'}
            </button>
          )}
          {(po.status === 'sent' || po.status === 'partially_received') && (
            <Link
              href={`/purchases/receipts/new?poId=${po.id}`}
              className="text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
            >
              Create Receipt
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'all' | POStatus;

export default function PurchaseOrdersPage() {
  const [tab,  setTab]  = useState<Tab>('all');
  const [page, setPage] = useState(1);
  const [updating, setUpdating] = useState<string | null>(null);

  const { data, isLoading } = usePurchaseOrders({
    status: tab === 'all' ? undefined : tab,
    page, limit: 20,
  });

  const updateStatus = useUpdatePOStatus();

  async function handleMarkSent(id: string) {
    setUpdating(id);
    try { await updateStatus.mutateAsync({ id, status: 'sent' }); }
    catch { alert('Failed to update status.'); }
    finally { setUpdating(null); }
  }

  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track orders placed with vendors</p>
        </div>
        <Link
          href="/purchases/orders/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New PO
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 gap-1 overflow-x-auto">
          {(['all', 'draft', 'sent', 'partially_received', 'received', 'cancelled'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }} className={tabCls(tab === t)}>
              {t === 'all' ? 'All' : STATUS_META[t as POStatus]?.label ?? t}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['PO #', 'Vendor', 'Store', 'Expected', 'Items', 'Total', 'Status', ''].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    h === 'Total' ? 'text-right' : h === 'Items' || h === 'Status' ? 'text-center' : ''
                  }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400">
                    <svg className="h-10 w-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    No purchase orders yet
                  </td>
                </tr>
              ) : (
                data?.data.map((po) => (
                  <PORow key={po.id} po={po} onMarkSent={handleMarkSent} updating={updating} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">{(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

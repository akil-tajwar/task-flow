'use client';

import { useRef }              from 'react';
import { useParams }           from 'next/navigation';
import Link                    from 'next/link';
import { usePurchaseOrder, useUpdatePOStatus } from '@/hooks/use-purchases';
import type { POStatus }       from '@/types';

// ─── Status meta ──────────────────────────────────────────────────────────────

const STATUS_META: Record<POStatus, { label: string; cls: string }> = {
  draft:              { label: 'Draft',              cls: 'bg-gray-100 text-gray-700' },
  sent:               { label: 'Sent to Vendor',     cls: 'bg-blue-100 text-blue-700' },
  partially_received: { label: 'Partially Received', cls: 'bg-amber-100 text-amber-700' },
  received:           { label: 'Fully Received',     cls: 'bg-emerald-100 text-emerald-700' },
  cancelled:          { label: 'Cancelled',          cls: 'bg-red-100 text-red-600' },
};

const fmt   = (v: string | number) => `$${parseFloat(String(v)).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct   = (v: string) => `${parseFloat(v).toFixed(0)}%`;

// ─── Print styles (injected as a <style> tag) ─────────────────────────────────

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #po-printable, #po-printable * { visibility: visible !important; }
  #po-printable {
    position: fixed !important;
    inset: 0 !important;
    padding: 24px 32px !important;
    background: white !important;
  }
  .no-print { display: none !important; }
}
`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: po, isLoading } = usePurchaseOrder(id);
  const updateStatus = useUpdatePOStatus();

  // ── Loading / not found ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-48" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="max-w-4xl mx-auto text-center py-24">
        <p className="text-gray-400 text-lg">Purchase order not found.</p>
        <Link href="/purchases/orders" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const sm       = STATUS_META[po.status];
  const subtotal = parseFloat(po.subtotal);
  const tax      = parseFloat(po.taxAmount);
  const total    = parseFloat(po.total);

  async function handleMarkSent() {
    await updateStatus.mutateAsync({ id: po!.id, status: 'sent' });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Inject print CSS */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      <div className="max-w-4xl mx-auto space-y-5">

        {/* Topbar — hidden on print */}
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <Link href="/purchases/orders" className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Purchase Order</h1>
          </div>

          <div className="flex items-center gap-2">
            {po.status === 'draft' && (
              <button
                onClick={handleMarkSent}
                disabled={updateStatus.isPending}
                className="px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 disabled:opacity-50 transition-colors"
              >
                {updateStatus.isPending ? 'Updating…' : 'Mark as Sent'}
              </button>
            )}
            {(po.status === 'sent' || po.status === 'partially_received') && (
              <Link
                href={`/purchases/receipts/new?poId=${po.id}`}
                className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
              >
                Create Receipt
              </Link>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded-lg shadow-sm transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print PO
            </button>
          </div>
        </div>

        {/* ── Printable content ─────────────────────────────────────────── */}
        <div id="po-printable" className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* PO header */}
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-start justify-between gap-6">
              {/* Left: company placeholder + PO title */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Purchase Order</p>
                <h2 className="text-3xl font-black text-gray-900 font-mono tracking-tight">{po.poNumber}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${sm.cls}`}>{sm.label}</span>
                </div>
              </div>

              {/* Right: dates */}
              <div className="text-right text-sm space-y-1 flex-shrink-0">
                <div className="flex gap-6 justify-end">
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wider">Order Date</p>
                    <p className="font-semibold text-gray-900">{po.orderDate}</p>
                  </div>
                  {po.expectedDate && (
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-semibold tracking-wider">Expected By</p>
                      <p className="font-semibold text-gray-900">{po.expectedDate}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Vendor + store */}
          <div className="grid grid-cols-2 gap-6 px-8 py-6 border-b border-gray-100 bg-gray-50/50">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Vendor / Supplier</p>
              <p className="text-base font-bold text-gray-900">{po.vendor?.name ?? '—'}</p>
              {po.vendor?.contactPerson && <p className="text-sm text-gray-600">{po.vendor.contactPerson}</p>}
              {po.vendor?.email        && <p className="text-sm text-gray-500">{po.vendor.email}</p>}
              {po.vendor?.phone        && <p className="text-sm text-gray-500">{po.vendor.phone}</p>}
              {po.vendor?.address      && <p className="text-sm text-gray-500 mt-1">{po.vendor.address}{po.vendor.city ? `, ${po.vendor.city}` : ''}</p>}
              {po.vendor?.taxId        && <p className="text-xs text-gray-400 mt-1">Tax ID: {po.vendor.taxId}</p>}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Deliver To</p>
              <p className="text-base font-bold text-gray-900">{po.store?.name ?? '—'}</p>
              {po.store?.address && <p className="text-sm text-gray-500 mt-1">{po.store.address}{po.store.city ? `, ${po.store.city}` : ''}</p>}
              {po.store?.phone   && <p className="text-sm text-gray-500">{po.store.phone}</p>}
            </div>
          </div>

          {/* Items table */}
          <div className="px-8 py-4">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">#</th>
                  <th className="py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Product</th>
                  <th className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500">Ordered</th>
                  <th className="py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500">Received</th>
                  <th className="py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Unit Price</th>
                  <th className="py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Tax</th>
                  <th className="py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(po.items ?? []).map((item, idx) => {
                  const variantLabel = item.variant
                    ? Object.values(item.variant.attributes).join(' / ')
                    : null;
                  const allReceived = item.receivedQty >= item.quantity;
                  return (
                    <tr key={item.id} className="py-2">
                      <td className="py-3 text-sm text-gray-400 pr-3">{idx + 1}</td>
                      <td className="py-3">
                        <p className="text-sm font-semibold text-gray-900">{item.product?.name ?? item.productId}</p>
                        {item.product?.sku && <p className="text-xs text-gray-400">SKU: {item.product.sku}</p>}
                        {variantLabel && <p className="text-xs text-gray-500">{variantLabel}</p>}
                        {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
                      </td>
                      <td className="py-3 text-center text-sm font-semibold text-gray-900">{item.quantity}</td>
                      <td className="py-3 text-center text-sm">
                        {item.receivedQty > 0 ? (
                          <span className={`font-semibold ${allReceived ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {item.receivedQty}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right text-sm text-gray-700">{fmt(item.unitPrice)}</td>
                      <td className="py-3 text-right text-sm text-gray-500">
                        {parseFloat(item.taxRate) > 0 ? pct(item.taxRate) : '—'}
                      </td>
                      <td className="py-3 text-right text-sm font-semibold text-gray-900">{fmt(item.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-8 pb-6">
            <div className="ml-auto w-64 space-y-2 border-t border-gray-100 pt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax</span><span>{fmt(tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Notes + Created by */}
          {(po.notes || po.createdByUser) && (
            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/50 flex gap-8">
              {po.notes && (
                <div className="flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600">{po.notes}</p>
                </div>
              )}
              {po.createdByUser && (
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Created By</p>
                  <p className="text-sm text-gray-700 font-medium">{po.createdByUser.name}</p>
                </div>
              )}
            </div>
          )}

          {/* Print footer */}
          <div className="hidden print:block px-8 py-4 border-t border-gray-200 text-center text-xs text-gray-400">
            This is a system-generated purchase order. Please contact us for any queries.
          </div>
        </div>

      </div>
    </>
  );
}

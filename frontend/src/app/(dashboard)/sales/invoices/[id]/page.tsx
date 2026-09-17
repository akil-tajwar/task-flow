'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link          from 'next/link';
import { useSalesInvoice, useConfirmSale, useCancelSale } from '@/hooks/use-sales';

// ─── Print styles ─────────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #invoice-print, #invoice-print * { visibility: visible !important; }
  #invoice-print { position: fixed !important; inset: 0 !important; padding: 32px !important; background: #fff !important; }
  .no-print { display: none !important; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 10px; font-size: 11px; }
  th { background: #f9fafb !important; -webkit-print-color-adjust: exact; }
}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: string | number) =>
  `$${parseFloat(String(v)).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_META = {
  draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-600' },
};

const PAY_STATUS_META = {
  unpaid:  { label: 'Unpaid',  cls: 'bg-red-100 text-red-600' },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700' },
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700' },
};

const MODE_LABEL: Record<string, string> = { cash: 'Cash', bank: 'Bank Transfer', credit: 'Credit' };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesInvoiceDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { data: inv, isLoading } = useSalesInvoice(id);
  const confirmSale = useConfirmSale();
  const cancelSale  = useCancelSale();
  const [actionError, setActionError] = useState('');

  async function handleConfirm() {
    setActionError('');
    try {
      await confirmSale.mutateAsync(id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionError(msg ?? 'Failed to confirm invoice.');
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this draft invoice? This cannot be undone.')) return;
    setActionError('');
    try {
      await cancelSale.mutateAsync(id);
      router.push('/sales/invoices');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setActionError(msg ?? 'Failed to cancel invoice.');
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-48" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="max-w-3xl mx-auto text-center py-24">
        <p className="text-gray-400">Invoice not found.</p>
        <Link href="/sales/invoices" className="mt-3 inline-block text-indigo-600 text-sm hover:underline">← Back</Link>
      </div>
    );
  }

  const sm  = STATUS_META[inv.status];
  const pm  = PAY_STATUS_META[inv.paymentStatus];
  const items    = inv.items ?? [];
  const payments = inv.payments ?? [];
  const profit   = parseFloat(inv.grossProfit);
  const total    = parseFloat(inv.total);
  const margin   = total > 0 ? (profit / total) * 100 : 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      <div className="max-w-4xl mx-auto space-y-4">

        {/* Toolbar */}
        <div className="no-print flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/sales/invoices" className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-mono">{inv.invoiceNumber}</h1>
              <div className="flex gap-2 mt-0.5">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${pm.cls}`}>{pm.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Draft actions */}
            {inv.status === 'draft' && (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={confirmSale.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                >
                  {confirmSale.isPending ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {confirmSale.isPending ? 'Confirming…' : 'Confirm Invoice'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelSale.isPending}
                  className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {cancelSale.isPending ? 'Cancelling…' : 'Cancel Draft'}
                </button>
              </>
            )}

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded-lg shadow-sm transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>

        {/* Action error */}
        {actionError && (
          <div className="no-print rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium whitespace-pre-line">
            {actionError}
          </div>
        )}

        {/* Profitability summary (no-print) */}
        {inv.status === 'confirmed' && (
          <div className="no-print grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Revenue</p>
              <p className="text-2xl font-black text-gray-900 mt-0.5">{fmt(inv.total)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cost (COGS)</p>
              <p className="text-2xl font-black text-orange-600 mt-0.5">{fmt(inv.totalCost)}</p>
            </div>
            <div className={`rounded-xl border p-4 ${profit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gross Profit</p>
              <p className={`text-2xl font-black mt-0.5 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(profit)}</p>
              <p className={`text-xs mt-0.5 ${profit >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                {margin.toFixed(1)}% margin
              </p>
            </div>
          </div>
        )}

        {/* ── Printable invoice ── */}
        <div id="invoice-print" className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Invoice header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sales Invoice</p>
                <p className="text-3xl font-black font-mono text-gray-900 mt-0.5">{inv.invoiceNumber}</p>
                <p className="text-sm text-gray-500 mt-1">{inv.store?.name ?? '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Date: <strong>{inv.invoiceDate}</strong></p>
                <div className="flex gap-2 justify-end mt-2">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${sm.cls}`}>{sm.label}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${pm.cls}`}>{pm.label}</span>
                </div>
              </div>
            </div>

            {/* Customer */}
            {(inv.customerName || inv.customerPhone) && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
                <p className="text-sm font-semibold text-gray-800">{inv.customerName ?? '—'}</p>
                {inv.customerPhone && <p className="text-xs text-gray-500">{inv.customerPhone}</p>}
              </div>
            )}
          </div>

          {/* Items table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tax</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase no-print">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => {
                  const lineProfit = parseFloat(item.grossProfit);
                  return (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{item.product?.name ?? '—'}</p>
                        {item.product?.sku && <p className="text-xs text-gray-400 font-mono">{item.product.sku}</p>}
                        {item.variant && (
                          <p className="text-xs text-gray-400">
                            {Object.entries(item.variant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center text-gray-700">{item.quantity}</td>
                      <td className="px-5 py-3 text-right text-gray-700">{fmt(item.unitPrice)}</td>
                      <td className="px-5 py-3 text-right text-gray-500">{fmt(item.taxAmount)}</td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900">{fmt(item.total)}</td>
                      <td className={`px-5 py-3 text-right text-xs font-semibold no-print ${lineProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {fmt(lineProfit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="flex justify-end">
              <div className="w-56 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span className="font-semibold">{fmt(inv.subtotal)}</span>
                </div>
                {parseFloat(inv.taxAmount) > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax</span><span className="font-semibold">{fmt(inv.taxAmount)}</span>
                  </div>
                )}
                {parseFloat(inv.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span><span className="font-semibold">− {fmt(inv.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span><span>{fmt(inv.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Paid</span><span className="font-bold">{fmt(inv.paidAmount)}</span>
                </div>
                {parseFloat(inv.balanceDue) > 0 && (
                  <div className="flex justify-between text-sm text-red-600 font-bold">
                    <span>Balance Due</span><span>{fmt(inv.balanceDue)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payments */}
          {payments.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payment Record</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.paymentMode === 'cash' ? 'bg-emerald-100 text-emerald-700' :
                        p.paymentMode === 'bank' ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {MODE_LABEL[p.paymentMode]}
                      </span>
                      {p.account && <span className="text-xs text-gray-500">{p.account.name}</span>}
                      {p.referenceNumber && <span className="text-xs text-gray-400">#{p.referenceNumber}</span>}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-50 text-center">
            <p className="text-xs text-gray-400">Thank you for your business!</p>
            {inv.createdByUser && <p className="text-xs text-gray-300 mt-0.5">Served by: {inv.createdByUser.name}</p>}
          </div>

        </div>
        {/* end printable */}

      </div>
    </>
  );
}

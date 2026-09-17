'use client';

import { useState }               from 'react';
import Link                        from 'next/link';
import { useSalesInvoices, useCancelSale } from '@/hooks/use-sales';
import type { SalesInvoice, SalesInvoiceStatus, SalesPaymentStatus } from '@/types';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const STATUS_META: Record<SalesInvoiceStatus, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-600' },
};

const PAY_META: Record<SalesPaymentStatus, { label: string; cls: string }> = {
  unpaid:  { label: 'Unpaid',  cls: 'bg-red-100 text-red-600' },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700' },
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700' },
};

const fmt = (v: string | number) =>
  `$${parseFloat(String(v)).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Row ──────────────────────────────────────────────────────────────────────

function InvoiceRow({
  inv, onCancel, cancelling,
}: { inv: SalesInvoice; onCancel: (id: string) => void; cancelling: string | null }) {
  const sm = STATUS_META[inv.status];
  const pm = PAY_META[inv.paymentStatus];
  const profit = parseFloat(inv.grossProfit);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <Link href={`/sales/invoices/${inv.id}`} className="font-mono text-sm font-semibold text-indigo-700 hover:underline">
          {inv.invoiceNumber}
        </Link>
        <p className="text-xs text-gray-400">{inv.invoiceDate}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-900">{inv.customerName ?? <span className="text-gray-300">Walk-in</span>}</p>
        {inv.customerPhone && <p className="text-xs text-gray-400">{inv.customerPhone}</p>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{inv.store?.name ?? '—'}</td>
      <td className="px-4 py-3 text-center text-sm text-gray-600">{inv.items?.length ?? 0}</td>
      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{fmt(inv.total)}</td>
      <td className="px-4 py-3 text-right text-sm">
        {inv.status === 'confirmed' ? (
          <span className={`font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {fmt(profit)}
          </span>
        ) : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3 text-right text-sm text-emerald-700">{fmt(inv.paidAmount)}</td>
      <td className="px-4 py-3 text-center">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${pm.cls}`}>{pm.label}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/sales/invoices/${inv.id}`}
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            View
          </Link>
          {inv.status === 'draft' && (
            <button
              onClick={() => onCancel(inv.id)}
              disabled={cancelling === inv.id}
              className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab    = 'all' | SalesInvoiceStatus;
type PayTab = 'all' | SalesPaymentStatus;

export default function SalesInvoicesPage() {
  const [tab,     setTab]     = useState<Tab>('all');
  const [payTab,  setPayTab]  = useState<PayTab>('all');
  const [page,    setPage]    = useState(1);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const { data, isLoading } = useSalesInvoices({
    status:        tab    === 'all' ? undefined : tab,
    paymentStatus: payTab === 'all' ? undefined : payTab,
    page, limit: 20,
  });

  const cancelSale = useCancelSale();

  async function handleCancel(id: string) {
    if (!confirm('Cancel this draft invoice?')) return;
    setCancelling(id);
    try { await cancelSale.mutateAsync(id); }
    catch { alert('Failed to cancel.'); }
    finally { setCancelling(null); }
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
          <h1 className="text-2xl font-bold text-gray-900">Sales Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">Cash & direct sales</p>
        </div>
        <Link
          href="/sales/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Sale
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4 gap-1 overflow-x-auto">
          {(['all', 'draft', 'confirmed', 'cancelled'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }} className={tabCls(tab === t)}>
              {t === 'all' ? 'All' : STATUS_META[t as SalesInvoiceStatus]?.label ?? t}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 py-1">
            {(['all', 'unpaid', 'partial', 'paid'] as PayTab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setPayTab(t); setPage(1); }}
                className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                  payTab === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t === 'all' ? 'All Payments' : PAY_META[t as SalesPaymentStatus]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Invoice #', 'Customer', 'Store', 'Items', 'Total', 'Profit', 'Paid', 'Payment', 'Status', ''].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    ['Total', 'Profit', 'Paid'].includes(h) ? 'text-right' :
                    ['Items', 'Payment', 'Status'].includes(h) ? 'text-center' : ''
                  }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-gray-400">
                    <svg className="h-10 w-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                    No sales invoices yet
                  </td>
                </tr>
              ) : (
                data?.data.map((inv) => (
                  <InvoiceRow key={inv.id} inv={inv} onCancel={handleCancel} cancelling={cancelling} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
            </p>
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

'use client';

import { useState }       from 'react';
import Link               from 'next/link';
import { usePurchaseReceipts, useConfirmPR, useCancelPR } from '@/hooks/use-purchases';
import type { PRStatus, PRPaymentStatus, PurchaseReceipt } from '@/types';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const STATUS_META: Record<PRStatus, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-600' },
  confirmed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-100 text-red-600' },
};

const PAY_META: Record<PRPaymentStatus, { label: string; cls: string }> = {
  unpaid:  { label: 'Unpaid',  cls: 'bg-red-100 text-red-600' },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700' },
  paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700' },
};

const fmt = (v: string) =>
  `$${parseFloat(v).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Row ──────────────────────────────────────────────────────────────────────

function PRRow({
  pr, onConfirm, onCancel, confirming, cancelling,
}: {
  pr: PurchaseReceipt;
  onConfirm: (id: string) => void;
  onCancel:  (id: string) => void;
  confirming: string | null;
  cancelling: string | null;
}) {
  const sm = STATUS_META[pr.status];
  const pm = PAY_META[pr.paymentStatus];

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-mono text-sm font-semibold text-indigo-700">{pr.receiptNumber}</div>
        <div className="text-xs text-gray-400">{pr.receiptDate}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-gray-900">{pr.vendor?.name ?? '—'}</div>
        {pr.po && <div className="text-xs text-gray-400">PO: {pr.po.poNumber}</div>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{pr.store?.name ?? '—'}</td>
      <td className="px-4 py-3 text-center text-sm text-gray-600">{pr.itemCount ?? pr.items?.length ?? 0}</td>
      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{fmt(pr.total)}</td>
      <td className="px-4 py-3 text-right text-sm text-emerald-700">{fmt(pr.paidAmount)}</td>
      <td className="px-4 py-3 text-right text-sm text-red-600">{fmt(pr.balanceDue)}</td>
      <td className="px-4 py-3 text-center">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${pm.cls}`}>{pm.label}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${sm.cls}`}>{sm.label}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {pr.status === 'draft' && (
            <>
              <button
                onClick={() => onConfirm(pr.id)}
                disabled={confirming === pr.id}
                className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
              >
                {confirming === pr.id ? 'Confirming…' : 'Confirm'}
              </button>
              <button
                onClick={() => onCancel(pr.id)}
                disabled={cancelling === pr.id}
                className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
          {pr.status === 'confirmed' && pr.paymentStatus !== 'paid' && (
            <Link
              href={`/purchases/receipts/${pr.id}/pay`}
              className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md transition-colors"
            >
              Add Payment
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'all' | PRStatus;
type PayTab = 'all' | PRPaymentStatus;

export default function PurchaseReceiptsPage() {
  const [tab,    setTab]    = useState<Tab>('all');
  const [payTab, setPayTab] = useState<PayTab>('all');
  const [page,   setPage]   = useState(1);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const { data, isLoading } = usePurchaseReceipts({
    status:        tab    === 'all' ? undefined : tab,
    paymentStatus: payTab === 'all' ? undefined : payTab,
    page,
    limit: 20,
  });

  const confirmPR = useConfirmPR();
  const cancelPR  = useCancelPR();

  async function handleConfirm(id: string) {
    if (!confirm('Confirm this receipt? This will update stock and process payments.')) return;
    setConfirming(id);
    try { await confirmPR.mutateAsync(id); }
    catch { alert('Failed to confirm receipt.'); }
    finally { setConfirming(null); }
  }

  async function handleCancel(id: string) {
    if (!confirm('Cancel this draft receipt?')) return;
    setCancelling(id);
    try { await cancelPR.mutateAsync(id); }
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
          <h1 className="text-2xl font-bold text-gray-900">Purchase Receipts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Receive goods from vendors, with or without a PO</p>
        </div>
        <Link
          href="/purchases/receipts/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Receipt
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Status tabs */}
        <div className="flex border-b border-gray-200 px-4 gap-1 overflow-x-auto">
          {(['all', 'draft', 'confirmed', 'cancelled'] as (Tab)[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }} className={tabCls(tab === t)}>
              {t === 'all' ? 'All' : STATUS_META[t as PRStatus]?.label ?? t}
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
                {t === 'all' ? 'All Payments' : PAY_META[t as PRPaymentStatus]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100">
                {['Receipt #', 'Vendor', 'Store', 'Items', 'Total', 'Paid', 'Balance', 'Payment', 'Status', ''].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                    ['Total', 'Paid', 'Balance'].includes(h) ? 'text-right' : h === 'Items' || h === 'Payment' || h === 'Status' ? 'text-center' : ''
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    No purchase receipts yet
                  </td>
                </tr>
              ) : (
                data?.data.map((pr) => (
                  <PRRow
                    key={pr.id} pr={pr}
                    onConfirm={handleConfirm} onCancel={handleCancel}
                    confirming={confirming} cancelling={cancelling}
                  />
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

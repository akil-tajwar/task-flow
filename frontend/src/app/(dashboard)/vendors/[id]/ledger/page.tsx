'use client';

import { useState, Suspense, useCallback } from 'react';
import { useParams }                        from 'next/navigation';
import Link                                 from 'next/link';
import { useVendors }                       from '@/hooks/use-vendors';
import { useVendorLedger }                  from '@/hooks/use-vendors';
import type { VendorLedgerEntry, VendorLedgerType } from '@/types';

// ─── Print style ──────────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #ledger-report, #ledger-report * { visibility: visible !important; }
  #ledger-report {
    position: fixed !important;
    inset: 0 !important;
    padding: 24px !important;
    background: #fff !important;
  }
  .no-print { display: none !important; }
  table { border-collapse: collapse; width: 100%; font-size: 11px; }
  th, td { border: 1px solid #d1d5db; padding: 5px 8px; }
  th { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
  .balance-positive { color: #dc2626 !important; }
  .balance-zero     { color: #6b7280 !important; }
}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: string | number) =>
  `$${parseFloat(String(v)).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtDateTime = (s: string) => {
  const d = new Date(s);
  return d.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStartStr = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const TYPE_META: Record<VendorLedgerType, { label: string; cls: string; printCls: string }> = {
  purchase:   { label: 'Purchase',   cls: 'bg-red-100 text-red-700',       printCls: 'color:#b91c1c' },
  payment:    { label: 'Payment',    cls: 'bg-emerald-100 text-emerald-700', printCls: 'color:#047857' },
  adjustment: { label: 'Adjustment', cls: 'bg-blue-100 text-blue-700',     printCls: 'color:#1d4ed8' },
};

// ─── Ledger row ───────────────────────────────────────────────────────────────

function LedgerRow({ entry, idx }: { entry: VendorLedgerEntry; idx: number }) {
  const isOpening = entry.referenceType === 'opening_balance';
  const meta      = TYPE_META[entry.type] ?? { label: entry.type, cls: 'bg-gray-100 text-gray-600', printCls: '' };
  const debit     = parseFloat(entry.debit);
  const credit    = parseFloat(entry.credit);
  const balance   = parseFloat(entry.balanceAfter);

  return (
    <tr className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(entry.createdAt)}</td>
      <td className="px-4 py-2.5 text-xs font-mono text-gray-600 whitespace-nowrap">
        {entry.referenceId
          ? <span title={entry.referenceId}>{entry.referenceId.slice(0, 8).toUpperCase()}</span>
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-2.5">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${meta.cls}`}>
          {isOpening ? 'Opening Balance' : meta.label}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[180px] truncate">
        {entry.notes ?? <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-2.5 text-right text-sm font-semibold">
        {debit > 0
          ? <span className="text-emerald-600">{fmt(debit)}</span>
          : <span className="text-gray-200">—</span>}
      </td>
      <td className="px-4 py-2.5 text-right text-sm font-semibold">
        {credit > 0
          ? <span className="text-red-500">{fmt(credit)}</span>
          : <span className="text-gray-200">—</span>}
      </td>
      <td className={`px-4 py-2.5 text-right text-sm font-black ${balance > 0 ? 'text-red-600 balance-positive' : 'text-gray-500 balance-zero'}`}>
        {fmt(balance)}
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-400">
        {entry.createdByUser?.name ?? '—'}
      </td>
    </tr>
  );
}

// ─── Inner report ─────────────────────────────────────────────────────────────

function VendorLedgerReport() {
  const { id } = useParams<{ id: string }>();

  // Date range state — defaults to current month
  const [dateFrom,   setDateFrom]   = useState(monthStartStr());
  const [dateTo,     setDateTo]     = useState(todayStr());
  const [applied,    setApplied]    = useState<{ from: string; to: string }>({ from: monthStartStr(), to: todayStr() });

  const applyFilter = useCallback(() => setApplied({ from: dateFrom, to: dateTo }), [dateFrom, dateTo]);

  const { data: ledger, isLoading, isFetching } = useVendorLedger(id, {
    dateFrom: applied.from || undefined,
    dateTo:   applied.to   || undefined,
  });

  const { data: vendorsResult } = useVendors({ limit: 200 });
  const vendor = vendorsResult?.data.find((v) => v.id === id);

  const entries:        VendorLedgerEntry[] = ledger?.data          ?? [];
  const openingBalance: number              = ledger?.openingBalance ?? 0;
  const closingBalance: number              = ledger?.closingBalance ?? 0;
  const currentBalance: number              = ledger?.currentBalance ?? 0;
  const total:          number              = ledger?.total          ?? 0;

  const totalDebit  = entries.reduce((s, e) => s + parseFloat(e.debit),  0);
  const totalCredit = entries.reduce((s, e) => s + parseFloat(e.credit), 0);

  const periodLabel = applied.from && applied.to
    ? `${fmtDate(applied.from)} — ${fmtDate(applied.to)}`
    : applied.from ? `From ${fmtDate(applied.from)}`
    : applied.to   ? `Up to ${fmtDate(applied.to)}`
    : 'All time';

  const generatedOn = new Date().toLocaleDateString('en', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  function handlePrint() { window.print(); }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      <div className="space-y-4">

        {/* Toolbar (no-print) */}
        <div className="no-print flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/vendors" className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Vendor Ledger Report</h1>
              {vendor && <p className="text-sm text-gray-500">{vendor.name}</p>}
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded-lg transition-colors shadow-sm"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
        </div>

        {/* Date range filter (no-print) */}
        <div className="no-print bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={applyFilter}
              disabled={isFetching}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {isFetching ? 'Loading…' : 'Generate Report'}
            </button>
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setApplied({ from: '', to: '' }); }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              All Time
            </button>
          </div>
        </div>

        {/* ── REPORT BODY (this section is printed) ────────────────────── */}
        <div id="ledger-report" className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          {/* Report header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Vendor Ledger Report</p>
                <h2 className="text-2xl font-black text-gray-900">{vendor?.name ?? '—'}</h2>
                {vendor?.contactPerson && <p className="text-sm text-gray-500 mt-0.5">{vendor.contactPerson}</p>}
                {vendor?.email         && <p className="text-xs text-gray-400">{vendor.email}</p>}
                {vendor?.phone         && <p className="text-xs text-gray-400">{vendor.phone}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">Period</p>
                <p className="text-base font-bold text-gray-800">{periodLabel}</p>
                <p className="text-[11px] text-gray-400 mt-2">Generated: {generatedOn}</p>
                <p className="text-[11px] text-gray-400">{total} transaction{total !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Summary strip */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Opening Balance</p>
                <p className={`text-lg font-black mt-0.5 ${openingBalance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {fmt(openingBalance)}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Payments</p>
                <p className="text-lg font-black mt-0.5 text-emerald-600">{fmt(totalDebit)}</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Purchases</p>
                <p className="text-lg font-black mt-0.5 text-red-600">{fmt(totalCredit)}</p>
              </div>
              <div className={`rounded-lg border px-4 py-3 ${closingBalance > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Closing Balance</p>
                <p className={`text-lg font-black mt-0.5 ${closingBalance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {fmt(closingBalance)}
                </p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Date & Time', 'Ref #', 'Type', 'Description', 'Debit (Payment)', 'Credit (Purchase)', 'Balance', 'By'].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider ${
                      ['Debit (Payment)', 'Credit (Purchase)', 'Balance'].includes(h) ? 'text-right' : ''
                    }`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">

                {/* Opening balance row */}
                {applied.from && (
                  <tr className="bg-amber-50/60">
                    <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(applied.from)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-300">—</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Opening Balance
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">Balance brought forward</td>
                    <td className="px-4 py-2.5" />
                    <td className="px-4 py-2.5" />
                    <td className={`px-4 py-2.5 text-right text-sm font-black ${openingBalance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {fmt(openingBalance)}
                    </td>
                    <td className="px-4 py-2.5" />
                  </tr>
                )}

                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">
                      No transactions found for the selected period.
                    </td>
                  </tr>
                ) : (
                  entries.map((e, i) => <LedgerRow key={e.id} entry={e} idx={i} />)
                )}

                {/* Totals footer */}
                {entries.length > 0 && (
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td className="px-4 py-3 text-xs font-bold text-gray-600 uppercase" colSpan={4}>
                      Period Total
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-emerald-700">{fmt(totalDebit)}</td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">{fmt(totalCredit)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-black ${closingBalance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {fmt(closingBalance)}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Current balance footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-gray-400">
              Debit = Payment made to vendor &nbsp;·&nbsp; Credit = Amount owed to vendor &nbsp;·&nbsp; Balance positive = outstanding payable
            </p>
            <div className="text-right">
              <p className="text-xs text-gray-400">Current overall balance</p>
              <p className={`text-xl font-black ${currentBalance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                {fmt(currentBalance)}
              </p>
            </div>
          </div>

        </div>
        {/* ── end report body ────────────────────────────────────────────── */}

      </div>
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function VendorLedgerPage() {
  return (
    <Suspense>
      <VendorLedgerReport />
    </Suspense>
  );
}

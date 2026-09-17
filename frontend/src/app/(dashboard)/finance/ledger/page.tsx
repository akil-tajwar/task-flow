'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccounts, useAccountLedger } from '@/hooks/use-finance';
import type { AccountLedgerRow, AccountCategory } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #ledger-print, #ledger-print * { visibility: visible !important; }
  #ledger-print { position: fixed !important; inset: 0 !important; padding: 28px !important; background: #fff !important; }
  .no-print { display: none !important; }
  table { border-collapse: collapse; width: 100%; font-size: 11px; }
  th, td { border: 1px solid #d1d5db; padding: 5px 8px; }
  th { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
  .in-row td { background: #f0fdf4 !important; -webkit-print-color-adjust: exact; }
  .out-row td { background: #fef2f2 !important; -webkit-print-color-adjust: exact; }
}
`;

const TYPE_LABELS: Record<string, string> = {
  opening_balance: 'Opening Balance',
  deposit:         'Deposit',
  withdrawal:      'Withdrawal',
  payment:         'Payment',
  receipt:         'Receipt',
  transfer_in:     'Transfer In',
  transfer_out:    'Transfer Out',
};

const REF_LABELS: Record<string, string> = {
  expense:          'Expense',
  expense_reversal: 'Exp. Reversal',
  sales_invoice:    'Sales Invoice',
  purchase_receipt: 'Purchase',
  transfer:         'Transfer',
  seed:             'Opening',
};

const fmt = (v: number) =>
  v.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CAT_META: Record<AccountCategory, { label: string; cls: string }> = {
  cash: { label: 'Cash',  cls: 'bg-emerald-100 text-emerald-700' },
  bank: { label: 'Bank',  cls: 'bg-blue-100 text-blue-700' },
};

// ─── Ledger row ───────────────────────────────────────────────────────────────

function LedgerRow({ row }: { row: AccountLedgerRow }) {
  const isIn      = row.direction === 'in';
  const typeLabel = TYPE_LABELS[row.type] ?? row.type;
  const refLabel  = row.referenceType ? REF_LABELS[row.referenceType] ?? row.referenceType : null;

  return (
    <tr className={isIn ? 'in-row' : 'out-row'}>
      <td className="px-4 py-2.5 text-sm text-gray-500 whitespace-nowrap">
        {new Date(row.createdAt).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })}
        <p className="text-xs text-gray-300">
          {new Date(row.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </td>
      <td className="px-4 py-2.5">
        <span className="text-xs font-semibold text-gray-700">{typeLabel}</span>
        {refLabel && (
          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{refLabel}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-sm text-gray-500 max-w-[200px] truncate">
        {row.notes ?? '—'}
      </td>
      <td className="px-4 py-2.5 text-right">
        {isIn ? (
          <span className="text-sm font-bold text-emerald-600">{fmt(parseFloat(row.amount))}</span>
        ) : (
          <span className="text-gray-200">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        {!isIn ? (
          <span className="text-sm font-bold text-red-500">{fmt(parseFloat(row.amount))}</span>
        ) : (
          <span className="text-gray-200">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className={`text-sm font-black ${row.runningBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
          {fmt(row.runningBalance)}
        </span>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function LedgerContent() {
  const searchParams = useSearchParams();
  const { data: accounts = [] } = useAccounts();

  const [accountId, setAccountId] = useState(searchParams.get('accountId') ?? '');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');

  useEffect(() => {
    const id = searchParams.get('accountId');
    if (id) setAccountId(id);
  }, [searchParams]);

  const { data: ledger, isLoading, isFetching } = useAccountLedger(
    accountId || null,
    dateFrom  || undefined,
    dateTo    || undefined,
  );

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const printRef = useRef<HTMLDivElement>(null);

  const txns   = ledger?.transactions ?? [];
  const noData = !isLoading && accountId && !isFetching && !ledger;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      <div className="space-y-5">

        {/* Header */}
        <div className="no-print flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash &amp; Bank Ledger</h1>
            <p className="text-sm text-gray-500 mt-0.5">Full transaction history per account</p>
          </div>
          {ledger && (
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-900 rounded-lg shadow-sm transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="no-print bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select account…</option>
                <optgroup label="Cash">
                  {accounts.filter((a) => a.category === 'cash').map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Bank">
                  {accounts.filter((a) => a.category === 'bank').map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From Date</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">To Date</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {/* Empty state */}
        {!accountId && (
          <div className="bg-white rounded-xl border border-gray-200 py-20 text-center text-gray-400">
            <svg className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="text-sm font-medium">Select an account to view its ledger</p>
          </div>
        )}

        {noData && (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400 text-sm">
            Account not found.
          </div>
        )}

        {/* ── Ledger report ── */}
        {ledger && (
          <div id="ledger-print" ref={printRef} className="bg-white rounded-xl border border-gray-200 overflow-hidden">

            {/* Report header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Account Ledger</p>
                  <h2 className="text-2xl font-black text-gray-900 mt-0.5">{ledger.account.name}</h2>
                  {selectedAccount && (
                    <span className={`inline-block mt-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${CAT_META[selectedAccount.category].cls}`}>
                      {CAT_META[selectedAccount.category].label}
                      {selectedAccount.bankName ? ` — ${selectedAccount.bankName}` : ''}
                    </span>
                  )}
                </div>
                <div className="text-right text-sm text-gray-500">
                  {dateFrom && <p>From: <strong>{dateFrom}</strong></p>}
                  {dateTo   && <p>To: <strong>{dateTo}</strong></p>}
                  {!dateFrom && !dateTo && <p className="text-gray-400">All transactions</p>}
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                {[
                  { label: 'Opening Balance', value: ledger.openingBalance, color: 'text-gray-900' },
                  { label: 'Total In  (+)',   value: ledger.totalIn,        color: 'text-emerald-600' },
                  { label: 'Total Out (−)',   value: ledger.totalOut,       color: 'text-red-500' },
                  { label: 'Closing Balance', value: ledger.closingBalance, color: ledger.closingBalance >= 0 ? 'text-indigo-700' : 'text-red-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                    <p className={`text-lg font-black mt-0.5 ${color}`}>{fmt(value)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Transactions table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-32">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right w-28">In (+)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right w-28">Out (−)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right w-32">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">

                  {/* Opening balance row */}
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="px-4 py-2.5 text-sm font-semibold text-gray-500 italic">
                      {dateFrom ? `Opening Balance as of ${dateFrom}` : 'Opening Balance'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm font-black text-gray-700">
                      {fmt(ledger.openingBalance)}
                    </td>
                  </tr>

                  {isLoading || isFetching ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        {[...Array(6)].map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : txns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                        No transactions in this period
                      </td>
                    </tr>
                  ) : (
                    txns.map((row) => <LedgerRow key={row.id} row={row} />)
                  )}

                  {/* Closing balance row */}
                  {txns.length > 0 && (
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-gray-600">
                        Totals
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-black text-emerald-600">
                        {fmt(ledger.totalIn)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-black text-red-500">
                        {fmt(ledger.totalOut)}
                      </td>
                      <td className="px-4 py-3 text-right text-base font-black text-gray-900">
                        {fmt(ledger.closingBalance)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Print footer */}
            <div className="px-6 py-3 border-t border-gray-50 text-right">
              <p className="text-xs text-gray-300">
                Generated {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function CashBankLedgerPage() {
  return (
    <Suspense>
      <LedgerContent />
    </Suspense>
  );
}

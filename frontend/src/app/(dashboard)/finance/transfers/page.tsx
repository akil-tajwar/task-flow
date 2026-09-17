'use client';

import { useState }           from 'react';
import { useAccounts }        from '@/hooks/use-finance';
import { useTransfers, useTransferFunds, type TransferResult } from '@/hooks/use-finance';
import type { AccountCategory, FundTransfer } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: string | number) =>
  parseFloat(String(v)).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const todayStr = () => new Date().toISOString().slice(0, 10);

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

const CAT_META: Record<AccountCategory, { label: string; icon: string; color: string; bg: string }> = {
  cash: { label: 'Cash',  icon: '💵', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  bank: { label: 'Bank',  icon: '🏦', color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
};

function CategoryBadge({ category }: { category: AccountCategory }) {
  const m = CAT_META[category];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${m.bg} ${m.color}`}>
      {m.icon} {m.label}
    </span>
  );
}

// ─── Transfer arrow label ─────────────────────────────────────────────────────

function TransferLabel({ from, to }: { from: AccountCategory; to: AccountCategory }) {
  if (from === 'cash' && to === 'bank') return <span className="text-xs font-semibold text-blue-600">Cash → Bank</span>;
  if (from === 'bank' && to === 'cash') return <span className="text-xs font-semibold text-emerald-600">Bank → Cash</span>;
  return <span className="text-xs font-semibold text-purple-600">Bank → Bank</span>;
}

// ─── Transfer row ─────────────────────────────────────────────────────────────

function TransferRow({ t }: { t: FundTransfer }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
        {new Date(t.createdAt).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })}
        <p className="text-xs text-gray-300">
          {new Date(t.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">{t.fromAccountName}</p>
            <CategoryBadge category={t.fromCategory} />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <TransferLabel from={t.fromCategory} to={t.toCategory} />
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{t.toAccountName}</p>
        <CategoryBadge category={t.toCategory} />
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-base font-black text-gray-900">{fmt(t.amount)}</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">{t.notes ?? '—'}</td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FundTransfersPage() {
  const { data: accounts = [] } = useAccounts();
  const transferFunds = useTransferFunds();

  const [page, setPage] = useState(1);
  const { data, isLoading } = useTransfers(page);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [fromId,  setFromId]  = useState('');
  const [toId,    setToId]    = useState('');
  const [amount,  setAmount]  = useState('');
  const [date,    setDate]    = useState(todayStr());
  const [ref,     setRef]     = useState('');
  const [notes,   setNotes]   = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [lastResult, setLastResult] = useState<TransferResult | null>(null);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const toAccount   = accounts.find((a) => a.id === toId);

  // ── Summary cards ────────────────────────────────────────────────────────────
  const cashBalance  = accounts.filter((a) => a.category === 'cash').reduce((s, a) => s + parseFloat(a.currentBalance), 0);
  const bankBalance  = accounts.filter((a) => a.category === 'bank').reduce((s, a) => s + parseFloat(a.currentBalance), 0);
  const totalBalance = cashBalance + bankBalance;

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!fromId)             { setError('Select a source account.'); return; }
    if (!toId)               { setError('Select a destination account.'); return; }
    if (fromId === toId)     { setError('Source and destination must be different.'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0)    { setError('Enter a valid amount.'); return; }

    if (fromAccount && fromAccount.accountType !== 'overdraft') {
      if (parseFloat(fromAccount.currentBalance) < amt) {
        setError(`Insufficient balance in "${fromAccount.name}". Available: ${fmt(fromAccount.currentBalance)}`);
        return;
      }
    }

    setSaving(true);
    try {
      const result = await transferFunds.mutateAsync({
        fromAccountId:   fromId,
        toAccountId:     toId,
        amount:          amt,
        transferDate:    date,
        referenceNumber: ref.trim() || null,
        notes:           notes.trim() || null,
      });
      setLastResult(result);
      setSuccess(
        `${fmt(amt)} transferred successfully. ` +
        `${result.from.name}: ${fmt(result.from.balanceAfter)} | ` +
        `${result.to.name}: ${fmt(result.to.balanceAfter)}`
      );
      setFromId(''); setToId(''); setAmount(''); setRef(''); setNotes(''); setDate(todayStr());
      setPage(1);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Transfer failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fund Transfers</h1>
        <p className="text-sm text-gray-500 mt-0.5">Move money between cash and bank accounts</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Cash', value: cashBalance,  color: 'emerald', icon: '💵' },
          { label: 'Total Bank', value: bankBalance,  color: 'blue',    icon: '🏦' },
          { label: 'Combined',   value: totalBalance, color: 'indigo',  icon: '💰' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className={`bg-white rounded-xl border border-gray-200 p-5`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
              <span className="text-lg">{icon}</span>
            </div>
            <p className={`text-2xl font-black text-${color}-600`}>{fmt(value)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {accounts.filter((a) => a.category === (label === 'Total Cash' ? 'cash' : label === 'Total Bank' ? 'bank' : undefined)).length || accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Transfer form ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-bold text-gray-700 mb-5">New Transfer</h2>

            <form onSubmit={handleTransfer} className="space-y-4">

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">{error}</div>
              )}
              {success && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">{success}</div>
              )}

              {/* From account */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  From Account <span className="text-red-500">*</span>
                </label>
                <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={inputCls} required>
                  <option value="">Select source…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.category.toUpperCase()} ({fmt(a.currentBalance)})
                    </option>
                  ))}
                </select>
                {fromAccount && (
                  <p className="mt-1 text-xs text-gray-400">
                    Available: <span className="font-bold text-gray-700">{fmt(fromAccount.currentBalance)}</span>
                  </p>
                )}
              </div>

              {/* Visual arrow */}
              <div className="flex items-center justify-center py-1">
                <div className="flex-1 border-t border-dashed border-gray-200" />
                <div className="mx-3 h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                  <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="flex-1 border-t border-dashed border-gray-200" />
              </div>

              {/* To account */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  To Account <span className="text-red-500">*</span>
                </label>
                <select value={toId} onChange={(e) => setToId(e.target.value)} className={inputCls} required>
                  <option value="">Select destination…</option>
                  {accounts.filter((a) => a.id !== fromId).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.category.toUpperCase()} ({fmt(a.currentBalance)})
                    </option>
                  ))}
                </select>
                {toAccount && (
                  <p className="mt-1 text-xs text-gray-400">
                    Current balance: <span className="font-bold text-gray-700">{fmt(toAccount.currentBalance)}</span>
                  </p>
                )}
              </div>

              {/* Transfer type indicator */}
              {fromAccount && toAccount && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 flex items-center gap-3">
                  <CategoryBadge category={fromAccount.category} />
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <CategoryBadge category={toAccount.category} />
                  <span className="ml-auto text-xs text-gray-400 font-medium">
                    <TransferLabel from={fromAccount.category} to={toAccount.category} />
                  </span>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm font-medium">$</span>
                  <input
                    type="number" min="0.01" step="0.01" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00" required
                    className={`${inputCls} pl-7 text-lg font-bold`}
                  />
                </div>
                {fromAccount && amount && parseFloat(amount) > 0 && (
                  <p className="mt-1 text-xs">
                    {parseFloat(fromAccount.currentBalance) >= parseFloat(amount)
                      ? <span className="text-emerald-600">✓ Sufficient balance</span>
                      : <span className="text-red-500">⚠ Insufficient balance</span>
                    }
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Reference # <span className="text-gray-300 normal-case font-normal">(optional)</span>
                </label>
                <input type="text" value={ref} onChange={(e) => setRef(e.target.value)}
                  placeholder="Cheque #, transfer ref…" className={inputCls} />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Notes <span className="text-gray-300 normal-case font-normal">(optional)</span>
                </label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  rows={2} placeholder="Reason for transfer…"
                  className={`${inputCls} resize-none`} />
              </div>

              <button type="submit" disabled={saving}
                className="w-full py-3 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors">
                {saving ? 'Processing…' : 'Confirm Transfer'}
              </button>
            </form>
          </div>

          {/* Account balances mini-list */}
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Account Balances</h3>
            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{a.category === 'cash' ? '💵' : '🏦'}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{a.name}</p>
                      {a.bankName && <p className="text-xs text-gray-400">{a.bankName}</p>}
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${parseFloat(a.currentBalance) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {fmt(a.currentBalance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Transfer history ── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-700">Transfer History</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">From</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center w-24">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">To</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Amount</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        {[...Array(6)].map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : data?.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-gray-300">
                        <svg className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        No transfers yet
                      </td>
                    </tr>
                  ) : (
                    data?.data.map((t, i) => <TransferRow key={t.transferId ?? i} t={t} />)
                  )}
                </tbody>
              </table>
            </div>

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  {(page - 1) * 30 + 1}–{Math.min(page * 30, data.total)} of {data.total}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    ← Prev
                  </button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

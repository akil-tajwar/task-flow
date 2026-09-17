'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useExpenses, useCreateExpense, useDeleteExpense } from '@/hooks/use-expenses';
import { useExpenseHeads } from '@/hooks/use-expenses';
import { useAccounts }     from '@/hooks/use-finance';
import type { Expense, AccountCategory } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: string | number) =>
  parseFloat(String(v)).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const todayStr = () => new Date().toISOString().slice(0, 10);

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

const CAT_BADGE: Record<AccountCategory, string> = {
  cash: 'bg-emerald-100 text-emerald-700',
  bank: 'bg-blue-100 text-blue-700',
};

// ─── Expense row ──────────────────────────────────────────────────────────────

function ExpenseRow({ exp, onDelete }: { exp: Expense; onDelete: (id: string) => void }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
        {exp.expenseDate}
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-gray-900">{exp.expenseHead?.name ?? '—'}</span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${CAT_BADGE[exp.account?.category ?? 'cash']}`}>
            {(exp.account?.category ?? 'cash').toUpperCase()}
          </span>
          <span className="text-sm text-gray-600">{exp.account?.name ?? '—'}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-black text-gray-900">{fmt(exp.amount)}</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {exp.referenceNumber
          ? <span className="font-mono text-xs text-gray-500">#{exp.referenceNumber}</span>
          : <span className="text-gray-200">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400 max-w-[180px] truncate">{exp.notes ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{exp.createdByUser?.name ?? '—'}</td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => onDelete(exp.id)}
          className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors">
          Delete
        </button>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  // ── Filters ─────────────────────────────────────────────────────────────────
  const [headFilter, setHeadFilter] = useState('');
  const [acctFilter, setAcctFilter] = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [page,       setPage]       = useState(1);

  const { data, isLoading } = useExpenses({
    expenseHeadId: headFilter || undefined,
    accountId:     acctFilter || undefined,
    dateFrom:      dateFrom   || undefined,
    dateTo:        dateTo     || undefined,
    page, limit: 30,
  });

  // ── Reference data ───────────────────────────────────────────────────────────
  const { data: heads    = [] } = useExpenseHeads();
  const { data: accounts = [] } = useAccounts();

  // ── Form state ───────────────────────────────────────────────────────────────
  const [showForm,    setShowForm]    = useState(false);
  const [fHeadId,     setFHeadId]     = useState('');
  const [fAccountId,  setFAccountId]  = useState('');
  const [fAmount,     setFAmount]     = useState('');
  const [fDate,       setFDate]       = useState(todayStr());
  const [fRef,        setFRef]        = useState('');
  const [fNotes,      setFNotes]      = useState('');
  const [formError,   setFormError]   = useState('');

  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const selectedAccount = accounts.find((a) => a.id === fAccountId);

  function resetForm() {
    setFHeadId(''); setFAccountId(''); setFAmount('');
    setFDate(todayStr()); setFRef(''); setFNotes(''); setFormError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const amt = parseFloat(fAmount);
    if (!fHeadId)         { setFormError('Select an expense head.'); return; }
    if (!fAccountId)      { setFormError('Select an account.'); return; }
    if (!amt || amt <= 0) { setFormError('Enter a valid amount.'); return; }

    try {
      await createExpense.mutateAsync({
        expenseHeadId:   fHeadId,
        accountId:       fAccountId,
        amount:          amt,
        expenseDate:     fDate,
        referenceNumber: fRef.trim() || null,
        notes:           fNotes.trim() || null,
      });
      resetForm();
      setShowForm(false);
      setPage(1);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFormError(msg ?? 'Failed to create expense.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this expense and reverse the account balance?')) return;
    try { await deleteExpense.mutateAsync(id); }
    catch { alert('Failed to delete expense.'); }
  }

  const totalAmount = data?.totalAmount ?? 0;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record cash & bank expenditure</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/finance/expense-heads"
            className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Manage Heads
          </Link>
          <button onClick={() => { setShowForm((v) => !v); setFormError(''); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Expense
          </button>
        </div>
      </div>

      {/* ── Entry form ── */}
      {showForm && (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Add Expense</h2>
          {formError && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700 font-medium">
              {formError}
            </div>
          )}
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Expense head */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Expense Head <span className="text-red-500">*</span>
                </label>
                <select value={fHeadId} onChange={(e) => setFHeadId(e.target.value)} className={inputCls} required>
                  <option value="">Select head…</option>
                  {heads.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>

              {/* Account */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Pay From <span className="text-red-500">*</span>
                </label>
                <select value={fAccountId} onChange={(e) => setFAccountId(e.target.value)} className={inputCls} required>
                  <option value="">Select account…</option>
                  <optgroup label="Cash">
                    {accounts.filter((a) => a.category === 'cash' && a.isActive).map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({fmt(a.currentBalance)})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Bank">
                    {accounts.filter((a) => a.category === 'bank' && a.isActive).map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({fmt(a.currentBalance)})</option>
                    ))}
                  </optgroup>
                </select>
                {selectedAccount && (
                  <p className="mt-1 text-xs text-gray-400">
                    Available: <span className="font-bold text-gray-700">{fmt(selectedAccount.currentBalance)}</span>
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                  <input type="number" min="0.01" step="0.01" value={fAmount}
                    onChange={(e) => setFAmount(e.target.value)}
                    placeholder="0.00" required className={`${inputCls} pl-6 font-bold`} />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
                <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className={inputCls} required />
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reference #</label>
                <input type="text" value={fRef} onChange={(e) => setFRef(e.target.value)}
                  placeholder="Cheque, receipt…" className={inputCls} />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
                <input type="text" value={fNotes} onChange={(e) => setFNotes(e.target.value)}
                  placeholder="Brief description" className={inputCls} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={createExpense.isPending}
                className="px-5 py-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors">
                {createExpense.isPending ? 'Saving…' : 'Save Expense'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters + summary ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select value={headFilter} onChange={(e) => { setHeadFilter(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">All Heads</option>
            {heads.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select value={acctFilter} onChange={(e) => { setAcctFilter(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">All Accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            placeholder="From" className={inputCls} />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            placeholder="To" className={inputCls} />
        </div>

        {data && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {data.total} expense{data.total !== 1 ? 's' : ''} found
            </p>
            <div className="text-right">
              <span className="text-xs text-gray-400 uppercase tracking-wider">Total Spent</span>
              <p className="text-lg font-black text-red-600">{fmt(totalAmount)}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Date', 'Expense Head', 'Account', 'Amount', 'Reference', 'Notes', 'By', ''].map((h) => (
                  <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Amount' ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14 text-gray-400 text-sm">
                    <svg className="h-10 w-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    No expenses found
                  </td>
                </tr>
              ) : (
                data?.data.map((exp) => (
                  <ExpenseRow key={exp.id} exp={exp} onDelete={handleDelete} />
                ))
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

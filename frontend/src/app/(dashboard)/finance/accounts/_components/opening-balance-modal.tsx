'use client';

import { useState } from 'react';
import { useSetOpeningBalance } from '@/hooks/use-finance';
import type { FinancialAccount } from '@/types';

interface Props {
  account: FinancialAccount;
  onClose: () => void;
}

export function OpeningBalanceModal({ account, onClose }: Props) {
  const [amount, setAmount] = useState(account.openingBalance);
  const [notes,  setNotes]  = useState('');
  const [error,  setError]  = useState('');

  const setBalance = useSetOpeningBalance();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) { setError('Enter a valid amount (0 or more)'); return; }

    try {
      await setBalance.mutateAsync({ id: account.id, openingBalance: parsed, notes: notes.trim() || undefined });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to update opening balance.');
    }
  }

  const isCash = account.category === 'cash';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="px-6 py-5 border-b">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0
                ${isCash ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                {isCash ? (
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Opening Balance</h2>
                <p className="text-sm text-gray-500">{account.name}</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Current opening balance</span>
                <span className="font-semibold text-gray-900">${parseFloat(account.openingBalance).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current balance</span>
                <span className="font-semibold text-gray-900">${parseFloat(account.currentBalance).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                New Opening Balance *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="number" min="0" step="0.01" required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                The current balance will be recalculated automatically.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Notes (optional)
              </label>
              <input
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Physical count 2024-01-15"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={setBalance.isPending}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {setBalance.isPending ? 'Saving…' : 'Update Balance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

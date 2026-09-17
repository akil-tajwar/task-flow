'use client';

import { useState, useEffect } from 'react';

interface Props {
  open:          boolean;
  label:         string;          // "Vendor" | "Customer"
  entityName:    string;
  currentBalance: number;
  onSave:        (amount: number, notes: string) => Promise<void>;
  onClose:       () => void;
}

const fmt = (n: number) =>
  `$${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function OpeningBalanceModal({ open, label, entityName, currentBalance, onSave, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [notes,  setNotes]  = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (open) {
      setAmount(currentBalance > 0 ? currentBalance.toFixed(2) : '');
      setNotes('');
      setError('');
    }
  }, [open, currentBalance]);

  if (!open) return null;

  async function handleSave() {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) { setError('Enter a valid amount (0 or more).'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(val, notes.trim() || `Opening balance`);
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const newBalance = parseFloat(amount) || 0;
  const diff = newBalance - currentBalance;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-xl p-6">

        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Opening Balance — {label}</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate max-w-[220px]">{entityName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between text-sm">
          <span className="text-gray-500">Current balance</span>
          <span className={`font-bold ${currentBalance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
            {fmt(currentBalance)}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              New Opening Balance <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Balance brought forward"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {amount !== '' && !isNaN(parseFloat(amount)) && (
            <div className="text-xs text-gray-500 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
              {diff === 0 ? (
                <span>No change — balance already at {fmt(newBalance)}</span>
              ) : diff > 0 ? (
                <span>Will <strong className="text-red-600">add {fmt(diff)}</strong> to balance → new total {fmt(newBalance)}</span>
              ) : (
                <span>Will <strong className="text-emerald-600">reduce {fmt(Math.abs(diff))}</strong> from balance → new total {fmt(newBalance)}</span>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || amount === ''}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Set Balance'}
          </button>
        </div>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect }  from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link                      from 'next/link';
import { usePurchaseReceipt, useAddPRPayment } from '@/hooks/use-purchases';
import { useAccounts }           from '@/hooks/use-finance';
import { useVendorBalance }      from '@/hooks/use-vendors';
import type { PurchasePayMode }  from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: string | number) =>
  `$${parseFloat(String(v)).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const todayStr = () => new Date().toISOString().slice(0, 10);

const inputCls  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const selectCls = inputCls;

const MODE_LABELS: Record<PurchasePayMode, string> = {
  cash:   'Cash',
  bank:   'Bank Transfer',
  credit: 'Credit (Vendor)',
};

const PAY_STATUS_COLORS = {
  unpaid:  'bg-red-100 text-red-600',
  partial: 'bg-amber-100 text-amber-700',
  paid:    'bg-emerald-100 text-emerald-700',
};

// ─── Existing payment row ─────────────────────────────────────────────────────

function PaymentRow({ mode, account, amount, date, ref: refNum, notes }: {
  mode:    PurchasePayMode;
  account: string | null;
  amount:  string;
  date:    string;
  ref:     string | null;
  notes:   string | null;
}) {
  const modeColor = {
    cash:   'bg-emerald-100 text-emerald-700',
    bank:   'bg-blue-100 text-blue-700',
    credit: 'bg-orange-100 text-orange-700',
  }[mode];

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${modeColor}`}>
          {MODE_LABELS[mode]}
        </span>
        <div>
          {account && <p className="text-sm text-gray-700">{account}</p>}
          {refNum  && <p className="text-xs text-gray-400">Ref: {refNum}</p>}
          {notes   && !refNum && <p className="text-xs text-gray-400">{notes}</p>}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-900">{fmt(amount)}</p>
        <p className="text-xs text-gray-400">{date}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AddPaymentPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const { data: pr, isLoading } = usePurchaseReceipt(id);
  const { data: accounts = [] } = useAccounts();
  const addPayment              = useAddPRPayment();

  const vendorId = pr?.vendorId ?? null;
  const { data: vendorBalData } = useVendorBalance(vendorId);
  const vendorBalance = vendorBalData?.balance ?? 0;

  // Form state
  const [mode,   setMode]   = useState<PurchasePayMode>('cash');
  const [acctId, setAcctId] = useState('');
  const [amount, setAmount] = useState('');
  const [date,   setDate]   = useState(todayStr());
  const [refNum, setRefNum] = useState('');
  const [notes,  setNotes]  = useState('');
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill amount with remaining balance
  useEffect(() => {
    if (pr?.balanceDue) setAmount(parseFloat(pr.balanceDue).toFixed(2));
  }, [pr?.balanceDue]);

  // Reset account when mode changes
  useEffect(() => { setAcctId(''); }, [mode]);

  const cashBankAccounts = accounts.filter((a) => a.isActive &&
    (mode === 'cash' ? a.category === 'cash' : a.category === 'bank')
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid payment amount.'); return; }
    if ((mode === 'cash' || mode === 'bank') && !acctId) {
      setError('Select an account for cash / bank payment.'); return;
    }

    setSaving(true);
    try {
      await addPayment.mutateAsync({
        id,
        paymentMode:     mode,
        accountId:       acctId || null,
        amount:          amt,
        paymentDate:     date,
        referenceNumber: refNum.trim() || undefined,
        notes:           notes.trim() || undefined,
      });
      router.push('/purchases/receipts');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-56" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="max-w-3xl mx-auto text-center py-24">
        <p className="text-gray-400">Receipt not found.</p>
        <Link href="/purchases/receipts" className="mt-3 inline-block text-indigo-600 text-sm hover:underline">← Back</Link>
      </div>
    );
  }

  if (pr.status !== 'confirmed') {
    return (
      <div className="max-w-3xl mx-auto text-center py-24">
        <p className="text-gray-400">Payments can only be added to confirmed receipts.</p>
        <Link href="/purchases/receipts" className="mt-3 inline-block text-indigo-600 text-sm hover:underline">← Back</Link>
      </div>
    );
  }

  if (pr.paymentStatus === 'paid') {
    return (
      <div className="max-w-3xl mx-auto text-center py-24">
        <p className="text-emerald-600 font-semibold">This receipt is fully paid.</p>
        <Link href="/purchases/receipts" className="mt-3 inline-block text-indigo-600 text-sm hover:underline">← Back</Link>
      </div>
    );
  }

  const balanceDue = parseFloat(pr.balanceDue);
  const payStatus  = PAY_STATUS_COLORS[pr.paymentStatus];

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/purchases/receipts" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Add Payment</h1>
          <p className="text-sm text-gray-500 font-mono">{pr.receiptNumber}</p>
        </div>
      </div>

      {/* Receipt summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Vendor</p>
            <p className="text-base font-bold text-gray-900">{pr.vendor?.name ?? '—'}</p>
            {pr.store && <p className="text-sm text-gray-500">{pr.store.name}</p>}
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</p>
              <p className="text-lg font-black text-gray-900">{fmt(pr.total)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid</p>
              <p className="text-lg font-bold text-emerald-600">{fmt(pr.paidAmount)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Balance Due</p>
              <p className="text-lg font-black text-red-600">{fmt(pr.balanceDue)}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${payStatus}`}>
            {pr.paymentStatus.charAt(0).toUpperCase() + pr.paymentStatus.slice(1)}
          </span>
          <span className="text-xs text-gray-400">{pr.receiptDate}</span>
          {pr.po && <span className="text-xs text-gray-400">· PO: {pr.po.poNumber}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

        {/* Left: existing payments + vendor balance */}
        <div className="md:col-span-2 space-y-4">

          {/* Vendor balance */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vendor Balance</p>
              <Link
                href={`/vendors/${pr.vendorId}/ledger`}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                View Ledger →
              </Link>
            </div>
            <p className={`text-2xl font-black ${vendorBalance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {fmt(vendorBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {vendorBalance > 0
                ? 'Outstanding amount owed to vendor'
                : 'No outstanding balance'}
            </p>
          </div>

          {/* Existing payments */}
          <div className="bg-white rounded-xl border border-gray-200">
            <p className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              Payments Recorded
            </p>
            <div className="px-4 divide-y divide-gray-50">
              {(pr.payments ?? []).length === 0 ? (
                <p className="py-6 text-sm text-center text-gray-400">No payments yet</p>
              ) : (
                (pr.payments ?? []).map((p) => (
                  <PaymentRow
                    key={p.id}
                    mode={p.paymentMode}
                    account={p.account?.name ?? null}
                    amount={p.amount}
                    date={p.paymentDate}
                    ref={p.referenceNumber ?? null}
                    notes={p.notes ?? null}
                  />
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right: payment form */}
        <div className="md:col-span-3">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-700">New Payment</h2>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            {/* Mode selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'bank', 'credit'] as PurchasePayMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                      mode === m
                        ? m === 'cash'   ? 'bg-emerald-600 border-emerald-600 text-white'
                        : m === 'bank'   ? 'bg-blue-600 border-blue-600 text-white'
                        :                  'bg-orange-500 border-orange-500 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {MODE_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {/* Account (cash/bank only) */}
            {mode !== 'credit' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Account <span className="text-red-500">*</span>
                </label>
                <select value={acctId} onChange={(e) => setAcctId(e.target.value)} className={selectCls}>
                  <option value="">Select {mode === 'cash' ? 'cash drawer' : 'bank account'}…</option>
                  {cashBankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {fmt(a.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min="0.01"
                  max={balanceDue}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${inputCls} pl-6`}
                  required
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Max: {fmt(balanceDue)}</p>
            </div>

            {/* Payment date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
            </div>

            {/* Reference number */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Reference # / Cheque #
              </label>
              <input
                type="text"
                value={refNum}
                onChange={(e) => setRefNum(e.target.value)}
                placeholder="e.g. CHQ-1234 or TXN-9876"
                className={inputCls}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={mode === 'credit' ? 'Credit terms or reason…' : 'Optional notes…'}
                className={`${inputCls} resize-none`}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Link
                href="/purchases/receipts"
                className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {saving ? 'Recording…' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

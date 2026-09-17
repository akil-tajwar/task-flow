'use client';

import { useState, useEffect } from 'react';
import { useStores }          from '@/hooks/use-stores';
import { useCreateAccount, useUpdateAccount } from '@/hooks/use-finance';
import type { FinancialAccount, AccountCategory, AccountType } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: { value: AccountType; label: string; category: AccountCategory }[] = [
  { value: 'cash_drawer', label: 'Cash Drawer / Till',  category: 'cash' },
  { value: 'savings',     label: 'Savings Account',     category: 'bank' },
  { value: 'current',     label: 'Current Account',     category: 'bank' },
  { value: 'overdraft',   label: 'Overdraft Account',   category: 'bank' },
];

interface FormState {
  category:       AccountCategory;
  accountType:    AccountType;
  name:           string;
  storeId:        string;
  bankName:       string;
  accountNumber:  string;
  ifscCode:       string;
  branchName:     string;
  openingBalance: string;
  isDefault:      boolean;
  notes:          string;
}

const EMPTY: FormState = {
  category:       'bank',
  accountType:    'current',
  name:           '',
  storeId:        '',
  bankName:       '',
  accountNumber:  '',
  ifscCode:       '',
  branchName:     '',
  openingBalance: '0',
  isDefault:      false,
  notes:          '',
};

function fromAccount(a: FinancialAccount): FormState {
  return {
    category:       a.category,
    accountType:    a.accountType,
    name:           a.name,
    storeId:        a.storeId ?? '',
    bankName:       a.bankName ?? '',
    accountNumber:  a.accountNumber ?? '',
    ifscCode:       a.ifscCode ?? '',
    branchName:     a.branchName ?? '',
    openingBalance: a.openingBalance,
    isDefault:      a.isDefault,
    notes:          a.notes ?? '',
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const selectCls = inputCls;

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  account?: FinancialAccount | null;
  onClose: () => void;
}

export function AccountFormModal({ account, onClose }: Props) {
  const isEditing = !!account;
  const [form, setForm] = useState<FormState>(account ? fromAccount(account) : EMPTY);
  const [error, setError] = useState('');

  const { data: stores = [] } = useStores();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  const isPending = createAccount.isPending || updateAccount.isPending;

  // Sync category when accountType changes
  useEffect(() => {
    const match = ACCOUNT_TYPES.find((t) => t.value === form.accountType);
    if (match && match.category !== form.category) {
      setForm((f) => ({ ...f, category: match.category }));
    }
  }, [form.accountType]);

  function set(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const payload = {
      category:       form.category,
      accountType:    form.accountType,
      name:           form.name.trim(),
      storeId:        form.storeId || null,
      bankName:       form.category === 'bank' ? (form.bankName.trim() || null) : null,
      accountNumber:  form.category === 'bank' ? (form.accountNumber.trim() || null) : null,
      ifscCode:       form.category === 'bank' ? (form.ifscCode.trim() || null) : null,
      branchName:     form.category === 'bank' ? (form.branchName.trim() || null) : null,
      openingBalance: parseFloat(form.openingBalance) || 0,
      isDefault:      form.isDefault,
      notes:          form.notes.trim() || null,
    };

    try {
      if (isEditing) {
        const { openingBalance: _ob, category: _cat, accountType: _at, ...updatePayload } = payload;
        await updateAccount.mutateAsync({ id: account!.id, ...updatePayload });
      } else {
        await createAccount.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Something went wrong. Please try again.');
    }
  }

  const isCash = form.category === 'cash';
  const availableTypes = ACCOUNT_TYPES.filter((t) =>
    isEditing ? t.category === form.category : true,
  );

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? 'Edit Account' : 'Add Account'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <form id="account-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Account type selector */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Type</h3>
            <div className="grid grid-cols-2 gap-2">
              {availableTypes.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set({ accountType: t.value, category: t.category })}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors
                    ${form.accountType === t.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {t.category === 'cash' ? (
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  )}
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          {/* Basic details */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Details</h3>
            <div className="space-y-3">
              <Field label="Account Name" required>
                <input value={form.name} onChange={(e) => set({ name: e.target.value })}
                  placeholder={isCash ? 'e.g. Main Cash Drawer' : 'e.g. Operations Account'}
                  className={inputCls} required />
              </Field>

              <Field label="Assign to Store">
                <select value={form.storeId} onChange={(e) => set({ storeId: e.target.value })} className={selectCls}>
                  <option value="">All stores / General</option>
                  {stores.filter((s) => s.isActive).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </Field>

              {!isEditing && (
                <Field label="Opening Balance">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                    <input type="number" min="0" step="0.01" value={form.openingBalance}
                      onChange={(e) => set({ openingBalance: e.target.value })}
                      placeholder="0.00" className={`${inputCls} pl-7`} />
                  </div>
                </Field>
              )}
            </div>
          </section>

          {/* Bank-specific fields */}
          {!isCash && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bank Details</h3>
              <div className="space-y-3">
                <Field label="Bank Name" required>
                  <input value={form.bankName} onChange={(e) => set({ bankName: e.target.value })}
                    placeholder="e.g. HDFC Bank" className={inputCls} required={!isCash} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Account Number">
                    <input value={form.accountNumber} onChange={(e) => set({ accountNumber: e.target.value })}
                      placeholder="XXXXXXXXXXXX" className={inputCls} />
                  </Field>
                  <Field label="IFSC / Routing Code">
                    <input value={form.ifscCode} onChange={(e) => set({ ifscCode: e.target.value.toUpperCase() })}
                      placeholder="HDFC0001234" className={`${inputCls} font-mono`} />
                  </Field>
                </div>

                <Field label="Branch">
                  <input value={form.branchName} onChange={(e) => set({ branchName: e.target.value })}
                    placeholder="e.g. Main Branch, Mumbai" className={inputCls} />
                </Field>
              </div>
            </section>
          )}

          {/* Options */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Options</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isDefault}
                  onChange={(e) => set({ isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Set as default {isCash ? 'cash' : 'bank'} account</p>
                  <p className="text-xs text-gray-400">Used when no account is specified in transactions</p>
                </div>
              </label>

              <Field label="Notes">
                <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })}
                  rows={2} placeholder="Optional notes about this account…"
                  className={`${inputCls} resize-none`} />
              </Field>
            </div>
          </section>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0 bg-white">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button form="account-form" type="submit" disabled={isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Account'}
          </button>
        </div>
      </div>
    </>
  );
}

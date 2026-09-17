'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAccounts, useDeleteAccount } from '@/hooks/use-finance';
import { useMe }  from '@/hooks/use-auth';
import { AccountFormModal }    from './_components/account-form-modal';
import { OpeningBalanceModal } from './_components/opening-balance-modal';
import type { FinancialAccount, AccountCategory } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<AccountCategory, string> = { cash: 'Cash', bank: 'Bank' };
const CATEGORY_COLOR: Record<AccountCategory, string> = {
  cash: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  bank: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};
const TYPE_LABEL: Record<string, string> = {
  cash_drawer: 'Cash Drawer',
  savings:     'Savings',
  current:     'Current',
  overdraft:   'Overdraft',
};

function maskAccountNumber(n?: string | null) {
  if (!n || n.length < 5) return n ?? '—';
  return '•'.repeat(n.length - 4) + n.slice(-4);
}

function balanceColor(bal: string) {
  const n = parseFloat(bal);
  if (n < 0)   return 'text-red-600';
  if (n === 0) return 'text-gray-400';
  return 'text-emerald-600';
}

// ─── Account card ─────────────────────────────────────────────────────────────

function AccountCard({
  account,
  isAdmin,
  onEdit,
  onSetBalance,
  onDelete,
  deletingId,
}: {
  account:     FinancialAccount;
  isAdmin:     boolean;
  onEdit:      (a: FinancialAccount) => void;
  onSetBalance:(a: FinancialAccount) => void;
  onDelete:    (a: FinancialAccount) => void;
  deletingId:  string | null;
}) {
  const isCash = account.category === 'cash';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0
            ${isCash ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
            {isCash ? (
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            )}
          </div>

          {/* Name + badges */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 truncate">{account.name}</p>
              {account.isDefault && (
                <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  Default
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[11px] font-semibold border px-1.5 py-0.5 rounded ${CATEGORY_COLOR[account.category]}`}>
                {CATEGORY_LABEL[account.category]}
              </span>
              <span className="text-[11px] text-gray-400">{TYPE_LABEL[account.accountType] ?? account.accountType}</span>
              {account.store && (
                <span className="text-[11px] text-gray-400">· {account.store.name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-400 mb-0.5">Balance</p>
          <p className={`text-xl font-bold tabular-nums ${balanceColor(account.currentBalance)}`}>
            ${parseFloat(account.currentBalance).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Bank details row */}
      {!isCash && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-t border-gray-100 pt-3">
          {account.bankName && (
            <>
              <span className="text-gray-400">Bank</span>
              <span className="text-gray-700 font-medium truncate">{account.bankName}</span>
            </>
          )}
          {account.accountNumber && (
            <>
              <span className="text-gray-400">Account No.</span>
              <span className="text-gray-700 font-mono">{maskAccountNumber(account.accountNumber)}</span>
            </>
          )}
          {account.ifscCode && (
            <>
              <span className="text-gray-400">IFSC</span>
              <span className="text-gray-700 font-mono">{account.ifscCode}</span>
            </>
          )}
          {account.branchName && (
            <>
              <span className="text-gray-400">Branch</span>
              <span className="text-gray-700 truncate">{account.branchName}</span>
            </>
          )}
          <span className="text-gray-400">Opening Bal.</span>
          <span className="text-gray-700 font-medium">
            ${parseFloat(account.openingBalance).toLocaleString('en', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {account.category === 'cash' && (
        <div className="flex justify-between text-xs border-t border-gray-100 pt-3">
          <span className="text-gray-400">Opening Balance</span>
          <span className="text-gray-700 font-medium">
            ${parseFloat(account.openingBalance).toLocaleString('en', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
        <Link
          href={`/finance/ledger?accountId=${account.id}`}
          className="flex-1 py-1.5 text-xs font-semibold text-center text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Ledger
        </Link>
        {isAdmin && (
          <>
            <button onClick={() => onSetBalance(account)}
              className="flex-1 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
              Set Opening Bal.
            </button>
            <button onClick={() => onEdit(account)}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              Edit
            </button>
            <button
              onClick={() => onDelete(account)}
              disabled={deletingId === account.id}
              className="px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50">
              {deletingId === account.id ? '…' : 'Delete'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'all' | AccountCategory;

export default function AccountsPage() {
  const { data: me } = useMe();
  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';

  const { data: accounts = [], isLoading } = useAccounts();
  const deleteAccount = useDeleteAccount();

  const [tab,          setTab]          = useState<Tab>('all');
  const [formAccount,  setFormAccount]  = useState<FinancialAccount | null | undefined>(undefined); // undefined = closed
  const [balAccount,   setBalAccount]   = useState<FinancialAccount | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  const filtered = tab === 'all' ? accounts : accounts.filter((a) => a.category === tab);

  const totals = {
    cash: accounts.filter((a) => a.category === 'cash').reduce((s, a) => s + parseFloat(a.currentBalance), 0),
    bank: accounts.filter((a) => a.category === 'bank').reduce((s, a) => s + parseFloat(a.currentBalance), 0),
  };

  async function handleDelete(account: FinancialAccount) {
    if (!confirm(`Remove "${account.name}"? This cannot be undone.`)) return;
    setDeletingId(account.id);
    try {
      await deleteAccount.mutateAsync(account.id);
    } finally {
      setDeletingId(null);
    }
  }

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
      tab === t
        ? 'border-indigo-600 text-indigo-600'
        : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash & Bank</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} · manage balances and bank details
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setFormAccount(null)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Account
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Cash',
            amount: totals.cash,
            color: 'bg-emerald-50 border-emerald-200',
            textColor: 'text-emerald-700',
            icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z',
          },
          {
            label: 'Total Bank',
            amount: totals.bank,
            color: 'bg-indigo-50 border-indigo-200',
            textColor: 'text-indigo-700',
            icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
          },
          {
            label: 'Total Funds',
            amount: totals.cash + totals.bank,
            color: 'bg-gray-50 border-gray-200',
            textColor: 'text-gray-900',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-5 ${s.color}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">{s.label}</p>
              <svg className={`h-5 w-5 ${s.textColor} opacity-60`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={s.icon} />
              </svg>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${s.textColor}`}>
              ${s.amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-1">
        {(['all', 'bank', 'cash'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={tabCls(t)}>
            {t === 'all' ? 'All Accounts' : t === 'bank' ? 'Bank Accounts' : 'Cash Accounts'}
          </button>
        ))}
      </div>

      {/* Account grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 animate-pulse">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="h-7 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <svg className="h-12 w-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="text-gray-500 font-medium">No {tab === 'all' ? '' : tab} accounts yet</p>
          {isAdmin && (
            <button onClick={() => setFormAccount(null)}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              + Add your first account
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              isAdmin={isAdmin}
              onEdit={setFormAccount}
              onSetBalance={setBalAccount}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {formAccount !== undefined && (
        <AccountFormModal
          account={formAccount}
          onClose={() => setFormAccount(undefined)}
        />
      )}
      {balAccount && (
        <OpeningBalanceModal
          account={balAccount}
          onClose={() => setBalAccount(null)}
        />
      )}
    </div>
  );
}

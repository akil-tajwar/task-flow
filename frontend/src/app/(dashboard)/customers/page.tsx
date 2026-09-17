'use client';

import { useState } from 'react';
import { useCustomers, useDeleteCustomer, useCustomerBalance, useSetCustomerOpeningBalance } from '@/hooks/use-customers';
import { useMe } from '@/hooks/use-auth';
import { CustomerTable }      from './_components/customer-table';
import { CustomerFormModal }  from './_components/customer-form-modal';
import { OpeningBalanceModal } from '@/components/ui/opening-balance-modal';
import { Pagination }         from '@/components/ui/pagination';
import type { Customer } from '@/types';

const LIMIT = 20;

function CustomerBalanceFetcher({ customerId, onBalance }: { customerId: string; onBalance: (id: string, bal: number) => void }) {
  const { data } = useCustomerBalance(customerId);
  if (data !== undefined) onBalance(customerId, data.balance);
  return null;
}

export default function CustomersPage() {
  const { data: me } = useMe();
  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';

  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);

  const { data: result, isLoading, isError } = useCustomers({ search: search || undefined, page, limit: LIMIT });
  const deleteCustomer       = useDeleteCustomer();
  const setOpeningBalance    = useSetCustomerOpeningBalance();

  const [modalOpen, setModalOpen]         = useState(false);
  const [editing, setEditing]             = useState<Customer | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null);
  const [balTarget, setBalTarget]         = useState<Customer | null>(null);

  const [balances, setBalances] = useState<Record<string, number>>({});
  const mergeBalance = (id: string, bal: number) =>
    setBalances((prev) => prev[id] === bal ? prev : { ...prev, [id]: bal });

  const customers  = result?.data ?? [];
  const total      = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    setConfirmDelete(null);
    try { await deleteCustomer.mutateAsync(confirmDelete.id); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">

      {customers.map((c) => (
        <CustomerBalanceFetcher key={c.id} customerId={c.id} onBalance={mergeBalance} />
      ))}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} customer{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search customers…"
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52" />
          </div>
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            Add Customer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            <span className="text-sm">Loading customers…</span>
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-red-500 text-sm">Failed to load customers.</div>
        ) : (
          <>
            <CustomerTable
              customers={customers}
              isAdmin={isAdmin}
              balances={balances}
              onEdit={(c) => { setEditing(c); setModalOpen(true); }}
              onDelete={(c) => setConfirmDelete(c)}
              onOpeningBalance={(c) => setBalTarget(c)}
              deletingId={deletingId}
            />
            <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
          </>
        )}
      </div>

      <CustomerFormModal open={modalOpen} customer={editing} onClose={() => setModalOpen(false)} isAdmin={isAdmin} />

      <OpeningBalanceModal
        open={!!balTarget}
        label="Customer"
        entityName={balTarget?.name ?? ''}
        currentBalance={balTarget ? (balances[balTarget.id] ?? 0) : 0}
        onSave={async (amount, notes) => {
          if (!balTarget) return;
          await setOpeningBalance.mutateAsync({ id: balTarget.id, amount, notes });
        }}
        onClose={() => setBalTarget(null)}
      />

      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmDelete(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900">Remove customer?</h3>
            <p className="text-sm text-gray-500 mt-2"><strong>{confirmDelete.name}</strong> will be deactivated. Loyalty points and history are preserved.</p>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Remove</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

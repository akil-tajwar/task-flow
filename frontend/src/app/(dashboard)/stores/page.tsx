'use client';

import { useState } from 'react';
import { useStores, useDeleteStore, useSetDefaultStore } from '@/hooks/use-stores';
import { useMe } from '@/hooks/use-auth';
import { StoreTable } from './_components/store-table';
import { StoreFormModal } from './_components/store-form-modal';
import type { Store } from '@/types';

export default function StoresPage() {
  const { data: me }    = useMe();
  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';

  const { data: stores = [], isLoading, isError } = useStores();
  const deleteStore     = useDeleteStore();
  const setDefault      = useSetDefaultStore();

  const [modalOpen, setModalOpen]         = useState(false);
  const [editing, setEditing]             = useState<Store | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Store | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteStore.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stores.length} location{stores.length !== 1 ? 's' : ''} in your network</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            Add Store
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            <span className="text-sm">Loading stores…</span>
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-red-500 text-sm">Failed to load stores.</div>
        ) : (
          <StoreTable stores={stores} isAdmin={isAdmin}
            onEdit={(s) => { setEditing(s); setModalOpen(true); }}
            onDelete={(s) => setConfirmDelete(s)}
            onSetDefault={(s) => setDefault.mutate(s.id)} />
        )}
      </div>

      <StoreFormModal open={modalOpen} store={editing} onClose={() => setModalOpen(false)} />

      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmDelete(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900">Remove store?</h3>
            <p className="text-sm text-gray-500 mt-2">
              <strong>{confirmDelete.name}</strong> will be deactivated. Existing inventory records are preserved.
            </p>
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

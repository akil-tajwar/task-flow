'use client';

import { useState } from 'react';
import { useClients, useDeleteClient } from '@/hooks/use-clients';
import { useMe } from '@/hooks/use-auth';
import { ClientTable }     from './_components/client-table';
import { ClientFormModal } from './_components/client-form-modal';
import type { Client } from '@/types/client';

export default function ClientsPage() {
  const { data: me } = useMe();
  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';

  const { data: clients = [], isLoading, isError } = useClients();
  const deleteClient = useDeleteClient();

  const [modalOpen, setModalOpen]         = useState(false);
  const [editing, setEditing]             = useState<Client | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    setConfirmDelete(null);
    try { await deleteClient.mutateAsync(confirmDelete.id); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            Add Client
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            <span className="text-sm">Loading clients…</span>
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-red-500 text-sm">Failed to load clients.</div>
        ) : (
          <ClientTable
            clients={clients}
            isAdmin={isAdmin}
            onEdit={(c) => { setEditing(c); setModalOpen(true); }}
            onDelete={(c) => setConfirmDelete(c)}
            deletingId={deletingId}
          />
        )}
      </div>

      <ClientFormModal open={modalOpen} client={editing} onClose={() => setModalOpen(false)} />

      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmDelete(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900">Remove client?</h3>
            <p className="text-sm text-gray-500 mt-2">
              <strong>{confirmDelete.name}</strong> and their linked login will be permanently deleted.
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
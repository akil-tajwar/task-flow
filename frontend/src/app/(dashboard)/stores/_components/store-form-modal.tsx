'use client';

import { useState, useEffect } from 'react';
import { useCreateStore, useUpdateStore } from '@/hooks/use-stores';
import type { Store } from '@/types';

interface Props { open: boolean; store?: Store | null; onClose: () => void }

interface FormState {
  name: string; code: string; address: string; city: string; country: string; phone: string; isDefault: boolean;
}

const EMPTY: FormState = { name: '', code: '', address: '', city: '', country: '', phone: '', isDefault: false };

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400';

export function StoreFormModal({ open, store, onClose }: Props) {
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const isEditing = !!store;

  const [form, setForm]   = useState<FormState>(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(store ? {
      name: store.name, code: store.code, address: store.address ?? '',
      city: store.city ?? '', country: store.country ?? '',
      phone: store.phone ?? '', isDefault: store.isDefault,
    } : EMPTY);
  }, [open, store?.id]);

  const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Store name is required.'); return; }
    if (!form.code.trim()) { setError('Store code is required.'); return; }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      address:   form.address.trim()  || undefined,
      city:      form.city.trim()     || undefined,
      country:   form.country.trim()  || undefined,
      phone:     form.phone.trim()    || undefined,
      isDefault: form.isDefault,
    };

    try {
      if (isEditing) {
        await updateStore.mutateAsync({ id: store!.id, ...payload });
      } else {
        await createStore.mutateAsync(payload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error ?? (err instanceof Error ? err.message : 'Something went wrong.');
      setError(msg);
    }
  };

  const isPending = createStore.isPending || updateStore.isPending;
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{isEditing ? 'Edit Store' : 'New Store'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        <form id="store-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Main Branch" className={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
              <input value={form.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="e.g. HQ" className={inputCls} required
                pattern="[A-Z0-9_-]+" title="Uppercase letters, digits, hyphens or underscores" />
              <p className="text-xs text-gray-400 mt-1">Uppercase letters and digits only</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea value={form.address} onChange={(e) => set({ address: e.target.value })} rows={2} placeholder="Street address" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="City" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input value={form.country} onChange={(e) => set({ country: e.target.value })} placeholder="Country" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+1 555 000 0000" className={inputCls} />
          </div>

          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => set({ isDefault: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <div>
              <span className="text-sm font-medium text-gray-700">Set as default store</span>
              <p className="text-xs text-gray-400">The default store is pre-selected for POS sessions</p>
            </div>
          </label>
        </form>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button form="store-form" type="submit" disabled={isPending} className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create store'}
          </button>
        </div>
      </div>
    </>
  );
}

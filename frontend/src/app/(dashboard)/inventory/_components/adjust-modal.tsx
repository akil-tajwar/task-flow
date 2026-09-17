'use client';

import { useState, useEffect } from 'react';
import { useAdjustStock } from '@/hooks/use-inventory';
import { useStores } from '@/hooks/use-stores';
import type { InventoryRow, Store } from '@/types';

interface Props {
  open: boolean;
  row?: InventoryRow | null;
  defaultStore?: Store | null;
  onClose: () => void;
}

const TYPES = [
  { value: 'receive',    label: 'Receive Stock',    sign: '+', color: 'text-green-600' },
  { value: 'return',     label: 'Customer Return',  sign: '+', color: 'text-green-600' },
  { value: 'adjustment', label: 'Manual Adjust (+)', sign: '+', color: 'text-blue-600' },
  { value: 'damage',     label: 'Damage / Write-off', sign: '−', color: 'text-red-600' },
] as const;

export function AdjustModal({ open, row, defaultStore, onClose }: Props) {
  const adjustStock        = useAdjustStock();
  const { data: stores = [] } = useStores();

  const [storeId, setStoreId]   = useState('');
  const [type, setType]         = useState<string>('receive');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes]       = useState('');
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!open) return;
    setStoreId(row?.storeId ?? defaultStore?.id ?? stores[0]?.id ?? '');
    setType('receive');
    setQuantity('');
    setNotes('');
    setError('');
  }, [open, row?.id, defaultStore?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) { setError('Quantity must be a positive integer.'); return; }
    if (!storeId) { setError('Select a store.'); return; }
    if (!row) { setError('No product selected.'); return; }

    try {
      await adjustStock.mutateAsync({
        storeId,
        productId: row.productId,
        variantId: row.variantId ?? undefined,
        type,
        quantity: qty,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError((err as any)?.response?.data?.error ?? 'Failed to adjust stock.');
    }
  };

  if (!open) return null;

  const selectedType = TYPES.find((t) => t.value === type);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Adjust Stock</h2>
            {row && <p className="text-xs text-gray-400 mt-0.5">{row.product.name}{row.variant ? ` — ${Object.values(row.variant.attributes).join(' / ')}` : ''}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    type === t.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                  <span className={`text-base ${t.color}`}>{t.sign}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className={`text-xs font-semibold ${selectedType?.color}`}>({selectedType?.sign})</span>
            </label>
            <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
              placeholder="0" autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Received PO #1234"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex gap-3 pt-1 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={adjustStock.isPending} className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {adjustStock.isPending ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useCreateTransfer } from '@/hooks/use-inventory';
import { useStores } from '@/hooks/use-stores';
import { useProducts } from '@/hooks/use-products';
import type { Store, Product } from '@/types';

interface TransferItem { productId: string; variantId?: string; quantity: string; product?: Product }

interface Props { open: boolean; onClose: () => void }

const EMPTY_ITEM: TransferItem = { productId: '', quantity: '' };

export function TransferModal({ open, onClose }: Props) {
  const createTransfer         = useCreateTransfer();
  const { data: stores = [] }  = useStores();
  const { data: productResult } = useProducts({ limit: 100 });
  const products                = productResult?.data ?? [];

  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId]     = useState('');
  const [notes, setNotes]             = useState('');
  const [items, setItems]             = useState<TransferItem[]>([{ ...EMPTY_ITEM }]);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (!open) return;
    const defaultStore = stores.find((s) => s.isDefault);
    setFromStoreId(defaultStore?.id ?? stores[0]?.id ?? '');
    setToStoreId('');
    setNotes('');
    setItems([{ ...EMPTY_ITEM }]);
    setError('');
  }, [open]);

  const setItem = (idx: number, patch: Partial<TransferItem>) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!fromStoreId) { setError('Select a source store.'); return; }
    if (!toStoreId)   { setError('Select a destination store.'); return; }
    if (fromStoreId === toStoreId) { setError('Source and destination must be different stores.'); return; }

    const validItems = items.filter((it) => it.productId && parseInt(it.quantity, 10) > 0);
    if (!validItems.length) { setError('Add at least one item with a quantity.'); return; }

    try {
      await createTransfer.mutateAsync({
        fromStoreId,
        toStoreId,
        notes: notes.trim() || undefined,
        items: validItems.map((it) => ({
          productId: it.productId,
          variantId: it.variantId || undefined,
          quantity:  parseInt(it.quantity, 10),
        })),
      });
      onClose();
    } catch (err: unknown) {
      setError((err as any)?.response?.data?.error ?? 'Transfer failed.');
    }
  };

  if (!open) return null;

  const availableStores = (exclude: string) => stores.filter((s) => s.id !== exclude);
  const inputCls = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b px-5 py-4 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Transfer Stock</h2>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>}

          {/* From / To stores */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Store <span className="text-red-500">*</span></label>
              <select value={fromStoreId} onChange={(e) => setFromStoreId(e.target.value)} className={`w-full ${inputCls}`} required>
                <option value="">Select…</option>
                {availableStores(toStoreId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Store <span className="text-red-500">*</span></label>
              <select value={toStoreId} onChange={(e) => setToStoreId(e.target.value)} className={`w-full ${inputCls}`} required>
                <option value="">Select…</option>
                {availableStores(fromStoreId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Items</label>
              <button type="button" onClick={addItem} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => {
                const prod = products.find((p) => p.id === item.productId);
                return (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <select value={item.productId} onChange={(e) => setItem(idx, { productId: e.target.value, variantId: undefined })}
                        className={`w-full ${inputCls}`}>
                        <option value="">Select product…</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>)}
                      </select>
                      {prod?.hasVariants && prod.variants?.length ? (
                        <select value={item.variantId ?? ''} onChange={(e) => setItem(idx, { variantId: e.target.value || undefined })}
                          className={`w-full ${inputCls}`}>
                          <option value="">All variants</option>
                          {prod.variants.map((v) => (
                            <option key={v.id} value={v.id}>{Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ')}</option>
                          ))}
                        </select>
                      ) : null}
                    </div>
                    <div className="w-20">
                      <input type="number" min="1" step="1" value={item.quantity}
                        onChange={(e) => setItem(idx, { quantity: e.target.value })}
                        placeholder="Qty" className={inputCls} />
                    </div>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="mt-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Reason for transfer…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </form>

        <div className="flex gap-3 border-t px-5 py-4 flex-shrink-0 justify-end bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit as any} disabled={createTransfer.isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {createTransfer.isPending ? 'Transferring…' : 'Complete Transfer'}
          </button>
        </div>
      </div>
    </>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link          from 'next/link';
import { useVendors } from '@/hooks/use-vendors';
import { useStores }  from '@/hooks/use-stores';
import { useProducts } from '@/hooks/use-products';
import { useCreatePO } from '@/hooks/use-purchases';

// ─── Types ────────────────────────────────────────────────────────────────────

let _keyId = 0;
const nextKey = () => String(++_keyId);

interface ItemRow {
  _key:      string;
  productId: string;
  variantId: string;
  quantity:  string;
  unitPrice: string;
  taxRate:   string;
  notes:     string;
}

const EMPTY_ITEM = (): ItemRow => ({
  _key: nextKey(), productId: '', variantId: '', quantity: '1',
  unitPrice: '0', taxRate: '0', notes: '',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const selectCls = inputCls;

function lineBase(r: ItemRow) { return (parseInt(r.quantity) || 0) * (parseFloat(r.unitPrice) || 0); }
function lineTax(r: ItemRow)  { return lineBase(r) * ((parseFloat(r.taxRate) || 0) / 100); }
function lineTotal(r: ItemRow){ return lineBase(r) + lineTax(r); }

const fmtMoney = (n: number) => `$${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today    = () => new Date().toISOString().slice(0, 10);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewPOPage() {
  const router   = useRouter();
  const createPO = useCreatePO();

  const { data: vendorRes }      = useVendors({ limit: 500 });
  const vendors = vendorRes?.data ?? [];
  const { data: storeRes }       = useStores();
  const stores = storeRes ?? [];
  const { data: productRes }     = useProducts({ limit: 1000 });
  const products = productRes?.data ?? [];

  const [vendorId,     setVendorId]     = useState('');
  const [storeId,      setStoreId]      = useState('');
  const [orderDate,    setOrderDate]    = useState(today());
  const [expectedDate, setExpectedDate] = useState('');
  const [notes,        setNotes]        = useState('');
  const [items,        setItems]        = useState<ItemRow[]>([EMPTY_ITEM()]);
  const [error,        setError]        = useState('');
  const [saving,       setSaving]       = useState(false);

  function setItem(key: string, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => r._key === key ? { ...r, ...patch } : r));
  }

  const subtotal = items.reduce((s, r) => s + lineBase(r), 0);
  const taxTotal = items.reduce((s, r) => s + lineTax(r), 0);
  const total    = subtotal + taxTotal;

  const handleSubmit = useCallback(async () => {
    setError('');
    if (!vendorId)                                     { setError('Select a vendor.'); return; }
    if (!storeId)                                      { setError('Select a store.'); return; }
    if (items.some((r) => !r.productId))               { setError('Select a product for every row.'); return; }
    if (items.some((r) => parseInt(r.quantity) < 1))   { setError('All quantities must be ≥ 1.'); return; }

    setSaving(true);
    try {
      await createPO.mutateAsync({
        vendorId, storeId, orderDate,
        expectedDate: expectedDate || undefined,
        notes: notes.trim() || undefined,
        items: items.map((r) => ({
          productId: r.productId,
          variantId: r.variantId || null,
          quantity:  parseInt(r.quantity),
          unitPrice: parseFloat(r.unitPrice),
          taxRate:   parseFloat(r.taxRate) || 0,
          notes:     r.notes || undefined,
        })),
      });
      router.push('/purchases/orders');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to create purchase order.');
    } finally {
      setSaving(false);
    }
  }, [vendorId, storeId, orderDate, expectedDate, notes, items, createPO, router]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link href="/purchases/orders" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">New Purchase Order</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Header section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Order Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Vendor <span className="text-red-500">*</span>
            </label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={selectCls}>
              <option value="">Select vendor…</option>
              {vendors.filter((v) => v.isActive).map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Receiving Store <span className="text-red-500">*</span>
            </label>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={selectCls}>
              <option value="">Select store…</option>
              {stores.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Order Date <span className="text-red-500">*</span>
            </label>
            <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Expected Delivery
            </label>
            <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={2} placeholder="Optional notes for this order…" className={`${inputCls} resize-none`} />
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Items</h2>
          <button type="button" onClick={() => setItems((rows) => [...rows, EMPTY_ITEM()])}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800">+ Add Item</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Product', 'Variant', 'Qty', 'Unit Price', 'Tax %', 'Amount', ''].map((h) => (
                  <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left ${h === 'Amount' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((row) => {
                const product  = products.find((p) => p.id === row.productId);
                const variants = product?.variants?.filter((v) => v.isActive) ?? [];

                return (
                  <tr key={row._key} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 min-w-[200px]">
                      <select value={row.productId}
                        onChange={(e) => setItem(row._key, {
                          productId: e.target.value, variantId: '',
                          unitPrice: products.find((p) => p.id === e.target.value)?.basePrice ?? '0',
                        })}
                        className={selectCls}>
                        <option value="">Select product…</option>
                        {products.filter((p) => p.isActive).map((p) => (
                          <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 min-w-[130px]">
                      {variants.length > 0 ? (
                        <select value={row.variantId} onChange={(e) => setItem(row._key, { variantId: e.target.value })} className={selectCls}>
                          <option value="">Any variant</option>
                          {variants.map((v) => (
                            <option key={v.id} value={v.id}>{Object.values(v.attributes).join(' / ')}</option>
                          ))}
                        </select>
                      ) : <span className="text-xs text-gray-400 px-1">—</span>}
                    </td>
                    <td className="px-4 py-2.5 w-20">
                      <input type="number" min="1" value={row.quantity}
                        onChange={(e) => setItem(row._key, { quantity: e.target.value })}
                        className={inputCls} />
                    </td>
                    <td className="px-4 py-2.5 w-28">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                        <input type="number" min="0" step="0.01" value={row.unitPrice}
                          onChange={(e) => setItem(row._key, { unitPrice: e.target.value })}
                          className={`${inputCls} pl-6`} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 w-20">
                      <div className="relative">
                        <input type="number" min="0" max="100" step="0.01" value={row.taxRate}
                          onChange={(e) => setItem(row._key, { taxRate: e.target.value })}
                          className={`${inputCls} pr-6`} />
                        <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right w-28">
                      <span className="text-sm font-semibold text-gray-900">{fmtMoney(lineTotal(row))}</span>
                    </td>
                    <td className="px-4 py-2.5 w-10 text-center">
                      <button type="button" onClick={() => setItems((rows) => rows.filter((r) => r._key !== row._key))}
                        disabled={items.length <= 1}
                        className="text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary + submit */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="space-y-2 min-w-[200px]">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span className="font-medium">{fmtMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax</span><span className="font-medium">{fmtMoney(taxTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 border-t pt-2">
              <span>Total</span><span>{fmtMoney(total)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/purchases/orders"
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center transition-colors">
              Discard
            </Link>
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? 'Creating…' : 'Create Purchase Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

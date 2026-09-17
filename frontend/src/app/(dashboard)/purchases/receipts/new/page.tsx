'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link           from 'next/link';
import { useVendors } from '@/hooks/use-vendors';
import { useStores }  from '@/hooks/use-stores';
import { useProducts } from '@/hooks/use-products';
import { useAccounts } from '@/hooks/use-finance';
import { usePurchaseOrders, usePurchaseOrder, useCreatePR, useConfirmPR } from '@/hooks/use-purchases';
import type { PurchasePayMode } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

let _keyId = 0;
const nextKey = () => String(++_keyId);

interface ItemRow {
  _key:      string;
  productId: string;
  variantId: string;
  poItemId:  string;
  quantity:  string;
  unitPrice: string;
  taxRate:   string;
}

interface PayRow {
  _key:            string;
  paymentMode:     PurchasePayMode;
  accountId:       string;
  amount:          string;
  referenceNumber: string;
  notes:           string;
}

const EMPTY_ITEM = (): ItemRow => ({
  _key: nextKey(), productId: '', variantId: '', poItemId: '',
  quantity: '1', unitPrice: '0', taxRate: '0',
});

const EMPTY_PAY = (): PayRow => ({
  _key: nextKey(), paymentMode: 'cash', accountId: '', amount: '', referenceNumber: '', notes: '',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lineBase(row: ItemRow) { return Math.max(0, parseInt(row.quantity) || 0) * Math.max(0, parseFloat(row.unitPrice) || 0); }
function lineTax(row: ItemRow)  { return lineBase(row) * ((parseFloat(row.taxRate) || 0) / 100); }
function lineTotal(row: ItemRow){ return lineBase(row) + lineTax(row); }

const inputCls  = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const selectCls = inputCls;

const fmtMoney = (n: number) => `$${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function today() { return new Date().toISOString().slice(0, 10); }

// ─── PO selector modal ────────────────────────────────────────────────────────

function POSelectorModal({
  vendorId, onSelect, onClose,
}: {
  vendorId: string;
  onSelect: (poId: string, poNumber: string) => void;
  onClose:  () => void;
}) {
  const { data } = usePurchaseOrders({ vendorId, status: 'sent', limit: 50 });
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Select Purchase Order</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {!data?.data.length ? (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">No open POs for this vendor</p>
            ) : data.data.map((po) => (
              <button key={po.id} onClick={() => onSelect(po.id, po.poNumber)}
                className="w-full text-left px-6 py-3.5 hover:bg-indigo-50 transition-colors flex items-center justify-between">
                <div>
                  <p className="font-mono font-semibold text-sm text-indigo-700">{po.poNumber}</p>
                  <p className="text-xs text-gray-400">{po.orderDate} · {po.itemCount ?? 0} items · ${parseFloat(po.total).toFixed(2)}</p>
                </div>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewReceiptPage() {
  return (
    <Suspense>
      <NewReceiptForm />
    </Suspense>
  );
}

function NewReceiptForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const createPR     = useCreatePR();
  const confirmPR    = useConfirmPR();

  const { data: vendorRes }     = useVendors({ limit: 500 });
  const vendors = vendorRes?.data ?? [];
  const { data: storeRes }      = useStores();
  const stores = storeRes ?? [];
  const { data: productRes }    = useProducts({ limit: 1000 });
  const products = productRes?.data ?? [];
  const { data: accounts = [] } = useAccounts();

  // Header state — seed poId from URL param if present
  const urlPoId = searchParams.get('poId') ?? '';
  const [vendorId,    setVendorId]    = useState('');
  const [storeId,     setStoreId]     = useState('');
  const [receiptDate, setReceiptDate] = useState(today());
  const [notes,       setNotes]       = useState('');
  const [poId,        setPoId]        = useState(urlPoId);
  const [poNumber,    setPoNumber]    = useState('');
  const [showPOModal, setShowPOModal] = useState(false);

  // Items + payments
  const [items,    setItems]    = useState<ItemRow[]>([EMPTY_ITEM()]);
  const [payments, setPayments] = useState<PayRow[]>([]);

  // PO detail (for pre-filling items)
  const { data: poDetail } = usePurchaseOrder(poId || null);

  // Auto-apply PO data when arriving via URL param — runs once when poDetail loads
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current || !urlPoId || !poDetail) return;
    applied.current = true;

    // Pre-fill header
    setVendorId(poDetail.vendorId);
    setStoreId(poDetail.storeId);
    setPoNumber(poDetail.poNumber);

    // Pre-fill items (only pending lines)
    const remaining = (poDetail.items ?? []).filter((i) => i.receivedQty < i.quantity);
    if (remaining.length > 0) {
      setItems(remaining.map((i) => ({
        _key:      nextKey(),
        productId: i.productId,
        variantId: i.variantId ?? '',
        poItemId:  i.id,
        quantity:  String(i.quantity - i.receivedQty),
        unitPrice: i.unitPrice,
        taxRate:   i.taxRate,
      })));
    }
  }, [urlPoId, poDetail]);

  // Submission state
  const [error,     setError]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Item helpers ──────────────────────────────────────────────────────────

  function setItem(key: string, patch: Partial<ItemRow>) {
    setItems((rows) => rows.map((r) => r._key === key ? { ...r, ...patch } : r));
  }

  function removeItem(key: string) {
    setItems((rows) => rows.filter((r) => r._key !== key));
  }

  function applyPO() {
    if (!poDetail?.items?.length) return;
    const remaining = poDetail.items.filter((i) => i.receivedQty < i.quantity);
    setItems(remaining.map((i) => ({
      _key: nextKey(),
      productId: i.productId,
      variantId: i.variantId ?? '',
      poItemId:  i.id,
      quantity:  String(i.quantity - i.receivedQty),
      unitPrice: i.unitPrice,
      taxRate:   i.taxRate,
    })));
  }

  // ── Payment helpers ───────────────────────────────────────────────────────

  function setPayment(key: string, patch: Partial<PayRow>) {
    setPayments((rows) => rows.map((r) => r._key === key ? { ...r, ...patch } : r));
  }

  // ── Totals ────────────────────────────────────────────────────────────────

  const subtotal  = items.reduce((s, r) => s + lineBase(r), 0);
  const taxTotal  = items.reduce((s, r) => s + lineTax(r), 0);
  const total     = subtotal + taxTotal;
  const paid      = payments.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const balanceDue = Math.max(0, total - paid);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (confirm: boolean) => {
    setError('');

    if (!vendorId)    { setError('Select a vendor.'); return; }
    if (!storeId)     { setError('Select a receiving store.'); return; }
    if (items.length === 0) { setError('Add at least one item.'); return; }
    if (items.some((r) => !r.productId)) { setError('Select a product for every item row.'); return; }
    if (items.some((r) => parseInt(r.quantity) < 1)) { setError('All quantities must be ≥ 1.'); return; }
    if (payments.some((p) => (p.paymentMode === 'cash' || p.paymentMode === 'bank') && !p.accountId)) {
      setError('Select an account for each cash/bank payment.'); return;
    }
    if (payments.some((p) => !(parseFloat(p.amount) > 0))) {
      setError('All payment amounts must be > 0.'); return;
    }

    setSubmitting(true);
    try {
      const pr = await createPR.mutateAsync({
        vendorId,
        storeId,
        poId:        poId || null,
        receiptDate,
        notes:       notes.trim() || undefined,
        items: items.map((r) => ({
          productId: r.productId,
          variantId: r.variantId || null,
          poItemId:  r.poItemId  || null,
          quantity:  parseInt(r.quantity),
          unitPrice: parseFloat(r.unitPrice),
          taxRate:   parseFloat(r.taxRate) || 0,
        })),
        payments: payments.map((p) => ({
          paymentMode:     p.paymentMode,
          accountId:       p.accountId || null,
          amount:          parseFloat(p.amount),
          paymentDate:     receiptDate,
          referenceNumber: p.referenceNumber || undefined,
          notes:           p.notes || undefined,
        })),
      });

      if (confirm) {
        await confirmPR.mutateAsync(pr.id);
      }

      router.push('/purchases/receipts');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to save receipt. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [vendorId, storeId, poId, receiptDate, notes, items, payments, createPR, confirmPR, router]);

  const cashBankAccounts = accounts.filter((a) => a.isActive);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <Link href="/purchases/receipts" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">New Purchase Receipt</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {urlPoId && poNumber && (
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 flex items-center gap-3">
          <svg className="h-4 w-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <div className="flex-1 text-sm text-indigo-800">
            Linked to purchase order{' '}
            <span className="font-mono font-bold">{poNumber}</span>
            {' '}— vendor, store, and items have been pre-filled.
          </div>
          <Link href={`/purchases/orders/${urlPoId}`} className="text-xs font-semibold text-indigo-600 hover:underline whitespace-nowrap">
            View PO →
          </Link>
        </div>
      )}

      {/* ── Section 1: Header ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Receipt Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Vendor <span className="text-red-500">*</span>
            </label>
            <select
              value={vendorId}
              onChange={(e) => { setVendorId(e.target.value); setPoId(''); setPoNumber(''); }}
              disabled={!!urlPoId && !!vendorId}
              className={`${selectCls} disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-default`}
            >
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
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              disabled={!!urlPoId && !!storeId}
              className={`${selectCls} disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-default`}
            >
              <option value="">Select store…</option>
              {stores.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Receipt Date <span className="text-red-500">*</span>
            </label>
            <input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Link to Purchase Order
            </label>
            <div className="flex gap-2">
              <input readOnly value={poNumber ? `${poNumber}` : ''} placeholder="No PO linked"
                className={`${inputCls} flex-1 bg-gray-50 cursor-default`} />
              <button
                type="button"
                disabled={!vendorId}
                onClick={() => setShowPOModal(true)}
                className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Browse POs
              </button>
              {poId && (
                <button type="button" onClick={() => { setPoId(''); setPoNumber(''); setItems([EMPTY_ITEM()]); }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-100 rounded-lg">Clear</button>
              )}
            </div>
            {poId && poDetail?.items && (
              <button type="button" onClick={applyPO}
                className="mt-1.5 text-xs text-indigo-600 hover:underline">
                Fill items from this PO →
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={2} placeholder="Optional internal notes…" className={`${inputCls} resize-none`} />
        </div>
      </div>

      {/* ── Section 2: Items ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Items</h2>
          <button type="button" onClick={() => setItems((rows) => [...rows, EMPTY_ITEM()])}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800">+ Add Item</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
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
                        onChange={(e) => setItem(row._key, { productId: e.target.value, variantId: '', unitPrice: products.find((p) => p.id === e.target.value)?.basePrice ?? '0' })}
                        className={selectCls}>
                        <option value="">Select product…</option>
                        {products.filter((p) => p.isActive).map((p) => (
                          <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 min-w-[140px]">
                      {variants.length > 0 ? (
                        <select value={row.variantId} onChange={(e) => setItem(row._key, { variantId: e.target.value })} className={selectCls}>
                          <option value="">Any variant</option>
                          {variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {Object.values(v.attributes).join(' / ')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-400 px-1">—</span>
                      )}
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
                      {parseFloat(row.taxRate) > 0 && (
                        <p className="text-[11px] text-gray-400">+{fmtMoney(lineTax(row))} tax</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 w-10 text-center">
                      <button type="button" onClick={() => removeItem(row._key)}
                        className="text-gray-300 hover:text-red-400 transition-colors">
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

      {/* ── Section 3: Payments ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Payments</h2>
          <button type="button" onClick={() => setPayments((rows) => [...rows, EMPTY_PAY()])}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800">+ Add Payment</button>
        </div>

        {payments.length === 0 ? (
          <div className="px-6 py-6 text-center">
            <p className="text-sm text-gray-400">No payments added — receipt will be saved as unpaid.</p>
            <p className="text-xs text-gray-300 mt-1">You can add cash, bank, or credit payments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Mode', 'Account / Note', 'Amount', 'Ref #', 'Remove'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((row) => (
                  <tr key={row._key} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 w-36">
                      <select value={row.paymentMode}
                        onChange={(e) => setPayment(row._key, { paymentMode: e.target.value as PurchasePayMode, accountId: '' })}
                        className={selectCls}>
                        <option value="cash">Cash</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="credit">Credit (Vendor)</option>
                      </select>
                    </td>
                    <td className="px-4 py-2.5 min-w-[180px]">
                      {row.paymentMode === 'credit' ? (
                        <input value={row.notes} onChange={(e) => setPayment(row._key, { notes: e.target.value })}
                          placeholder="Credit terms / notes" className={inputCls} />
                      ) : (
                        <select value={row.accountId} onChange={(e) => setPayment(row._key, { accountId: e.target.value })} className={selectCls}>
                          <option value="">Select account…</option>
                          {cashBankAccounts
                            .filter((a) => (row.paymentMode === 'cash' ? a.category === 'cash' : a.category === 'bank'))
                            .map((a) => (
                              <option key={a.id} value={a.id}>{a.name} (${parseFloat(a.currentBalance).toFixed(2)})</option>
                            ))
                          }
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-2.5 w-32">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                        <input type="number" min="0.01" step="0.01" value={row.amount}
                          onChange={(e) => setPayment(row._key, { amount: e.target.value })}
                          placeholder="0.00" className={`${inputCls} pl-6`} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 w-32">
                      <input value={row.referenceNumber} onChange={(e) => setPayment(row._key, { referenceNumber: e.target.value })}
                        placeholder="Chq / Ref #" className={inputCls} />
                    </td>
                    <td className="px-4 py-2.5 w-12 text-center">
                      <button type="button" onClick={() => setPayments((rows) => rows.filter((r) => r._key !== row._key))}
                        className="text-gray-300 hover:text-red-400 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section 4: Summary + actions ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">

          {/* Totals */}
          <div className="space-y-2 min-w-[240px]">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span className="font-medium">{fmtMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax</span><span className="font-medium">{fmtMoney(taxTotal)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-gray-900 border-t pt-2">
              <span>Total</span><span>{fmtMoney(total)}</span>
            </div>
            {payments.length > 0 && (
              <>
                <div className="flex justify-between text-sm text-emerald-700">
                  <span>Paid</span><span className="font-medium">{fmtMoney(paid)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-red-600">
                  <span>Balance Due</span><span>{fmtMoney(balanceDue)}</span>
                </div>
              </>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/purchases/receipts"
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-center transition-colors">
              Discard
            </Link>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              className="px-5 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving…' : 'Save as Draft'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting ? 'Processing…' : 'Confirm & Receive'}
            </button>
          </div>
        </div>
      </div>

      {/* PO selector modal */}
      {showPOModal && vendorId && (
        <POSelectorModal
          vendorId={vendorId}
          onSelect={(id, num) => { setPoId(id); setPoNumber(num); setShowPOModal(false); }}
          onClose={() => setShowPOModal(false)}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter }  from 'next/navigation';
import Link           from 'next/link';
import { useStores }  from '@/hooks/use-stores';
import { useProducts } from '@/hooks/use-products';
import { useAccounts } from '@/hooks/use-finance';
import { useCreateSale, useConfirmSale } from '@/hooks/use-sales';
import { useCustomers, useCustomerBalance } from '@/hooks/use-customers';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { api } from '@/lib/api';
import {
  queueSale,
  getCachedProducts,
  getCachedCustomers,
  getMeta,
  type CachedProduct,
  type CachedCustomer,
} from '@/lib/offline-db';
import type { SalesPaymentMode, Customer, Store, FinancialAccount } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  productId: string;
  variantId: string | null;
  name:      string;
  sku:       string;
  quantity:  number;
  unitPrice: number;
  taxRate:   number;
  discount:  number;
}

interface PaymentLine {
  mode:      SalesPaymentMode;
  accountId: string;
  amount:    string;
  refNum:    string;
}

type CustomerMode = 'walkin' | 'corporate';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmt      = (n: number) => `$${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function calcItem(item: CartItem) {
  const subtotal = item.quantity * item.unitPrice - item.discount;
  const tax      = parseFloat(((subtotal * item.taxRate) / 100).toFixed(2));
  return { subtotal, tax, total: subtotal + tax };
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

const MODE_META: Record<SalesPaymentMode, { label: string; active: string }> = {
  cash:   { label: 'Cash',          active: 'bg-emerald-600 border-emerald-600 text-white' },
  bank:   { label: 'Bank Transfer', active: 'bg-blue-600 border-blue-600 text-white' },
  credit: { label: 'Credit',        active: 'bg-orange-500 border-orange-500 text-white' },
};

// ─── Customer balance badge ───────────────────────────────────────────────────

function CustomerBalanceBadge({ customerId }: { customerId: string }) {
  const { data } = useCustomerBalance(customerId);
  const bal = data?.balance ?? 0;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bal > 0 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
      Outstanding: {fmt(bal)}
    </span>
  );
}

// ─── Customer search dropdown ─────────────────────────────────────────────────

function CustomerSearch({ onSelect, isOnline }: { onSelect: (c: Customer) => void; isOnline: boolean }) {
  const [q,    setQ]    = useState('');
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  const { data } = useCustomers({ search: q || undefined, limit: 8 });
  const [offlineCustomers, setOfflineCustomers] = useState<CachedCustomer[]>([]);
  useEffect(() => {
    if (!isOnline && q) {
      getCachedCustomers().then((all) => {
        const lq = q.toLowerCase();
        setOfflineCustomers(
          all.filter((c) => c.name.toLowerCase().includes(lq) || (c.phone ?? '').includes(lq)).slice(0, 8)
        );
      });
    } else if (!isOnline && !q) {
      setOfflineCustomers([]);
    }
  }, [isOnline, q]);

  const customers: { id: string; name: string; phone?: string | null; email?: string | null }[] =
    isOnline ? (data?.data ?? []) : offlineCustomers;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name or phone…"
          className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {open && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
          {customers.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center text-gray-400">No customers found</p>
          ) : (
            customers.map((c) => (
              <button
                key={c.id} type="button"
                onClick={() => { onSelect(c as Customer); setQ(''); setOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                    {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                  </div>
                  {isOnline && <CustomerBalanceBadge customerId={c.id} />}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Product search ───────────────────────────────────────────────────────────

function ProductSearch({ onAdd, isOnline }: { onAdd: (item: CartItem) => void; isOnline: boolean }) {
  const [q,    setQ]    = useState('');
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  // Online: API-backed live search
  const { data: apiResult } = useProducts({ search: q || undefined, limit: 10 });

  // Offline: filter IDB snapshot client-side
  const [offlineProducts, setOfflineProducts] = useState<CachedProduct[]>([]);
  useEffect(() => {
    if (!isOnline && q) {
      getCachedProducts().then((all) => {
        const lq = q.toLowerCase();
        setOfflineProducts(
          all.filter((p) => p.name.toLowerCase().includes(lq) || p.sku.toLowerCase().includes(lq)).slice(0, 10)
        );
      });
    } else if (!isOnline && !q) {
      setOfflineProducts([]);
    }
  }, [isOnline, q]);

  const products: { id: string; name: string; sku?: string | null; basePrice: string }[] =
    isOnline ? (apiResult?.data ?? []) : offlineProducts;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={isOnline ? 'Search product by name or SKU…' : 'Search cached products…'}
          className="pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {open && products.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
          {products.map((p) => (
            <button
              key={p.id} type="button"
              onClick={() => {
                onAdd({
                  productId: p.id, variantId: null,
                  name: p.name, sku: p.sku ?? '',
                  quantity: 1, unitPrice: parseFloat(p.basePrice),
                  taxRate: 0, discount: 0,
                });
                setQ(''); setOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  {p.sku && <p className="text-xs text-gray-400 font-mono">{p.sku}</p>}
                </div>
                <p className="text-sm font-bold text-indigo-700">{fmt(parseFloat(p.basePrice))}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && q && products.length === 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-6 text-center text-sm text-gray-400">
          {isOnline ? 'No products found' : 'Not found in offline cache'}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewSaleInvoicePage() {
  const router      = useRouter();
  const isOnline    = useOnlineStatus();
  const createSale  = useCreateSale();
  const confirmSale = useConfirmSale();

  // Online: from API; Offline: from IndexedDB meta cache
  const { data: onlineStores   = [] } = useStores();
  const { data: onlineAccounts = [] } = useAccounts();
  const [offlineStores,   setOfflineStores]   = useState<Store[]>([]);
  const [offlineAccounts, setOfflineAccounts] = useState<FinancialAccount[]>([]);
  useEffect(() => {
    if (!isOnline) {
      getMeta<Store[]>('stores').then((v) => setOfflineStores(v ?? []));
      getMeta<FinancialAccount[]>('accounts').then((v) => setOfflineAccounts(v ?? []));
    }
  }, [isOnline]);
  const stores   = isOnline ? onlineStores   : offlineStores;
  const accounts = isOnline ? onlineAccounts : offlineAccounts;

  // Offline queued state
  const [offlineQueued, setOfflineQueued] = useState<{ localDisplayId: string } | null>(null);

  // ── Invoice header ───────────────────────────────────────────────────────────
  const [storeId,     setStoreId]     = useState('');
  const [invoiceDate, setInvoiceDate] = useState(todayStr());

  // ── Customer ─────────────────────────────────────────────────────────────────
  const [customerMode,  setCustomerMode]  = useState<CustomerMode>('walkin');
  const [selectedCust,  setSelectedCust]  = useState<Customer | null>(null);
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // balance shown while filling the invoice
  const { data: custBalData } = useCustomerBalance(selectedCust?.id ?? null);
  const custBalance = custBalData?.balance ?? 0;

  function handleSelectCustomer(c: Customer) {
    setSelectedCust(c);
    setCustomerName(c.name);
    setCustomerPhone(c.phone ?? '');
  }

  function clearCustomer() {
    setSelectedCust(null);
    setCustomerName('');
    setCustomerPhone('');
  }

  // ── Cart ─────────────────────────────────────────────────────────────────────
  const [cart, setCart]           = useState<CartItem[]>([]);
  const [invDiscount, setInvDisc] = useState('0');

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.productId === item.productId && c.variantId === item.variantId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, item];
    });
  }, []);

  const updateCart = (idx: number, field: keyof CartItem, value: string | number) =>
    setCart((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));

  const removeCart = (idx: number) => setCart((prev) => prev.filter((_, i) => i !== idx));

  // ── Payments ─────────────────────────────────────────────────────────────────
  const [payments, setPayments] = useState<PaymentLine[]>([
    { mode: 'cash', accountId: '', amount: '', refNum: '' },
  ]);

  // ── Totals ────────────────────────────────────────────────────────────────────
  const lineCalcs  = cart.map(calcItem);
  const subtotal   = lineCalcs.reduce((s, l) => s + l.subtotal, 0);
  const taxTotal   = lineCalcs.reduce((s, l) => s + l.tax, 0);
  const discount   = Math.max(0, parseFloat(invDiscount) || 0);
  const grandTotal = Math.max(0, subtotal + taxTotal - discount);
  const paidSum    = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const changeDue  = paidSum - grandTotal;

  const updatePayment = (idx: number, field: keyof PaymentLine, value: string) =>
    setPayments((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));

  const addPaymentLine = () =>
    setPayments((prev) => [...prev, { mode: 'cash', accountId: '', amount: '', refNum: '' }]);

  const removePaymentLine = (idx: number) =>
    setPayments((prev) => prev.filter((_, i) => i !== idx));

  const cashBankAccounts = (mode: SalesPaymentMode) =>
    accounts.filter((a) => a.isActive &&
      (mode === 'cash' ? a.category === 'cash' : a.category === 'bank'));

  // Fill the first payment amount automatically
  function fillRemaining(idx: number) {
    const others = payments.reduce((s, p, i) => i === idx ? s : s + (parseFloat(p.amount) || 0), 0);
    const remaining = Math.max(0, grandTotal - others);
    updatePayment(idx, 'amount', remaining.toFixed(2));
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function buildPayload() {
    const validPay = payments.filter((p) => parseFloat(p.amount) > 0);
    return {
      storeId, invoiceDate,
      customerId:    selectedCust?.id     ?? null,
      customerName:  customerName.trim()  || null,
      customerPhone: customerPhone.trim() || null,
      discountAmount: discount,
      items: cart.map((c) => ({
        productId:  c.productId, variantId: c.variantId,
        quantity: c.quantity, unitPrice: c.unitPrice,
        discountAmount: c.discount, taxRate: c.taxRate,
      })),
      payments: validPay.map((p) => ({
        paymentMode: p.mode,
        accountId:   p.accountId || null,
        amount:      parseFloat(p.amount),
        referenceNumber: p.refNum.trim() || null,
      })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!storeId)          { setError('Select a store.'); return; }
    if (cart.length === 0) { setError('Add at least one product.'); return; }

    const validPay = payments.filter((p) => parseFloat(p.amount) > 0);

    for (const p of validPay) {
      if (p.mode === 'credit' && !selectedCust) {
        setError('Credit sales require a corporate customer to be selected.');
        return;
      }
      if ((p.mode === 'cash' || p.mode === 'bank') && !p.accountId) {
        setError(`Select an account for the ${p.mode} payment.`);
        return;
      }
    }

    setSaving(true);

    // ── Offline path: queue in IndexedDB ─────────────────────────────────────
    if (!isOnline) {
      try {
        const queued = await queueSale(buildPayload());
        // Request background sync if supported
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const sw = await navigator.serviceWorker.ready;
          // @ts-expect-error SyncManager not yet in all TS lib defs
          await sw.sync.register('offline-sales-sync');
        }
        setOfflineQueued({ localDisplayId: queued.localDisplayId });
      } catch {
        setError('Failed to save offline. Please try again.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // ── Online path: normal API flow ──────────────────────────────────────────
    let createdId: string | null = null;
    try {
      const invoice = await createSale.mutateAsync(buildPayload());
      createdId = invoice.id;

      await confirmSale.mutateAsync(invoice.id);
      router.push(`/sales/invoices/${invoice.id}`);
    } catch (err: unknown) {
      // Auto-cancel the orphaned draft when confirm fails (e.g. stock check)
      if (createdId && !confirmSale.isSuccess) {
        try { await api.patch(`/sales/${createdId}/cancel`); } catch { /* best-effort */ }
      }
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Failed to create invoice.');
    } finally {
      setSaving(false);
    }
  }

  // ── Offline queued success screen ─────────────────────────────────────────────
  if (offlineQueued) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <div className="h-20 w-20 rounded-full bg-amber-100 flex items-center justify-center mb-6">
          <svg className="h-10 w-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sale Queued</h2>
        <p className="text-sm text-gray-500 mb-1">Saved locally while offline</p>
        <p className="text-xl font-black text-amber-600 mb-1">{offlineQueued.localDisplayId}</p>
        <p className="text-xs text-gray-400 mb-8">
          This sale will be automatically confirmed and synced once you are back online.
          Stock and balances will be updated at that point.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setOfflineQueued(null);
              setCart([]); setPayments([{ mode: 'cash', accountId: '', amount: '', refNum: '' }]);
              setCustomerName(''); setCustomerPhone(''); setSelectedCust(null);
              setInvDisc('0'); setError('');
            }}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            New Sale
          </button>
          <Link href="/sales/invoices"
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
            View Invoices
          </Link>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-5 pb-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/sales/invoices" className="text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Sale</h1>
            <p className="text-sm text-gray-400">Cash or corporate sales invoice</p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium whitespace-pre-line">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left column ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Invoice header */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Invoice Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Store <span className="text-red-500">*</span>
                  </label>
                  <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={inputCls} required>
                    <option value="">Select store…</option>
                    {(stores as Store[]).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputCls} required />
                </div>
              </div>
            </div>

            {/* ── Customer ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">

              {/* Walk-in / Corporate toggle */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer</h2>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => { setCustomerMode('walkin'); clearCustomer(); }}
                    className={`px-3 py-1.5 transition-colors ${customerMode === 'walkin' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Walk-in
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('corporate')}
                    className={`px-3 py-1.5 transition-colors ${customerMode === 'corporate' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Corporate
                  </button>
                </div>
              </div>

              {customerMode === 'walkin' ? (
                /* Walk-in: quick name + phone */
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                    <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 555 000 0000" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Name</label>
                    <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Walk-in customer" className={inputCls} />
                  </div>
                </div>
              ) : (
                /* Corporate: customer search + selected card */
                <div className="space-y-3">
                  {!selectedCust ? (
                    <CustomerSearch onSelect={handleSelectCustomer} isOnline={isOnline} />
                  ) : (
                    /* Selected customer card */
                    <div className="flex items-start justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-black flex-shrink-0">
                            {selectedCust.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{selectedCust.name}</p>
                            {selectedCust.phone && <p className="text-xs text-gray-500">{selectedCust.phone}</p>}
                            {selectedCust.email && <p className="text-xs text-gray-400">{selectedCust.email}</p>}
                          </div>
                        </div>
                        <div className="pl-10">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${custBalance > 0 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            <span>Outstanding Balance:</span>
                            <span>{fmt(custBalance)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearCustomer}
                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                        title="Remove customer"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Manual override fields when corporate */}
                  {!selectedCust && (
                    <p className="text-xs text-gray-400 text-center">Select a customer above, or switch to Walk-in for quick entry</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Cart ── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Items</h2>
                {storeId ? (
                  <ProductSearch onAdd={addToCart} isOnline={isOnline} />
                ) : (
                  <p className="text-sm text-gray-400">Select a store first</p>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-10 text-gray-300 text-sm">No items added yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-2.5 text-left   text-xs font-semibold text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-24">Qty</th>
                        <th className="px-4 py-2.5 text-right  text-xs font-semibold text-gray-500 uppercase w-28">Price</th>
                        <th className="px-4 py-2.5 text-right  text-xs font-semibold text-gray-500 uppercase w-24">Tax %</th>
                        <th className="px-4 py-2.5 text-right  text-xs font-semibold text-gray-500 uppercase w-28">Discount</th>
                        <th className="px-4 py-2.5 text-right  text-xs font-semibold text-gray-500 uppercase w-28">Total</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {cart.map((item, idx) => {
                        const { total } = calcItem(item);
                        return (
                          <tr key={`${item.productId}-${item.variantId ?? ''}`}>
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-gray-900">{item.name}</p>
                              {item.sku && <p className="text-xs text-gray-400 font-mono">{item.sku}</p>}
                            </td>
                            <td className="px-4 py-2.5">
                              <input type="number" min={1} step={1} value={item.quantity}
                                onChange={(e) => updateCart(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </td>
                            <td className="px-4 py-2.5">
                              <input type="number" min={0} step="0.01" value={item.unitPrice}
                                onChange={(e) => updateCart(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </td>
                            <td className="px-4 py-2.5">
                              <input type="number" min={0} max={100} step="0.01" value={item.taxRate}
                                onChange={(e) => updateCart(idx, 'taxRate', parseFloat(e.target.value) || 0)}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </td>
                            <td className="px-4 py-2.5">
                              <input type="number" min={0} step="0.01" value={item.discount}
                                onChange={(e) => updateCart(idx, 'discount', parseFloat(e.target.value) || 0)}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmt(total)}</td>
                            <td className="px-4 py-2.5">
                              <button type="button" onClick={() => removeCart(idx)} className="text-red-300 hover:text-red-500">
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
              )}

              {/* Totals strip */}
              {cart.length > 0 && (
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span><span className="font-semibold">{fmt(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax</span><span className="font-semibold">{fmt(taxTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Invoice Discount</span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">$</span>
                      <input type="number" min={0} step="0.01" value={invDiscount}
                        onChange={(e) => setInvDisc(e.target.value)}
                        className="w-24 border border-gray-200 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total</span><span>{fmt(grandTotal)}</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ── Right: payment + submit ── */}
          <div className="space-y-4">

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment</h2>
                <button type="button" onClick={addPaymentLine}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                  + Split
                </button>
              </div>

              <div className="space-y-5">
                {payments.map((p, idx) => (
                  <div key={idx} className="space-y-2 pb-4 border-b border-gray-50 last:border-0">

                    {/* Mode selector */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['cash', 'bank', 'credit'] as SalesPaymentMode[]).map((m) => (
                        <button key={m} type="button"
                          onClick={() => updatePayment(idx, 'mode', m)}
                          className={`py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                            p.mode === m ? MODE_META[m].active : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {MODE_META[m].label}
                        </button>
                      ))}
                    </div>

                    {/* Credit warning */}
                    {p.mode === 'credit' && !selectedCust && (
                      <p className="text-xs text-orange-600 font-medium bg-orange-50 rounded px-2 py-1">
                        Switch to Corporate and select a customer to use credit
                      </p>
                    )}
                    {p.mode === 'credit' && selectedCust && (
                      <p className="text-xs text-indigo-600 font-medium bg-indigo-50 rounded px-2 py-1">
                        Will be charged to {selectedCust.name}'s account
                      </p>
                    )}

                    {/* Account (cash/bank only) */}
                    {p.mode !== 'credit' && (
                      <select value={p.accountId} onChange={(e) => updatePayment(idx, 'accountId', e.target.value)} className={inputCls}>
                        <option value="">Select account…</option>
                        {cashBankAccounts(p.mode).map((a) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    )}

                    {/* Amount */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">$</span>
                        <input type="number" min={0} step="0.01" value={p.amount}
                          onChange={(e) => updatePayment(idx, 'amount', e.target.value)}
                          placeholder="0.00"
                          className={`${inputCls} pl-6`} />
                      </div>
                      <button type="button" onClick={() => fillRemaining(idx)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 flex-shrink-0"
                        title="Fill remaining amount"
                      >
                        Fill
                      </button>
                      {payments.length > 1 && (
                        <button type="button" onClick={() => removePaymentLine(idx)}
                          className="text-red-300 hover:text-red-500 flex-shrink-0">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Ref # */}
                    <input type="text" value={p.refNum} onChange={(e) => updatePayment(idx, 'refNum', e.target.value)}
                      placeholder="Ref # (optional)" className={inputCls} />
                  </div>
                ))}
              </div>

              {/* Payment summary */}
              {cart.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Invoice Total</span>
                    <span className="font-bold text-gray-900">{fmt(grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Amount Tendered</span>
                    <span className="font-bold text-emerald-600">{fmt(paidSum)}</span>
                  </div>
                  <div className={`flex justify-between text-sm font-black ${changeDue >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    <span>{changeDue >= 0 ? 'Change Due' : 'Balance Due'}</span>
                    <span>{fmt(Math.abs(changeDue))}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={saving || cart.length === 0 || !storeId}
              className="w-full py-3.5 text-base font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors">
              {saving ? 'Processing…' : 'Confirm Sale'}
            </button>

            <Link href="/sales/invoices"
              className="block w-full py-2.5 text-center text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancel
            </Link>

          </div>
        </div>
      </div>
    </form>
  );
}

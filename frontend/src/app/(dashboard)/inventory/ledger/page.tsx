'use client';

export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useSearchParams }    from 'next/navigation';
import Link                   from 'next/link';
import { useStores }          from '@/hooks/use-stores';
import { useProducts }        from '@/hooks/use-products';
import { useStoreLedger }     from '@/hooks/use-inventory';
import type { StoreLedgerEntry } from '@/hooks/use-inventory';

// ─── Movement type display ────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; cls: string; dir: 'in' | 'out' | 'neutral' }> = {
  receive:         { label: 'Purchase Receipt',   cls: 'bg-emerald-100 text-emerald-700', dir: 'in'      },
  sale:            { label: 'Sale',               cls: 'bg-red-100 text-red-600',         dir: 'out'     },
  adjustment:      { label: 'Adjustment',         cls: 'bg-blue-100 text-blue-700',       dir: 'neutral' },
  transfer_in:     { label: 'Transfer In',        cls: 'bg-indigo-100 text-indigo-700',   dir: 'in'      },
  transfer_out:    { label: 'Transfer Out',       cls: 'bg-orange-100 text-orange-700',   dir: 'out'     },
  damage:          { label: 'Damage / Write-off', cls: 'bg-red-100 text-red-700',         dir: 'out'     },
  return:          { label: 'Customer Return',    cls: 'bg-teal-100 text-teal-700',       dir: 'in'      },
  opening_balance: { label: 'Opening Balance',    cls: 'bg-gray-100 text-gray-600',       dir: 'neutral' },
};

function meta(type: string) {
  return TYPE_META[type] ?? { label: type, cls: 'bg-gray-100 text-gray-500', dir: 'neutral' as const };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function variantAttrs(raw: string | null) {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as Record<string, string>;
    return Object.values(obj).join(' / ');
  } catch {
    return null;
  }
}

// ─── Inner form (uses useSearchParams) ───────────────────────────────────────

function LedgerContent() {
  const searchParams = useSearchParams();

  const [storeId,   setStoreId]   = useState(searchParams.get('storeId')   ?? '');
  const [productId, setProductId] = useState(searchParams.get('productId') ?? '');
  const [variantId, setVariantId] = useState(searchParams.get('variantId') ?? '');
  const [page, setPage] = useState(1);

  const { data: storeRes }    = useStores();
  const stores   = storeRes ?? [];
  const { data: productRes }  = useProducts({ limit: 1000 });
  const products = productRes?.data ?? [];

  const selectedProduct = products.find((p) => p.id === productId);
  const variants = selectedProduct?.variants?.filter((v) => v.isActive) ?? [];

  const { data, isLoading, isFetching } = useStoreLedger({
    storeId:   storeId   || undefined,
    productId: productId || undefined,
    variantId: variantId || undefined,
    page,
    limit: 50,
  });

  function handleProductChange(pid: string) {
    setProductId(pid);
    setVariantId('');
    setPage(1);
  }

  const inputCls  = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const selectCls = inputCls;

  const ready = !!(storeId && productId);

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/inventory" className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Store Ledger</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Store <span className="text-red-500">*</span>
            </label>
            <select
              value={storeId}
              onChange={(e) => { setStoreId(e.target.value); setPage(1); }}
              className={`${selectCls} w-full`}
            >
              <option value="">Select store…</option>
              {stores.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className={`${selectCls} w-full`}
            >
              <option value="">Select product…</option>
              {products.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>
              ))}
            </select>
          </div>

          {variants.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Variant
              </label>
              <select
                value={variantId}
                onChange={(e) => { setVariantId(e.target.value); setPage(1); }}
                className={`${selectCls} w-full`}
              >
                <option value="">All variants</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {Object.values(v.attributes).join(' / ')}
                    {v.sku ? ` — ${v.sku}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {!ready && (
        <div className="bg-white rounded-xl border border-gray-100 py-20 text-center">
          <svg className="h-10 w-10 text-gray-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-gray-400">Select a store and product to view the ledger.</p>
        </div>
      )}

      {ready && (
        <>
          {/* Summary card */}
          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Product</p>
                <p className="text-sm font-bold text-gray-900 truncate">{data.data[0]?.product_name ?? selectedProduct?.name ?? '—'}</p>
                {data.data[0]?.product_sku && (
                  <p className="text-xs text-gray-400 font-mono">{data.data[0].product_sku}</p>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Store</p>
                <p className="text-sm font-bold text-gray-900 truncate">{data.data[0]?.store_name ?? stores.find((s) => s.id === storeId)?.name ?? '—'}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Current Stock</p>
                <p className={`text-2xl font-black ${data.currentQty <= 0 ? 'text-red-600' : data.currentQty <= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {data.currentQty}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Movements</p>
                <p className="text-2xl font-black text-gray-900">{data.total}</p>
              </div>
            </div>
          )}

          {/* Ledger table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Movement History</h2>
              {isFetching && <span className="text-xs text-gray-400">Loading…</span>}
            </div>

            {isLoading ? (
              <div className="animate-pulse p-6 space-y-3">
                {[...Array(8)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded" />)}
              </div>
            ) : !data?.data.length ? (
              <div className="py-16 text-center text-gray-400">
                <p className="text-sm">No movements found for this selection.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Date & Time</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Movement Type</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Reference</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">Variant</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-emerald-600">In</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-red-500">Out</th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-700">Balance</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(data.data as StoreLedgerEntry[]).map((row) => {
                      const m        = meta(row.type);
                      const isIn     = row.quantity > 0;
                      const isOut    = row.quantity < 0;
                      const absQty   = Math.abs(row.quantity);
                      const balance  = Number(row.balance_after);
                      const vLabel   = variantAttrs(row.variant_attrs);

                      return (
                        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {fmtDate(row.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${m.cls}`}>
                              {m.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {row.notes ? (
                              <p className="text-xs text-gray-500 max-w-[180px] truncate" title={row.notes}>{row.notes}</p>
                            ) : row.reference_type ? (
                              <span className="text-xs text-gray-400 font-mono">{row.reference_type}</span>
                            ) : (
                              <span className="text-gray-200 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {vLabel ?? <span className="text-gray-200">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isIn ? (
                              <span className="text-sm font-bold text-emerald-600">+{absQty}</span>
                            ) : (
                              <span className="text-gray-200 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isOut ? (
                              <span className="text-sm font-bold text-red-500">−{absQty}</span>
                            ) : (
                              <span className="text-gray-200 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-black tabular-nums ${balance <= 0 ? 'text-red-600' : balance <= 10 ? 'text-amber-600' : 'text-gray-900'}`}>
                              {balance}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {row.created_by_name ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {((page - 1) * 50) + 1}–{Math.min(page * 50, data.total)} of {data.total} entries
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    ← Prev
                  </button>
                  <span className="px-3 py-1.5 text-xs text-gray-500">
                    {page} / {data.totalPages}
                  </span>
                  <button
                    disabled={page >= data.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function StoreLedgerPage() {
  return (
    <Suspense>
      <LedgerContent />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useInventory, useStockMovements, useStockTransfers } from '@/hooks/use-inventory';
import { useStores } from '@/hooks/use-stores';
import { useMe } from '@/hooks/use-auth';
import { InventoryTable } from './_components/inventory-table';
import { AdjustModal } from './_components/adjust-modal';
import { TransferModal } from './_components/transfer-modal';
import { Pagination } from '@/components/ui/pagination';
import type { InventoryRow, StockMovementType } from '@/types';

const LIMIT = 50;

// ─── Movement type badge ──────────────────────────────────────────────────────

const TYPE_META: Record<StockMovementType, { label: string; color: string }> = {
  receive:         { label: 'Receive',        color: 'bg-green-100 text-green-700' },
  sale:            { label: 'Sale',           color: 'bg-blue-100 text-blue-700' },
  adjustment:      { label: 'Adjustment',     color: 'bg-gray-100 text-gray-700' },
  transfer_in:     { label: 'Transfer In',    color: 'bg-indigo-100 text-indigo-700' },
  transfer_out:    { label: 'Transfer Out',   color: 'bg-violet-100 text-violet-700' },
  damage:          { label: 'Damage',         color: 'bg-red-100 text-red-700' },
  return:          { label: 'Return',         color: 'bg-amber-100 text-amber-700' },
  opening_balance: { label: 'Opening Bal.',   color: 'bg-teal-100 text-teal-700' },
};

type Tab = 'stock' | 'movements' | 'transfers';

export default function InventoryPage() {
  const { data: me }    = useMe();
  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';

  const { data: stores = [] }    = useStores();
  const defaultStore              = stores.find((s) => s.isDefault) ?? stores[0];

  const [tab, setTab]                 = useState<Tab>('stock');
  const [storeFilter, setStoreFilter] = useState('');
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [movPage, setMovPage]         = useState(1);
  const [trfPage, setTrfPage]         = useState(1);

  const { data: invResult, isLoading: invLoading } = useInventory({
    storeId: storeFilter || undefined, search: search || undefined, page, limit: LIMIT,
  });
  const { data: movResult, isLoading: movLoading } = useStockMovements({
    storeId: storeFilter || undefined, page: movPage, limit: 30,
  });
  const { data: trfResult, isLoading: trfLoading } = useStockTransfers({
    page: trfPage, limit: 20,
  });

  const [adjustRow, setAdjustRow]   = useState<InventoryRow | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const invRows    = invResult?.data ?? [];
  const total      = invResult?.total ?? 0;
  const totalPages = invResult?.totalPages ?? 1;

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stores.length} store{stores.length !== 1 ? 's' : ''} · {total} inventory record{total !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link href="/inventory/opening-balance"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              Opening Balance
            </Link>
            <button onClick={() => setTransferOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              Transfer
            </button>
            <button onClick={() => setAdjustRow(invRows[0] ?? null)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              Adjust Stock
            </button>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Store tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => { setStoreFilter(''); setPage(1); }}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!storeFilter ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            All stores
          </button>
          {stores.map((s) => (
            <button key={s.id} onClick={() => { setStoreFilter(s.id); setPage(1); }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${storeFilter === s.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {s.name}
            </button>
          ))}
        </div>

        {tab === 'stock' && (
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search product…"
              className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48" />
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 -mt-2">
        <div className="flex gap-2">
          <button className={tabCls('stock')}    onClick={() => setTab('stock')}>Stock Levels</button>
          <button className={tabCls('movements')} onClick={() => setTab('movements')}>Movements</button>
          <button className={tabCls('transfers')} onClick={() => setTab('transfers')}>Transfers</button>
        </div>
      </div>

      {/* ── Stock Levels tab ─────────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {invLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              <span className="text-sm">Loading inventory…</span>
            </div>
          ) : (
            <>
              <InventoryTable rows={invRows} isAdmin={isAdmin} showStore={!storeFilter} onAdjust={setAdjustRow} />
              <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
            </>
          )}
        </div>
      )}

      {/* ── Movements tab ────────────────────────────────────────────────────── */}
      {tab === 'movements' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {movLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              <span className="text-sm">Loading movements…</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Date', 'Product', 'Variant', 'Store', 'Type', 'Qty', 'Notes'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(movResult?.data ?? []).length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No movements recorded yet</td></tr>
                    ) : (movResult?.data ?? []).map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(m.createdAt).toLocaleDateString()} {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{m.product.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{m.variant ? Object.values(m.variant.attributes).join(' / ') : '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{m.store.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_META[m.type]?.color ?? 'bg-gray-100 text-gray-700'}`}>
                            {TYPE_META[m.type]?.label ?? m.type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-sm font-semibold ${m.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {m.quantity >= 0 ? '+' : ''}{m.quantity}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{m.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={movPage} totalPages={movResult?.totalPages ?? 1} total={movResult?.total ?? 0} limit={30} onPageChange={setMovPage} />
            </>
          )}
        </div>
      )}

      {/* ── Transfers tab ─────────────────────────────────────────────────────── */}
      {tab === 'transfers' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {trfLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
              <span className="text-sm">Loading transfers…</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {['Date', 'From', 'To', 'Items', 'Status', 'Notes'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(trfResult?.data ?? []).length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No transfers yet</td></tr>
                    ) : (trfResult?.data ?? []).map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{t.fromStore.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{t.toStore.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="space-y-0.5">
                            {t.items.map((it) => (
                              <div key={it.id} className="text-xs">
                                {it.product.name}{it.variant ? ` (${Object.values(it.variant.attributes).join('/')})` : ''} × {it.quantity}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.status === 'completed' ? 'bg-green-100 text-green-700' :
                            t.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">{t.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={trfPage} totalPages={trfResult?.totalPages ?? 1} total={trfResult?.total ?? 0} limit={20} onPageChange={setTrfPage} />
            </>
          )}
        </div>
      )}

      <AdjustModal open={!!adjustRow} row={adjustRow} defaultStore={defaultStore} onClose={() => setAdjustRow(null)} />
      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} />
    </div>
  );
}

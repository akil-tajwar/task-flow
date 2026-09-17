'use client';

import { useState, useCallback } from 'react';
import { useProducts, useDeleteProduct } from '@/hooks/use-products';
import { useBrands } from '@/hooks/use-brands';
import { useCategories } from '@/hooks/use-categories';
import { useMe } from '@/hooks/use-auth';
import { ProductTable } from './_components/product-table';
import { ProductFormModal } from './_components/product-form-modal';
import { Pagination } from '@/components/ui/pagination';
import type { Product } from '@/types';

const LIMIT = 20;

export default function ProductsPage() {
  const { data: me } = useMe();
  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin';

  const [search, setSearch]       = useState('');
  const [brandId, setBrandId]     = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage]           = useState(1);

  const { data: result, isLoading, isError } = useProducts({ search: search || undefined, brandId: brandId || undefined, categoryId: categoryId || undefined, page, limit: LIMIT });
  const { data: brands = [] }     = useBrands();
  const { data: categories = [] } = useCategories();
  const deleteProduct = useDeleteProduct();

  const [modalOpen, setModalOpen]       = useState(false);
  const [editing, setEditing]           = useState<Product | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const resetPage = useCallback(() => setPage(1), []);

  const handleSearch = (v: string) => { setSearch(v); resetPage(); };
  const handleBrand  = (v: string) => { setBrandId(v); resetPage(); };
  const handleCat    = (v: string) => { setCategoryId(v); resetPage(); };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    setConfirmDelete(null);
    try { await deleteProduct.mutateAsync(confirmDelete.id); }
    finally { setDeletingId(null); }
  };

  const products   = result?.data ?? [];
  const total      = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} product{total !== 1 ? 's' : ''} in your catalogue</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditing(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            Add Product
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search name or SKU…"
            className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56" />
        </div>

        <select value={brandId} onChange={(e) => handleBrand(e.target.value)}
          className="py-2 pl-3 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600">
          <option value="">All brands</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select value={categoryId} onChange={(e) => handleCat(e.target.value)}
          className="py-2 pl-3 pr-8 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-600">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {(search || brandId || categoryId) && (
          <button onClick={() => { setSearch(''); setBrandId(''); setCategoryId(''); resetPage(); }}
            className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            Clear filters
          </button>
        )}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            <span className="text-sm">Loading products…</span>
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-red-500 text-sm">Failed to load products. Check your connection.</div>
        ) : (
          <>
            <ProductTable products={products} isAdmin={isAdmin} onEdit={(p) => { setEditing(p); setModalOpen(true); }} onDelete={(p) => setConfirmDelete(p)} deletingId={deletingId} />
            <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={setPage} />
          </>
        )}
      </div>

      <ProductFormModal open={modalOpen} product={editing} onClose={() => setModalOpen(false)} />

      {/* Delete confirm */}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmDelete(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900">Remove product?</h3>
            <p className="text-sm text-gray-500 mt-2"><strong>{confirmDelete.name}</strong> will be deactivated and hidden from your catalogue.</p>
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

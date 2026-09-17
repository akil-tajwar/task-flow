'use client';

import type { Product, ProductStoreStock } from '@/types';

interface ProductTableProps {
  products: Product[];
  isAdmin: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  deletingId: string | null;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function ProductAvatar({ product }: { product: Product }) {
  if (product.imageUrl) {
    return <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />;
  }
  const colors = [
    'bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700',   'bg-rose-100 text-rose-700',
    'bg-sky-100 text-sky-700',       'bg-violet-100 text-violet-700',
  ];
  const color = colors[product.name.charCodeAt(0) % colors.length];
  return (
    <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0 ${color}`}>
      {product.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Per-store stock chips ────────────────────────────────────────────────────

function StoreStockChips({ stores, total }: { stores: ProductStoreStock[]; total: number }) {
  if (!stores.length) {
    return <span className="text-xs text-gray-400 italic">Not in inventory</span>;
  }

  const chipColor = (qty: number) =>
    qty <= 0  ? 'bg-red-100 text-red-700 border-red-200' :
    qty <= 10 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                'bg-green-100 text-green-700 border-green-200';

  // Show at most 3 store chips inline; overflow as "+N more"
  const visible  = stores.slice(0, 3);
  const overflow = stores.length - visible.length;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 flex-wrap">
        {visible.map((s) => (
          <span key={s.storeId}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium whitespace-nowrap ${chipColor(s.quantity)}`}>
            <span className="font-mono opacity-70">{s.storeCode}</span>
            <span>{s.quantity}</span>
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-[11px] text-gray-400">+{overflow} more</span>
        )}
      </div>
      <p className="text-xs text-gray-400">{total} total across {stores.length} store{stores.length !== 1 ? 's' : ''}</p>
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function ProductTable({ products, isAdmin, onEdit, onDelete, deletingId }: ProductTableProps) {
  if (!products.length) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No products yet</p>
        {isAdmin && <p className="text-gray-400 text-sm mt-1">Click &ldquo;Add Product&rdquo; to get started</p>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            {['Product', 'Category', 'Brand', 'Price', 'Inventory', 'Status', ...(isAdmin ? [''] : [])].map((h) => (
              <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === '' ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {products.map((product) => {
            const inv = product.inventorySummary ?? { total: 0, stores: [] };
            return (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">

                {/* Product */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ProductAvatar product={product} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      {product.sku && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 text-xs font-mono bg-gray-100 text-gray-500 rounded">
                          {product.sku}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  {product.category?.name ?? <span className="text-gray-300">—</span>}
                </td>

                {/* Brand */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  {product.brand?.name ?? <span className="text-gray-300">—</span>}
                </td>

                {/* Price */}
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  ${parseFloat(product.basePrice).toFixed(2)}
                </td>

                {/* Inventory — per-store or variant badge */}
                <td className="px-6 py-4">
                  {product.hasVariants ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        Has variants
                      </span>
                      {inv.stores.length > 0 && (
                        <p className="text-xs text-gray-400">{inv.total} units across {inv.stores.length} store{inv.stores.length !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  ) : (
                    <StoreStockChips stores={inv.stores} total={inv.total} />
                  )}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  {product.isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />Inactive
                    </span>
                  )}
                </td>

                {/* Actions */}
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => onEdit(product)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-900 transition-colors">
                        Edit
                      </button>
                      <span className="text-gray-200">|</span>
                      <button onClick={() => onDelete(product)} disabled={deletingId === product.id}
                        className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
                        {deletingId === product.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

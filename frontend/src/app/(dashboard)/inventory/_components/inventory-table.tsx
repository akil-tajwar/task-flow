import Link from 'next/link';
import type { InventoryRow } from '@/types';

interface Props {
  rows: InventoryRow[];
  isAdmin: boolean;
  showStore: boolean;
  onAdjust: (row: InventoryRow) => void;
}

function qtyColor(n: number) {
  if (n <= 0)  return 'text-red-600 bg-red-50';
  if (n <= 10) return 'text-amber-600 bg-amber-50';
  return 'text-green-600 bg-green-50';
}

export function InventoryTable({ rows, isAdmin, showStore, onAdjust }: Props) {
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="h-12 w-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm font-medium">No inventory records</p>
        <p className="text-xs mt-1">Adjust stock to create inventory entries</p>
      </div>
    );
  }

  const available = (r: InventoryRow) => r.quantity - r.reservedQuantity;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Variant</th>
            {showStore && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Store</th>}
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">On Hand</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Reserved</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Available</th>
            {isAdmin && <th className="px-4 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{row.product.name}</p>
                  {row.product.sku && <p className="text-xs text-gray-400 font-mono mt-0.5">{row.product.sku}</p>}
                </div>
              </td>
              <td className="px-4 py-3">
                {row.variant ? (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(row.variant.attributes).map(([k, v]) => (
                      <span key={k} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                ) : <span className="text-gray-300 text-xs">—</span>}
              </td>
              {showStore && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">{row.store.name}</span>
                    {row.store.isDefault && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Default</span>}
                  </div>
                </td>
              )}
              <td className="px-4 py-3 text-right">
                <span className={`inline-flex items-center justify-center w-14 py-0.5 rounded-lg text-sm font-semibold ${qtyColor(row.quantity)}`}>
                  {row.quantity}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-500">{row.reservedQuantity}</td>
              <td className="px-4 py-3 text-right">
                <span className={`inline-flex items-center justify-center w-14 py-0.5 rounded-lg text-sm font-semibold ${qtyColor(available(row))}`}>
                  {available(row)}
                </span>
              </td>
              {isAdmin && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      href={`/inventory/ledger?storeId=${row.storeId}&productId=${row.productId}${row.variantId ? `&variantId=${row.variantId}` : ''}`}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Ledger
                    </Link>
                    <button onClick={() => onAdjust(row)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">
                      Adjust
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

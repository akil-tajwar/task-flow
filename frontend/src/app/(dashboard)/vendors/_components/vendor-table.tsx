'use client';

import Link         from 'next/link';
import type { Vendor } from '@/types';

function Avatar({ name }: { name: string }) {
  const colors = ['bg-blue-100 text-blue-700', 'bg-teal-100 text-teal-700', 'bg-orange-100 text-orange-700', 'bg-purple-100 text-purple-700'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${color}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const fmtBal = (n: number) =>
  `$${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  vendors:    Vendor[];
  isAdmin:    boolean;
  balances:   Record<string, number>;
  onEdit:             (v: Vendor) => void;
  onDelete:           (v: Vendor) => void;
  onOpeningBalance:   (v: Vendor) => void;
  deletingId: string | null;
}

export function VendorTable({ vendors, isAdmin, balances, onEdit, onDelete, onOpeningBalance, deletingId }: Props) {
  if (!vendors.length) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gray-100 mb-4">
          <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No vendors yet</p>
        {isAdmin && <p className="text-gray-400 text-sm mt-1">Click &ldquo;Add Vendor&rdquo; to get started</p>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            {['Vendor', 'Contact', 'Email', 'Phone', 'Location', 'Balance', 'Status', ...(isAdmin ? ['Actions'] : [])].map((h) => (
              <th key={h} className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Actions' || h === 'Balance' ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {vendors.map((v) => {
            const bal = balances[v.id] ?? 0;
            return (
              <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={v.name} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{v.name}</p>
                      {v.taxId && <p className="text-xs text-gray-400 mt-0.5">VAT: {v.taxId}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{v.contactPerson ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {v.email ? (
                    <a href={`mailto:${v.email}`} className="hover:text-indigo-600 transition-colors">{v.email}</a>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{v.phone ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {[v.city, v.country].filter(Boolean).join(', ') || <span className="text-gray-300">—</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  {bal > 0 ? (
                    <span className="text-sm font-bold text-red-600">{fmtBal(bal)}</span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${v.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {v.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onOpeningBalance(v)}
                        className="text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
                      >
                        Balance
                      </button>
                      <span className="text-gray-200">|</span>
                      <Link
                        href={`/vendors/${v.id}/ledger`}
                        className="text-xs font-medium text-violet-600 hover:text-violet-800 transition-colors"
                      >
                        Ledger
                      </Link>
                      <span className="text-gray-200">|</span>
                      <button onClick={() => onEdit(v)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900 transition-colors">Edit</button>
                      <span className="text-gray-200">|</span>
                      <button onClick={() => onDelete(v)} disabled={deletingId === v.id}
                        className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
                        {deletingId === v.id ? 'Removing…' : 'Remove'}
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

'use client';

import type { Customer } from '@/types';

function Avatar({ name }: { name: string }) {
  const colors = ['bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700', 'bg-lime-100 text-lime-700', 'bg-violet-100 text-violet-700'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${color}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const fmtBal = (n: number) =>
  `$${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  customers:        Customer[];
  isAdmin:          boolean;
  balances:         Record<string, number>;
  onEdit:           (c: Customer) => void;
  onDelete:         (c: Customer) => void;
  onOpeningBalance: (c: Customer) => void;
  deletingId:       string | null;
}

export function CustomerTable({ customers, isAdmin, balances, onEdit, onDelete, onOpeningBalance, deletingId }: Props) {
  if (!customers.length) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gray-100 mb-4">
          <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No customers yet</p>
        <p className="text-gray-400 text-sm mt-1">Click &ldquo;Add Customer&rdquo; to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            {['Customer', 'Email', 'Phone', 'Location', 'Loyalty', 'Balance', 'Status', ...(isAdmin ? ['Actions'] : [])].map((h) => (
              <th key={h} className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Actions' || h === 'Balance' ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {customers.map((c) => {
            const bal = balances[c.id] ?? 0;
            return (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      {c.taxId && <p className="text-xs text-gray-400 mt-0.5">Tax: {c.taxId}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="hover:text-indigo-600 transition-colors">{c.email}</a>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.phone ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {[c.city, c.country].filter(Boolean).join(', ') || <span className="text-gray-300">—</span>}
                </td>
                <td className="px-6 py-4">
                  {c.loyaltyPoints > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {c.loyaltyPoints} pts
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">0 pts</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {bal > 0 ? (
                    <span className="text-sm font-bold text-orange-600">{fmtBal(bal)}</span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${c.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onOpeningBalance(c)}
                        className="text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
                      >
                        Balance
                      </button>
                      <span className="text-gray-200">|</span>
                      <button onClick={() => onEdit(c)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900 transition-colors">Edit</button>
                      <span className="text-gray-200">|</span>
                      <button onClick={() => onDelete(c)} disabled={deletingId === c.id}
                        className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
                        {deletingId === c.id ? 'Removing…' : 'Remove'}
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

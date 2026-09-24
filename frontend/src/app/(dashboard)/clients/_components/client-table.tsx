'use client';

import type { Client } from '@/types/client';

function Avatar({ name }: { name: string }) {
  const colors = ['bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700', 'bg-lime-100 text-lime-700', 'bg-violet-100 text-violet-700'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${color}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

interface Props {
  clients:    Client[];
  isAdmin:    boolean;
  onEdit:     (c: Client) => void;
  onDelete:   (c: Client) => void;
  deletingId: string | null;
}

export function ClientTable({ clients, isAdmin, onEdit, onDelete, deletingId }: Props) {
  if (!clients.length) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gray-100 mb-4">
          <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No clients yet</p>
        <p className="text-gray-400 text-sm mt-1">Click &ldquo;Add Client&rdquo; to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            {['Client', 'Email', 'Phone', 'Location', 'Industry', ...(isAdmin ? ['Actions'] : [])].map((h) => (
              <th key={h} className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {clients.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} />
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                <a href={`mailto:${c.email}`} className="hover:text-indigo-600 transition-colors">{c.email}</a>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">{c.phone ?? <span className="text-gray-300">—</span>}</td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {[c.city, c.country].filter(Boolean).join(', ') || <span className="text-gray-300">—</span>}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{c.industry ?? <span className="text-gray-300">—</span>}</td>
              {isAdmin && (
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
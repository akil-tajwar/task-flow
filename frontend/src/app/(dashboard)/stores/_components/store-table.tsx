import type { Store } from '@/types';

interface Props {
  stores: Store[];
  isAdmin: boolean;
  onEdit: (s: Store) => void;
  onDelete: (s: Store) => void;
  onSetDefault: (s: Store) => void;
}

const storeBg = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-cyan-500'];
function storeColor(name: string) { return storeBg[name.charCodeAt(0) % storeBg.length]; }

export function StoreTable({ stores, isAdmin, onEdit, onDelete, onSetDefault }: Props) {
  if (!stores.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="h-12 w-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
        </svg>
        <p className="text-sm font-medium">No stores yet</p>
        <p className="text-xs mt-1">Add your first store to start tracking inventory</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {['Store', 'Code', 'Location', 'Phone', 'Status', ''].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {stores.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 h-9 w-9 rounded-lg ${storeColor(s.name)} flex items-center justify-center text-white text-sm font-bold`}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{s.name}</span>
                      {s.isDefault && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">Default</span>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">{s.code}</code>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {[s.city, s.country].filter(Boolean).join(', ') || <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {s.phone || <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-3">
                {isAdmin && (
                  <div className="flex items-center justify-end gap-1">
                    {!s.isDefault && (
                      <button onClick={() => onSetDefault(s)} title="Set as default"
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" /></svg>
                      </button>
                    )}
                    <button onClick={() => onEdit(s)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => onDelete(s)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

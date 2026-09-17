'use client';

import { useState } from 'react';
import {
  useExpenseHeads,
  useCreateExpenseHead,
  useUpdateExpenseHead,
  useDeleteExpenseHead,
} from '@/hooks/use-expenses';
import type { ExpenseHead } from '@/types';

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

// ─── Form (create / edit) ─────────────────────────────────────────────────────

function HeadForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: ExpenseHead;
  onSave: (v: { name: string; description: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName]   = useState(initial?.name ?? '');
  const [desc, setDesc]   = useState(initial?.description ?? '');

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave({ name: name.trim(), description: desc.trim() }); }}
      className="space-y-3"
    >
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rent, Salaries, Utilities…"
          className={inputCls} required autoFocus
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
        <textarea
          value={desc} onChange={(e) => setDesc(e.target.value)}
          rows={2} placeholder="Optional description"
          className={`${inputCls} resize-none`}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving || !name.trim()}
          className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors">
          {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpenseHeadsPage() {
  const [showInactive, setShowInactive] = useState(false);
  const { data: heads = [], isLoading }  = useExpenseHeads(showInactive);

  const createHead = useCreateExpenseHead();
  const updateHead = useUpdateExpenseHead();
  const deleteHead = useDeleteExpenseHead();

  const [showForm,  setShowForm]  = useState(false);
  const [editHead,  setEditHead]  = useState<ExpenseHead | null>(null);
  const [formError, setFormError] = useState('');

  function openCreate() { setEditHead(null); setFormError(''); setShowForm(true); }
  function openEdit(h: ExpenseHead) { setEditHead(h); setFormError(''); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditHead(null); setFormError(''); }

  async function handleSave(vals: { name: string; description: string }) {
    setFormError('');
    try {
      if (editHead) {
        await updateHead.mutateAsync({ id: editHead.id, ...vals });
      } else {
        await createHead.mutateAsync(vals);
      }
      closeForm();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setFormError(msg ?? 'Failed to save.');
    }
  }

  async function handleDelete(h: ExpenseHead) {
    const inUse = (h.expenses?.length ?? 0) > 0;
    const verb  = inUse ? 'deactivate' : 'delete';
    if (!confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} expense head "${h.name}"?`)) return;
    try {
      await deleteHead.mutateAsync(h.id);
    } catch {
      alert('Failed to delete expense head.');
    }
  }

  async function toggleActive(h: ExpenseHead) {
    await updateHead.mutateAsync({ id: h.id, isActive: !h.isActive });
  }

  const saving = createHead.isPending || updateHead.isPending;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Heads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage expense categories</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600" />
            Show inactive
          </label>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Head
          </button>
        </div>
      </div>

      {/* Inline create / edit form */}
      {showForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-indigo-800 mb-4">
            {editHead ? `Edit — ${editHead.name}` : 'New Expense Head'}
          </h2>
          {formError && (
            <p className="mb-3 text-sm text-red-600 font-medium">{formError}</p>
          )}
          <HeadForm initial={editHead ?? undefined} onSave={handleSave} onCancel={closeForm} saving={saving} />
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Transactions</th>
              <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : heads.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-gray-400 text-sm">
                  No expense heads yet. Add one to get started.
                </td>
              </tr>
            ) : (
              heads.map((h) => (
                <tr key={h.id} className={`hover:bg-gray-50 transition-colors ${!h.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-900">{h.name}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">{h.description ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-sm font-bold text-gray-700">{h.expenses?.length ?? 0}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${h.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {h.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(h)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-800">Edit</button>
                      {h.isActive ? (
                        <button onClick={() => toggleActive(h)}
                          className="text-xs font-medium text-gray-400 hover:text-gray-600">Deactivate</button>
                      ) : (
                        <button onClick={() => toggleActive(h)}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-800">Activate</button>
                      )}
                      <button onClick={() => handleDelete(h)}
                        className="text-xs font-medium text-red-400 hover:text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

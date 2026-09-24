'use client';

import { useState, useEffect } from 'react';
import { useCreateProject, useUpdateProject } from '@/hooks/use-projects';
import { useClients } from '@/hooks/use-clients';
// Assumed hook, same pattern as useClients — adjust the import if your users hook differs.

import type { Project, ProjectStatus, BudgetType, DefaultView, CreateMilestoneInput } from '@/types/project';
import { useUsers } from '@/hooks/use-auth';

interface FormState {
  clientId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  defaultView: DefaultView;
  startDate: string;
  endDate: string;
  budgetType: BudgetType;
  budgetAmount: string;
  budgetHours: string;
  currency: string;
  isBillable: boolean;
  isTemplate: boolean;
  ownerId: string;
  color: string;
  tags: string[];
  memberIds: string[];
  milestones: CreateMilestoneInput[];
}

const EMPTY: FormState = {
  clientId: '', name: '', description: '', status: 'active', defaultView: 'board',
  startDate: '', endDate: '', budgetType: 'fixed_fee', budgetAmount: '', budgetHours: '',
  currency: 'USD', isBillable: true, isTemplate: false, ownerId: '', color: '#4F46E5',
  tags: [], memberIds: [], milestones: [],
};

function projectToForm(p: Project): FormState {
  return {
    clientId: p.clientId,
    name: p.name,
    description: p.description ?? '',
    status: p.status,
    defaultView: p.defaultView,
    startDate: p.startDate?.slice(0, 10) ?? '',
    endDate: p.endDate?.slice(0, 10) ?? '',
    budgetType: p.budgetType,
    budgetAmount: p.budgetAmount ?? '',
    budgetHours: p.budgetHours ?? '',
    currency: p.currency,
    isBillable: p.isBillable,
    isTemplate: p.isTemplate,
    ownerId: p.ownerId,
    color: p.color ?? '#4F46E5',
    tags: p.tags ?? [],
    memberIds: p.projectMembers.map((m) => m.userId),
    milestones: p.milestones
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({
        name: m.name,
        description: m.description ?? '',
        dueDate: m.dueDate?.slice(0, 10) ?? '',
        isCompleted: m.isCompleted,
        sortOrder: m.sortOrder,
      })),
  };
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400';
const selectCls = inputCls + ' bg-white';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

interface Props {
  open: boolean;
  project?: Project | null;
  onClose: () => void;
}

export function ProjectFormModal({ open, project, onClose }: Props) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(project ? projectToForm(project) : EMPTY);
    setTagInput('');
    setError('');
  }, [open, project]);

  const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));
  const isEditing = !!project;
  const isPending = createProject.isPending || updateProject.isPending;

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set({ tags: [...form.tags, t] });
    setTagInput('');
  };

  const toggleMember = (userId: string) => {
    set({
      memberIds: form.memberIds.includes(userId)
        ? form.memberIds.filter((id) => id !== userId)
        : [...form.memberIds, userId],
    });
  };

  const addMilestone = () => {
    set({
      milestones: [
        ...form.milestones,
        { name: '', description: '', dueDate: '', isCompleted: false, sortOrder: form.milestones.length + 1 },
      ],
    });
  };

  const updateMilestone = (index: number, patch: Partial<CreateMilestoneInput>) => {
    set({ milestones: form.milestones.map((m, i) => (i === index ? { ...m, ...patch } : m)) });
  };

  const removeMilestone = (index: number) => {
    set({ milestones: form.milestones.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // FIX 1: commit any tag text still sitting in the input box before we
    // validate/submit. Previously this was only added to form.tags on
    // Enter keydown, so clicking "Create project" right after typing a tag
    // (without pressing Enter) silently dropped it.
    const pendingTag = tagInput.trim();
    const finalTags = pendingTag && !form.tags.includes(pendingTag)
      ? [...form.tags, pendingTag]
      : form.tags;

    if (!form.name.trim()) { setError('Project name is required.'); return; }
    if (!form.clientId) { setError('Select a client.'); return; }
    if (!form.ownerId) { setError('Select an owner.'); return; }

    // FIX 2: previously, a milestone row added via "+ Add milestone" but
    // left with an empty name was silently filtered out on submit with no
    // feedback — so it looked like milestones just "didn't save". Now we
    // surface it as a validation error instead of silently dropping it.
    const hasEmptyMilestone = form.milestones.some((m) => !m.name.trim());
    if (hasEmptyMilestone) {
      setError('Every milestone needs a name — fill it in or remove the empty one.');
      return;
    }

    const base = {
      clientId: form.clientId,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      defaultView: form.defaultView,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      budgetType: form.budgetType,
      budgetAmount: form.budgetAmount || undefined,
      budgetHours: form.budgetHours || undefined,
      currency: form.currency,
      isBillable: form.isBillable,
      isTemplate: form.isTemplate,
      ownerId: form.ownerId,
      color: form.color,
      tags: finalTags, // <- was form.tags
      projectMembers: form.memberIds.map((userId) => ({ userId })),
      milestones: form.milestones
        .filter((m) => m.name.trim())
        .map((m, i) => ({ ...m, sortOrder: i + 1 })),
    };

    try {
      if (isEditing) {
        await updateProject.mutateAsync({ id: project.id, ...base });
      } else {
        await createProject.mutateAsync(base);
      }
      // keep tags/milestones in sync with what was actually submitted,
      // in case onClose() doesn't unmount immediately
      set({ tags: finalTags });
      setTagInput('');
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err instanceof Error ? err.message : 'Something went wrong.');
      setError(msg);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? 'Edit Project' : 'New Project'}
            </h2>
            {isEditing && <p className="text-xs text-gray-400 mt-0.5">{project.name}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form id="project-form" onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</h3>
            <div className="space-y-3">
              <Field label="Project Name" required>
                <input value={form.name} onChange={(e) => set({ name: e.target.value })}
                  placeholder="e.g. E-Commerce Platform Development" className={inputCls} name="project_name" autoComplete="off" required />
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => set({ description: e.target.value })}
                  rows={3} placeholder="What is this project about…" className={inputCls} name="project_description" autoComplete="off" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Client" required>
                  <select value={form.clientId} onChange={(e) => set({ clientId: e.target.value })} className={selectCls} required>
                    <option value="">Select client…</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Owner" required>
                  <select value={form.ownerId} onChange={(e) => set({ ownerId: e.target.value })} className={selectCls} required>
                    <option value="">Select owner…</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Status">
                  <select value={form.status} onChange={(e) => set({ status: e.target.value as ProjectStatus })} className={selectCls}>
                    <option value="active">Active</option>
                    <option value="on_hold">On hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
                <Field label="Default View">
                  <select value={form.defaultView} onChange={(e) => set({ defaultView: e.target.value as DefaultView })} className={selectCls}>
                    <option value="board">Board</option>
                    <option value="list">List</option>
                    <option value="calendar">Calendar</option>
                  </select>
                </Field>
                <Field label="Color">
                  <input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })}
                    className="w-full h-[38px] border border-gray-300 rounded-lg cursor-pointer" />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Schedule</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date">
                <input type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inputCls} />
              </Field>
              <Field label="End Date">
                <input type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} className={inputCls} />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Budget</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget Type">
                <select value={form.budgetType} onChange={(e) => set({ budgetType: e.target.value as BudgetType })} className={selectCls}>
                  <option value="fixed_fee">Fixed fee</option>
                  <option value="hourly">Hourly</option>
                  <option value="retainer">Retainer</option>
                  <option value="non_billable">Non-billable</option>
                </select>
              </Field>
              <Field label="Currency">
                <input value={form.currency} onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
                  placeholder="USD" maxLength={3} className={inputCls} />
              </Field>
              <Field label="Budget Amount">
                <input type="number" step="0.01" value={form.budgetAmount} onChange={(e) => set({ budgetAmount: e.target.value })}
                  placeholder="8500.00" className={inputCls} />
              </Field>
              <Field label="Budget Hours">
                <input type="number" step="0.01" value={form.budgetHours} onChange={(e) => set({ budgetHours: e.target.value })}
                  placeholder="420.00" className={inputCls} />
              </Field>
            </div>
            <div className="flex items-center gap-6 mt-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isBillable} onChange={(e) => set({ isBillable: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                Billable
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.isTemplate} onChange={(e) => set({ isTemplate: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                Save as template
              </label>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">
                  {t}
                  <button type="button" onClick={() => set({ tags: form.tags.filter((x) => x !== t) })} className="hover:text-indigo-900">×</button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              onBlur={addTag}
              placeholder="Type a tag and press Enter"
              className={inputCls}
            />
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Members</h3>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={form.memberIds.includes(u.id)} onChange={() => toggleMember(u.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  {u.name}
                </label>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Milestones</h3>
              <button type="button" onClick={addMilestone} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                + Add milestone
              </button>
            </div>
            <div className="space-y-3">
              {form.milestones.map((m, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={m.name}
                      onChange={(e) => updateMilestone(i, { name: e.target.value })}
                      placeholder={`Milestone ${i + 1} name`}
                      className={inputCls + ' flex-1'}
                    />
                    <input
                      type="date"
                      value={m.dueDate ?? ''}
                      onChange={(e) => updateMilestone(i, { dueDate: e.target.value })}
                      className={inputCls + ' w-40'}
                    />
                    <button type="button" onClick={() => removeMilestone(i)} className="text-red-500 hover:text-red-700 px-1">
                      ×
                    </button>
                  </div>
                  <input
                    value={m.description ?? ''}
                    onChange={(e) => updateMilestone(i, { description: e.target.value })}
                    placeholder="Description (optional)"
                    className={inputCls}
                  />
                </div>
              ))}
              {form.milestones.length === 0 && (
                <p className="text-sm text-gray-400">No milestones yet.</p>
              )}
            </div>
          </section>
        </form>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button form="project-form" type="submit" disabled={isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  );
}



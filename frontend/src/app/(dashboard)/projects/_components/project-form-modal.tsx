'use client';

import { useState, useEffect, useRef } from 'react';
import { useCreateProject, useUpdateProject } from '@/hooks/use-projects';
import { useClients } from '@/hooks/use-clients';
// Assumed hook, same pattern as useClients — adjust the import if your users hook differs.

import type {
  Project,
  ProjectStatus,
  BudgetType,
  DefaultView,
  CreateMilestoneInput,
} from '@/types/project';
import { useUsers } from '@/hooks/use-auth';

// A member row in the form is either an existing user (picked from the
// dropdown) or a brand-new user to be created inline — mirrors the
// isNewMember branch of CreateProjectMemberInput on the backend.
type MemberSelection =
  | { kind: 'existing'; userId: string }
  | { kind: 'new'; tempId: string; name: string; email: string; password: string };

interface FormState {
  clientId: string; // '' means "no client" — sent as undefined on submit
  name: string;
  description: string;
  status: ProjectStatus;
  defaultView: DefaultView;
  startDate: string;
  endDate: string;
  budgetType: BudgetType | '';
  budgetAmount: string;
  budgetHours: string;
  currency: string;
  isBillable: boolean;
  isTemplate: boolean;
  ownerId: string; // '' means "no owner" — sent as undefined on submit
  color: string;
  tags: string[];
  members: MemberSelection[];
  milestones: CreateMilestoneInput[];
}

const EMPTY_NEW_MEMBER = { name: '', email: '', password: '' };

const EMPTY: FormState = {
  clientId: '', name: '', description: '', status: 'active', defaultView: 'list',
  startDate: '', endDate: '', budgetType: 'fixed_fee', budgetAmount: '', budgetHours: '',
  currency: 'USD', isBillable: true, isTemplate: false, ownerId: '', color: '#4F46E5',
  tags: [], members: [], milestones: [],
};

function projectToForm(p: Project): FormState {
  return {
    clientId: p.clientId ?? '',
    name: p.name,
    description: p.description ?? '',
    status: p.status,
    defaultView: p.defaultView,
    startDate: p.startDate?.slice(0, 10) ?? '',
    endDate: p.endDate?.slice(0, 10) ?? '',
    budgetType: p.budgetType ?? '',
    budgetAmount: p.budgetAmount ?? '',
    budgetHours: p.budgetHours ?? '',
    currency: p.currency ?? 'USD',
    isBillable: p.isBillable,
    isTemplate: p.isTemplate,
    ownerId: p.ownerId ?? '',
    color: p.color ?? '#4F46E5',
    tags: p.tags ?? [],
    members: p.projectMembers.map((m) => ({ kind: 'existing' as const, userId: m.userId })),
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

  // System roles: 'admin' | 'user' | 'client'.
  // Owner dropdown: admins only.
  const admins = users.filter((u) => u.role === 'admin');
  // Members dropdown: role 'user' only (no admins, no clients).
  const memberCandidates = users.filter((u) => u.role === 'user');

  const [form, setForm] = useState<FormState>(EMPTY);
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState('');

  // Member picker state
  const [memberMenuOpen, setMemberMenuOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMember, setNewMember] = useState(EMPTY_NEW_MEMBER);
  const [showNewMemberPassword, setShowNewMemberPassword] = useState(false);
  const memberMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(project ? projectToForm(project) : EMPTY);
    setTagInput('');
    setError('');
    setMemberMenuOpen(false);
    setAddMemberOpen(false);
    setNewMember(EMPTY_NEW_MEMBER);
    setShowNewMemberPassword(false);
  }, [open, project]);

  // Close the member dropdown when clicking outside it.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (memberMenuRef.current && !memberMenuRef.current.contains(e.target as Node)) {
        setMemberMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));
  const isEditing = !!project;
  const isPending = createProject.isPending || updateProject.isPending;

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set({ tags: [...form.tags, t] });
    setTagInput('');
  };

  const isExistingSelected = (userId: string) =>
    form.members.some((m) => m.kind === 'existing' && m.userId === userId);

  const toggleExistingMember = (userId: string) => {
    set({
      members: isExistingSelected(userId)
        ? form.members.filter((m) => !(m.kind === 'existing' && m.userId === userId))
        : [...form.members, { kind: 'existing', userId }],
    });
  };

  const removeMember = (target: MemberSelection) => {
    set({
      members: form.members.filter((m) =>
        target.kind === 'existing'
          ? !(m.kind === 'existing' && m.userId === target.userId)
          : !(m.kind === 'new' && m.tempId === target.tempId)
      ),
    });
  };

  const handleAddNewMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim() || !newMember.password.trim()) {
      setError('Name, email and password are required to add a new member.');
      return;
    }
    set({
      members: [
        ...form.members,
        {
          kind: 'new',
          tempId: crypto.randomUUID(),
          name: newMember.name.trim(),
          email: newMember.email.trim(),
          password: newMember.password,
        },
      ],
    });
    setNewMember(EMPTY_NEW_MEMBER);
    setAddMemberOpen(false);
    setShowNewMemberPassword(false);
    setError('');
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

    // Commit any tag text still sitting in the input box before we
    // validate/submit, so a tag typed without pressing Enter isn't dropped.
    const pendingTag = tagInput.trim();
    const finalTags = pendingTag && !form.tags.includes(pendingTag)
      ? [...form.tags, pendingTag]
      : form.tags;

    if (!form.name.trim()) { setError('Project name is required.'); return; }
    // Client is optional. Owner is required and must be an admin.
    if (!form.ownerId) { setError('Select an owner.'); return; }

    // Surface empty milestones as a validation error instead of silently
    // dropping them on submit.
    const hasEmptyMilestone = form.milestones.some((m) => !m.name.trim());
    if (hasEmptyMilestone) {
      setError('Every milestone needs a name — fill it in or remove the empty one.');
      return;
    }

    const base = {
      clientId: form.clientId || undefined,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      defaultView: form.defaultView,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      budgetType: form.budgetType || undefined,
      budgetAmount: form.budgetAmount || undefined,
      budgetHours: form.budgetHours || undefined,
      currency: form.currency,
      isBillable: form.isBillable,
      isTemplate: form.isTemplate,
      ownerId: form.ownerId || undefined,
      color: form.color,
      tags: finalTags,
      projectMembers: form.members.map((m) =>
        m.kind === 'existing'
          ? { userId: m.userId }
          : { isNewMember: true as const, name: m.name, email: m.email, password: m.password }
      ),
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
      // keep tags in sync with what was actually submitted, in case
      // onClose() doesn't unmount immediately
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
                <Field label="Client">
                  <select value={form.clientId} onChange={(e) => set({ clientId: e.target.value })} className={selectCls}>
                    <option value="">No client</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Owner" required>
                  <select value={form.ownerId} onChange={(e) => set({ ownerId: e.target.value })} className={selectCls} required>
                    <option value="">Select owner…</option>
                    {admins.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
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
                    <option value="cancelled">Cancelled</option>
                  </select>
                </Field>
                <Field label="Default View">
                  <select value={form.defaultView} onChange={(e) => set({ defaultView: e.target.value as DefaultView })} className={selectCls}>
                    <option value="list">List</option>
                    <option value="table">Table</option>
                    <option value="board">Board</option>
                    <option value="gantt">Gantt</option>
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
                <select value={form.budgetType} onChange={(e) => set({ budgetType: e.target.value as BudgetType | '' })} className={selectCls}>
                  <option value="">No budget type</option>
                  <option value="time">Time</option>
                  <option value="financial">Financial</option>
                  <option value="fixed_fee">Fixed fee</option>
                  <option value="task_list">Task list</option>
                  <option value="expense">Expense</option>
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

            <div className="relative" ref={memberMenuRef}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMemberMenuOpen((o) => !o)}
                  className={selectCls + ' flex items-center justify-between text-left'}
                >
                  <span className={form.members.length === 0 ? 'text-gray-400' : ''}>
                    {form.members.length === 0
                      ? 'Select members…'
                      : `${form.members.length} member${form.members.length !== 1 ? 's' : ''} selected`}
                  </span>
                  <svg className={`h-4 w-4 text-gray-400 transition-transform ${memberMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setAddMemberOpen((o) => !o)}
                  title="Add a brand new member"
                  className="flex-shrink-0 h-[38px] w-[38px] flex items-center justify-center rounded-lg border border-gray-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {memberMenuOpen && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg p-2 space-y-0.5">
                  {memberCandidates.length === 0 ? (
                    <p className="text-sm text-gray-400 px-2 py-1.5">No users yet.</p>
                  ) : (
                    memberCandidates.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isExistingSelected(u.id)}
                          onChange={() => toggleExistingMember(u.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {u.name}
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {addMemberOpen && (
              <div className="mt-2 border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                <p className="text-xs font-medium text-gray-500">Invite a brand new member</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={newMember.name}
                    onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Name"
                    className={inputCls}
                  />
                  <input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Email"
                    className={inputCls}
                  />
                  <div className="relative">
                    <input
                      type={showNewMemberPassword ? 'text' : 'password'}
                      value={newMember.password}
                      onChange={(e) => setNewMember((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Password"
                      className={inputCls + ' pr-9'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewMemberPassword((s) => !s)}
                      tabIndex={-1}
                      title={showNewMemberPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showNewMemberPassword ? (
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                          <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                          <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.147.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setAddMemberOpen(false); setNewMember(EMPTY_NEW_MEMBER); setShowNewMemberPassword(false); }}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewMember}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Add member
                  </button>
                </div>
              </div>
            )}

            {form.members.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.members.map((m) => (
                  <span
                    key={m.kind === 'existing' ? m.userId : m.tempId}
                    className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full"
                  >
                    {m.kind === 'existing'
                      ? users.find((u) => u.id === m.userId)?.name ?? 'Member'
                      : `${m.name} (new)`}
                    <button type="button" onClick={() => removeMember(m)} className="hover:text-indigo-900">×</button>
                  </span>
                ))}
              </div>
            )}
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
                  <div className="flex items-end gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs text-gray-500 mb-1">
                        Milestone name<span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <input
                        value={m.name}
                        onChange={(e) => updateMilestone(i, { name: e.target.value })}
                        placeholder={`Milestone ${i + 1} name`}
                        className={inputCls}
                      />
                    </div>
                    <div className="w-40 flex-shrink-0">
                      <label className="block text-xs text-gray-500 mb-1">Due date</label>
                      <input
                        type="date"
                        value={m.dueDate ?? ''}
                        onChange={(e) => updateMilestone(i, { dueDate: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <button type="button" onClick={() => removeMilestone(i)} className="text-red-500 hover:text-red-700 px-1 pb-2 flex-shrink-0">
                      ×
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <input
                      value={m.description ?? ''}
                      onChange={(e) => updateMilestone(i, { description: e.target.value })}
                      placeholder="Description (optional)"
                      className={inputCls}
                    />
                  </div>
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



// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import { useCreateProject, useUpdateProject } from '@/hooks/use-projects';
// import { useClients } from '@/hooks/use-clients';
// // Assumed hook, same pattern as useClients — adjust the import if your users hook differs.

// import type {
//   Project,
//   ProjectStatus,
//   BudgetType,
//   DefaultView,
//   CreateMilestoneInput,
// } from '@/types/project';
// import { useUsers } from '@/hooks/use-auth';

// // A member row in the form is either an existing user (picked from the
// // dropdown) or a brand-new user to be created inline — mirrors the
// // isNewMember branch of CreateProjectMemberInput on the backend.
// type MemberSelection =
//   | { kind: 'existing'; userId: string }
//   | { kind: 'new'; tempId: string; name: string; email: string; password: string };

// interface FormState {
//   clientId: string; // '' means "no client" — sent as undefined on submit
//   name: string;
//   description: string;
//   status: ProjectStatus;
//   defaultView: DefaultView;
//   startDate: string;
//   endDate: string;
//   budgetType: BudgetType | '';
//   budgetAmount: string;
//   budgetHours: string;
//   currency: string;
//   isBillable: boolean;
//   isTemplate: boolean;
//   ownerId: string; // '' means "no owner" — sent as undefined on submit
//   color: string;
//   tags: string[];
//   members: MemberSelection[];
//   milestones: CreateMilestoneInput[];
// }

// const EMPTY_NEW_MEMBER = { name: '', email: '', password: '' };

// const EMPTY: FormState = {
//   clientId: '', name: '', description: '', status: 'active', defaultView: 'list',
//   startDate: '', endDate: '', budgetType: 'fixed_fee', budgetAmount: '', budgetHours: '',
//   currency: 'USD', isBillable: true, isTemplate: false, ownerId: '', color: '#4F46E5',
//   tags: [], members: [], milestones: [],
// };

// function projectToForm(p: Project): FormState {
//   return {
//     clientId: p.clientId ?? '',
//     name: p.name,
//     description: p.description ?? '',
//     status: p.status,
//     defaultView: p.defaultView,
//     startDate: p.startDate?.slice(0, 10) ?? '',
//     endDate: p.endDate?.slice(0, 10) ?? '',
//     budgetType: p.budgetType ?? '',
//     budgetAmount: p.budgetAmount ?? '',
//     budgetHours: p.budgetHours ?? '',
//     currency: p.currency ?? 'USD',
//     isBillable: p.isBillable,
//     isTemplate: p.isTemplate,
//     ownerId: p.ownerId ?? '',
//     color: p.color ?? '#4F46E5',
//     tags: p.tags ?? [],
//     members: p.projectMembers.map((m) => ({ kind: 'existing' as const, userId: m.userId })),
//     milestones: p.milestones
//       .sort((a, b) => a.sortOrder - b.sortOrder)
//       .map((m) => ({
//         name: m.name,
//         description: m.description ?? '',
//         dueDate: m.dueDate?.slice(0, 10) ?? '',
//         isCompleted: m.isCompleted,
//         sortOrder: m.sortOrder,
//       })),
//   };
// }

// const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400';
// const selectCls = inputCls + ' bg-white';

// function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
//   return (
//     <div>
//       <label className="block text-sm font-medium text-gray-700 mb-1">
//         {label}{required && <span className="text-red-500 ml-0.5">*</span>}
//       </label>
//       {children}
//     </div>
//   );
// }

// interface Props {
//   open: boolean;
//   project?: Project | null;
//   onClose: () => void;
// }

// export function ProjectFormModal({ open, project, onClose }: Props) {
//   const createProject = useCreateProject();
//   const updateProject = useUpdateProject();
//   const { data: clients = [] } = useClients();
//   const { data: users = [] } = useUsers();

//   const [form, setForm] = useState<FormState>(EMPTY);
//   const [tagInput, setTagInput] = useState('')
//   const [error, setError] = useState('');

//   // Member picker state
//   const [memberMenuOpen, setMemberMenuOpen] = useState(false);
//   const [addMemberOpen, setAddMemberOpen] = useState(false);
//   const [newMember, setNewMember] = useState(EMPTY_NEW_MEMBER);
//   const [showNewMemberPassword, setShowNewMemberPassword] = useState(false);
//   const memberMenuRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!open) return;
//     setForm(project ? projectToForm(project) : EMPTY);
//     setTagInput('');
//     setError('');
//     setMemberMenuOpen(false);
//     setAddMemberOpen(false);
//     setNewMember(EMPTY_NEW_MEMBER);
//     setShowNewMemberPassword(false);
//   }, [open, project]);

//   // Close the member dropdown when clicking outside it.
//   useEffect(() => {
//     function handleClickOutside(e: MouseEvent) {
//       if (memberMenuRef.current && !memberMenuRef.current.contains(e.target as Node)) {
//         setMemberMenuOpen(false);
//       }
//     }
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));
//   const isEditing = !!project;
//   const isPending = createProject.isPending || updateProject.isPending;

//   const addTag = () => {
//     const t = tagInput.trim();
//     if (t && !form.tags.includes(t)) set({ tags: [...form.tags, t] });
//     setTagInput('');
//   };

//   const isExistingSelected = (userId: string) =>
//     form.members.some((m) => m.kind === 'existing' && m.userId === userId);

//   const toggleExistingMember = (userId: string) => {
//     set({
//       members: isExistingSelected(userId)
//         ? form.members.filter((m) => !(m.kind === 'existing' && m.userId === userId))
//         : [...form.members, { kind: 'existing', userId }],
//     });
//   };

//   const removeMember = (target: MemberSelection) => {
//     set({
//       members: form.members.filter((m) =>
//         target.kind === 'existing'
//           ? !(m.kind === 'existing' && m.userId === target.userId)
//           : !(m.kind === 'new' && m.tempId === target.tempId)
//       ),
//     });
//   };

//   const handleAddNewMember = () => {
//     if (!newMember.name.trim() || !newMember.email.trim() || !newMember.password.trim()) {
//       setError('Name, email and password are required to add a new member.');
//       return;
//     }
//     set({
//       members: [
//         ...form.members,
//         {
//           kind: 'new',
//           tempId: crypto.randomUUID(),
//           name: newMember.name.trim(),
//           email: newMember.email.trim(),
//           password: newMember.password,
//         },
//       ],
//     });
//     setNewMember(EMPTY_NEW_MEMBER);
//     setAddMemberOpen(false);
//     setShowNewMemberPassword(false);
//     setError('');
//   };

//   const addMilestone = () => {
//     set({
//       milestones: [
//         ...form.milestones,
//         { name: '', description: '', dueDate: '', isCompleted: false, sortOrder: form.milestones.length + 1 },
//       ],
//     });
//   };

//   const updateMilestone = (index: number, patch: Partial<CreateMilestoneInput>) => {
//     set({ milestones: form.milestones.map((m, i) => (i === index ? { ...m, ...patch } : m)) });
//   };

//   const removeMilestone = (index: number) => {
//     set({ milestones: form.milestones.filter((_, i) => i !== index) });
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError('');

//     // FIX 1: commit any tag text still sitting in the input box before we
//     // validate/submit. Previously this was only added to form.tags on
//     // Enter keydown, so clicking "Create project" right after typing a tag
//     // (without pressing Enter) silently dropped it.
//     const pendingTag = tagInput.trim();
//     const finalTags = pendingTag && !form.tags.includes(pendingTag)
//       ? [...form.tags, pendingTag]
//       : form.tags;

//     if (!form.name.trim()) { setError('Project name is required.'); return; }
//     // clientId/ownerId are nullable on the backend, but we still require
//     // them in this form as a business rule (a project needs an owner and
//     // a client in practice). Relax these two checks if that's not desired.
//     if (!form.clientId) { setError('Select a client.'); return; }
//     if (!form.ownerId) { setError('Select an owner.'); return; }

//     // FIX 2: previously, a milestone row added via "+ Add milestone" but
//     // left with an empty name was silently filtered out on submit with no
//     // feedback — so it looked like milestones just "didn't save". Now we
//     // surface it as a validation error instead of silently dropping it.
//     const hasEmptyMilestone = form.milestones.some((m) => !m.name.trim());
//     if (hasEmptyMilestone) {
//       setError('Every milestone needs a name — fill it in or remove the empty one.');
//       return;
//     }

//     const base = {
//       clientId: form.clientId || undefined,
//       name: form.name.trim(),
//       description: form.description.trim() || undefined,
//       status: form.status,
//       defaultView: form.defaultView,
//       startDate: form.startDate || undefined,
//       endDate: form.endDate || undefined,
//       budgetType: form.budgetType || undefined,
//       budgetAmount: form.budgetAmount || undefined,
//       budgetHours: form.budgetHours || undefined,
//       currency: form.currency,
//       isBillable: form.isBillable,
//       isTemplate: form.isTemplate,
//       ownerId: form.ownerId || undefined,
//       color: form.color,
//       tags: finalTags, // <- was form.tags
//       projectMembers: form.members.map((m) =>
//         m.kind === 'existing'
//           ? { userId: m.userId }
//           : { isNewMember: true as const, name: m.name, email: m.email, password: m.password }
//       ),
//       milestones: form.milestones
//         .filter((m) => m.name.trim())
//         .map((m, i) => ({ ...m, sortOrder: i + 1 })),
//     };

//     try {
//       if (isEditing) {
//         await updateProject.mutateAsync({ id: project.id, ...base });
//       } else {
//         await createProject.mutateAsync(base);
//       }
//       // keep tags in sync with what was actually submitted, in case
//       // onClose() doesn't unmount immediately
//       set({ tags: finalTags });
//       setTagInput('');
//       onClose();
//     } catch (err: unknown) {
//       const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
//         ?? (err instanceof Error ? err.message : 'Something went wrong.');
//       setError(msg);
//     }
//   };

//   if (!open) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

//       <div className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl">
//         <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
//           <div>
//             <h2 className="text-lg font-semibold text-gray-900">
//               {isEditing ? 'Edit Project' : 'New Project'}
//             </h2>
//             {isEditing && <p className="text-xs text-gray-400 mt-0.5">{project.name}</p>}
//           </div>
//           <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
//             <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//             </svg>
//           </button>
//         </div>

//         <form id="project-form" onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
//           {error && (
//             <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
//           )}

//           <section>
//             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</h3>
//             <div className="space-y-3">
//               <Field label="Project Name" required>
//                 <input value={form.name} onChange={(e) => set({ name: e.target.value })}
//                   placeholder="e.g. E-Commerce Platform Development" className={inputCls} name="project_name" autoComplete="off" required />
//               </Field>
//               <Field label="Description">
//                 <textarea value={form.description} onChange={(e) => set({ description: e.target.value })}
//                   rows={3} placeholder="What is this project about…" className={inputCls} name="project_description" autoComplete="off" />
//               </Field>
//               <div className="grid grid-cols-2 gap-3">
//                 <Field label="Client" required>
//                   <select value={form.clientId} onChange={(e) => set({ clientId: e.target.value })} className={selectCls} required>
//                     <option value="">Select client…</option>
//                     {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
//                   </select>
//                 </Field>
//                 <Field label="Owner" required>
//                   <select value={form.ownerId} onChange={(e) => set({ ownerId: e.target.value })} className={selectCls} required>
//                     <option value="">Select owner…</option>
//                     {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
//                   </select>
//                 </Field>
//               </div>
//               <div className="grid grid-cols-3 gap-3">
//                 <Field label="Status">
//                   <select value={form.status} onChange={(e) => set({ status: e.target.value as ProjectStatus })} className={selectCls}>
//                     <option value="active">Active</option>
//                     <option value="on_hold">On hold</option>
//                     <option value="completed">Completed</option>
//                     <option value="archived">Archived</option>
//                     <option value="cancelled">Cancelled</option>
//                   </select>
//                 </Field>
//                 <Field label="Default View">
//                   <select value={form.defaultView} onChange={(e) => set({ defaultView: e.target.value as DefaultView })} className={selectCls}>
//                     <option value="list">List</option>
//                     <option value="table">Table</option>
//                     <option value="board">Board</option>
//                     <option value="gantt">Gantt</option>
//                   </select>
//                 </Field>
//                 <Field label="Color">
//                   <input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })}
//                     className="w-full h-[38px] border border-gray-300 rounded-lg cursor-pointer" />
//                 </Field>
//               </div>
//             </div>
//           </section>

//           <section>
//             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Schedule</h3>
//             <div className="grid grid-cols-2 gap-3">
//               <Field label="Start Date">
//                 <input type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inputCls} />
//               </Field>
//               <Field label="End Date">
//                 <input type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} className={inputCls} />
//               </Field>
//             </div>
//           </section>

//           <section>
//             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Budget</h3>
//             <div className="grid grid-cols-2 gap-3">
//               <Field label="Budget Type">
//                 <select value={form.budgetType} onChange={(e) => set({ budgetType: e.target.value as BudgetType | '' })} className={selectCls}>
//                   <option value="">No budget type</option>
//                   <option value="time">Time</option>
//                   <option value="financial">Financial</option>
//                   <option value="fixed_fee">Fixed fee</option>
//                   <option value="task_list">Task list</option>
//                   <option value="expense">Expense</option>
//                 </select>
//               </Field>
//               <Field label="Currency">
//                 <input value={form.currency} onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
//                   placeholder="USD" maxLength={3} className={inputCls} />
//               </Field>
//               <Field label="Budget Amount">
//                 <input type="number" step="0.01" value={form.budgetAmount} onChange={(e) => set({ budgetAmount: e.target.value })}
//                   placeholder="8500.00" className={inputCls} />
//               </Field>
//               <Field label="Budget Hours">
//                 <input type="number" step="0.01" value={form.budgetHours} onChange={(e) => set({ budgetHours: e.target.value })}
//                   placeholder="420.00" className={inputCls} />
//               </Field>
//             </div>
//             <div className="flex items-center gap-6 mt-3">
//               <label className="flex items-center gap-2 text-sm text-gray-700">
//                 <input type="checkbox" checked={form.isBillable} onChange={(e) => set({ isBillable: e.target.checked })}
//                   className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
//                 Billable
//               </label>
//               <label className="flex items-center gap-2 text-sm text-gray-700">
//                 <input type="checkbox" checked={form.isTemplate} onChange={(e) => set({ isTemplate: e.target.checked })}
//                   className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
//                 Save as template
//               </label>
//             </div>
//           </section>

//           <section>
//             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tags</h3>
//             <div className="flex flex-wrap gap-2 mb-2">
//               {form.tags.map((t) => (
//                 <span key={t} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">
//                   {t}
//                   <button type="button" onClick={() => set({ tags: form.tags.filter((x) => x !== t) })} className="hover:text-indigo-900">×</button>
//                 </span>
//               ))}
//             </div>
//             <input
//               value={tagInput}
//               onChange={(e) => setTagInput(e.target.value)}
//               onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
//               onBlur={addTag}
//               placeholder="Type a tag and press Enter"
//               className={inputCls}
//             />
//           </section>

//           <section>
//             <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Members</h3>

//             <div className="relative" ref={memberMenuRef}>
//               <div className="flex items-center gap-2">
//                 <button
//                   type="button"
//                   onClick={() => setMemberMenuOpen((o) => !o)}
//                   className={selectCls + ' flex items-center justify-between text-left'}
//                 >
//                   <span className={form.members.length === 0 ? 'text-gray-400' : ''}>
//                     {form.members.length === 0
//                       ? 'Select members…'
//                       : `${form.members.length} member${form.members.length !== 1 ? 's' : ''} selected`}
//                   </span>
//                   <svg className={`h-4 w-4 text-gray-400 transition-transform ${memberMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
//                     <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
//                   </svg>
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => setAddMemberOpen((o) => !o)}
//                   title="Add a brand new member"
//                   className="flex-shrink-0 h-[38px] w-[38px] flex items-center justify-center rounded-lg border border-gray-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
//                 >
//                   <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                     <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
//                   </svg>
//                 </button>
//               </div>

//               {memberMenuOpen && (
//                 <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg p-2 space-y-0.5">
//                   {users.length === 0 ? (
//                     <p className="text-sm text-gray-400 px-2 py-1.5">No users yet.</p>
//                   ) : (
//                     users.map((u) => (
//                       <label key={u.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 text-sm text-gray-700 cursor-pointer">
//                         <input
//                           type="checkbox"
//                           checked={isExistingSelected(u.id)}
//                           onChange={() => toggleExistingMember(u.id)}
//                           className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
//                         />
//                         {u.name}
//                       </label>
//                     ))
//                   )}
//                 </div>
//               )}
//             </div>

//             {addMemberOpen && (
//               <div className="mt-2 border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
//                 <p className="text-xs font-medium text-gray-500">Invite a brand new member</p>
//                 <div className="grid grid-cols-3 gap-2">
//                   <input
//                     value={newMember.name}
//                     onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))}
//                     placeholder="Name"
//                     className={inputCls}
//                   />
//                   <input
//                     type="email"
//                     value={newMember.email}
//                     onChange={(e) => setNewMember((p) => ({ ...p, email: e.target.value }))}
//                     placeholder="Email"
//                     className={inputCls}
//                   />
//                   <div className="relative">
//                     <input
//                       type={showNewMemberPassword ? 'text' : 'password'}
//                       value={newMember.password}
//                       onChange={(e) => setNewMember((p) => ({ ...p, password: e.target.value }))}
//                       placeholder="Password"
//                       className={inputCls + ' pr-9'}
//                     />
//                     <button
//                       type="button"
//                       onClick={() => setShowNewMemberPassword((s) => !s)}
//                       tabIndex={-1}
//                       title={showNewMemberPassword ? 'Hide password' : 'Show password'}
//                       className="absolute inset-y-0 right-0 flex items-center px-2.5 text-gray-400 hover:text-gray-600"
//                     >
//                       {showNewMemberPassword ? (
//                         <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                           <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
//                           <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" />
//                         </svg>
//                       ) : (
//                         <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                           <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
//                           <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.147.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
//                         </svg>
//                       )}
//                     </button>
//                   </div>
//                 </div>
//                 <div className="flex justify-end gap-3">
//                   <button
//                     type="button"
//                     onClick={() => { setAddMemberOpen(false); setNewMember(EMPTY_NEW_MEMBER); setShowNewMemberPassword(false); }}
//                     className="text-xs font-medium text-gray-500 hover:text-gray-700"
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     type="button"
//                     onClick={handleAddNewMember}
//                     className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
//                   >
//                     Add member
//                   </button>
//                 </div>
//               </div>
//             )}

//             {form.members.length > 0 && (
//               <div className="flex flex-wrap gap-1.5 mt-2">
//                 {form.members.map((m) => (
//                   <span
//                     key={m.kind === 'existing' ? m.userId : m.tempId}
//                     className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full"
//                   >
//                     {m.kind === 'existing'
//                       ? users.find((u) => u.id === m.userId)?.name ?? 'Member'
//                       : `${m.name} (new)`}
//                     <button type="button" onClick={() => removeMember(m)} className="hover:text-indigo-900">×</button>
//                   </span>
//                 ))}
//               </div>
//             )}
//           </section>

//           <section>
//             <div className="flex items-center justify-between mb-3">
//               <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Milestones</h3>
//               <button type="button" onClick={addMilestone} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
//                 + Add milestone
//               </button>
//             </div>
//             <div className="space-y-3">
//               {form.milestones.map((m, i) => (
//                 <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
//                   <div className="flex items-end gap-2">
//                     <div className="flex-1 min-w-0">
//                       <label className="block text-xs text-gray-500 mb-1">
//                         Milestone name<span className="text-red-500 ml-0.5">*</span>
//                       </label>
//                       <input
//                         value={m.name}
//                         onChange={(e) => updateMilestone(i, { name: e.target.value })}
//                         placeholder={`Milestone ${i + 1} name`}
//                         className={inputCls}
//                       />
//                     </div>
//                     <div className="w-40 flex-shrink-0">
//                       <label className="block text-xs text-gray-500 mb-1">Due date</label>
//                       <input
//                         type="date"
//                         value={m.dueDate ?? ''}
//                         onChange={(e) => updateMilestone(i, { dueDate: e.target.value })}
//                         className={inputCls}
//                       />
//                     </div>
//                     <button type="button" onClick={() => removeMilestone(i)} className="text-red-500 hover:text-red-700 px-1 pb-2 flex-shrink-0">
//                       ×
//                     </button>
//                   </div>
//                   <div>
//                     <label className="block text-xs text-gray-500 mb-1">Description</label>
//                     <input
//                       value={m.description ?? ''}
//                       onChange={(e) => updateMilestone(i, { description: e.target.value })}
//                       placeholder="Description (optional)"
//                       className={inputCls}
//                     />
//                   </div>
//                 </div>
//               ))}
//               {form.milestones.length === 0 && (
//                 <p className="text-sm text-gray-400">No milestones yet.</p>
//               )}
//             </div>
//           </section>
//         </form>

//         <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
//           <button type="button" onClick={onClose}
//             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
//             Cancel
//           </button>
//           <button form="project-form" type="submit" disabled={isPending}
//             className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
//             {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create project'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }


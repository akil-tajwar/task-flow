'use client';

import { useState, useEffect } from 'react';
import { useCreateTask, useUpdateTask } from '@/hooks/use-tasks';
import type { Task, TaskStatus, TaskPriority } from '@/types/task';
import type { Project } from '@/types/project';

interface FormState {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  milestoneId: string;
  assigneeId: string;
  startDate: string;
  dueDate: string;
  estimatedHours: string;
  actualHours: string;
  isBillable: boolean;
  tagsInput: string;
}

const EMPTY: FormState = {
  title: '', description: '', status: 'todo', priority: 'medium',
  projectId: '', milestoneId: '', assigneeId: '',
  startDate: '', dueDate: '', estimatedHours: '', actualHours: '',
  isBillable: true, tagsInput: '',
};

function taskToForm(t: Task): FormState {
  return {
    title: t.title,
    description: t.description ?? '',
    status: t.status,
    priority: t.priority,
    projectId: t.projectId,
    milestoneId: t.milestoneId ?? '',
    assigneeId: t.assigneeId ?? '',
    startDate: t.startDate ?? '',
    dueDate: t.dueDate ?? '',
    estimatedHours: t.estimatedHours ?? '',
    actualHours: t.actualHours ?? '',
    isBillable: t.isBillable,
    tagsInput: t.tags?.join(', ') ?? '',
  };
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400';

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
  task?: Task | null;
  projects: Project[];
  defaultProjectId?: string;
  onClose: () => void;
}

export function TaskFormModal({ open, task, projects, defaultProjectId, onClose }: Props) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(task ? taskToForm(task) : { ...EMPTY, projectId: defaultProjectId ?? '' });
    setError('');
  }, [open, task, defaultProjectId]);

  const set = (patch: Partial<FormState>) => setForm((p) => ({ ...p, ...patch }));
  const isEditing = !!task;
  const isPending = createTask.isPending || updateTask.isPending;

  const selectedProject = projects.find((p) => p.id === form.projectId) ?? null;
  const milestoneOptions = selectedProject?.milestones ?? [];
  const memberOptions = selectedProject?.projectMembers ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Task title is required.'); return; }
    if (!form.projectId) { setError('Select a project.'); return; }

    const base = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      priority: form.priority,
      projectId: form.projectId,
      milestoneId: form.milestoneId || undefined,
      assigneeId: form.assigneeId || undefined,
      startDate: form.startDate || undefined,
      dueDate: form.dueDate || undefined,
      estimatedHours: form.estimatedHours || undefined,
      actualHours: form.actualHours || undefined,
      isBillable: form.isBillable,
      tags: form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    };

    try {
      if (isEditing) {
        await updateTask.mutateAsync({ id: task.id, ...base });
      } else {
        await createTask.mutateAsync(base);
      }
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

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{isEditing ? 'Edit Task' : 'New Task'}</h2>
            {isEditing && <p className="text-xs text-gray-400 mt-0.5">{task.title}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form id="task-form" onSubmit={handleSubmit} autoComplete="off" className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Basic Info</h3>
            <div className="space-y-3">
              <Field label="Title" required>
                <input value={form.title} onChange={(e) => set({ title: e.target.value })}
                  placeholder="e.g. Design landing page hero section" className={inputCls} name="task_title" />
              </Field>
              <Field label="Description">
                <textarea value={form.description} onChange={(e) => set({ description: e.target.value })}
                  rows={3} placeholder="What needs to be done…" className={inputCls} name="task_description" />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Classification</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Project" required>
                <select value={form.projectId} onChange={(e) => set({ projectId: e.target.value, milestoneId: '', assigneeId: '' })} className={inputCls}>
                  <option value="">Select project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Milestone">
                <select value={form.milestoneId} onChange={(e) => set({ milestoneId: e.target.value })} className={inputCls} disabled={!selectedProject}>
                  <option value="">No milestone</option>
                  {milestoneOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={(e) => set({ status: e.target.value as TaskStatus })} className={inputCls}>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                  <option value="blocked">Blocked</option>
                </select>
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={(e) => set({ priority: e.target.value as TaskPriority })} className={inputCls}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </Field>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Assignment & Timeline</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assignee">
                <select value={form.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })} className={inputCls} disabled={!selectedProject}>
                  <option value="">Unassigned</option>
                  {memberOptions.map((m) => <option key={m.userId} value={m.userId}>{m.memberName}</option>)}
                </select>
              </Field>
              <div className="flex items-end gap-2 pb-2">
                <input type="checkbox" checked={form.isBillable} onChange={(e) => set({ isBillable: e.target.checked })} id="isBillable" className="h-4 w-4" />
                <label htmlFor="isBillable" className="text-sm text-gray-700">Billable</label>
              </div>
              <Field label="Start Date">
                <input type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Due Date">
                <input type="date" value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Estimated Hours">
                <input type="number" step="0.5" value={form.estimatedHours} onChange={(e) => set({ estimatedHours: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Actual Hours">
                <input type="number" step="0.5" value={form.actualHours} onChange={(e) => set({ actualHours: e.target.value })} className={inputCls} />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tags</h3>
            <Field label="Tags (comma-separated)">
              <input value={form.tagsInput} onChange={(e) => set({ tagsInput: e.target.value })}
                placeholder="design, frontend, ui" className={inputCls} />
            </Field>
          </section>
        </form>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button form="task-form" type="submit" disabled={isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {isPending ? 'Saving…' : isEditing ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  );
}
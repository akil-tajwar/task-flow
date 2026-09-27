'use client';

import { useState } from 'react';
import { useSubmitTask } from '@/hooks/use-tasks';
import type { Task, TaskStatus, TaskPriority } from '@/types/task';

// No "todo" status on the backend — a task is created straight into
// "in_progress" and only ever moves between in_progress / in_review /
// done / blocked.
const STATUS_STYLES: Record<TaskStatus, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-purple-100 text-purple-700',
  done: 'bg-emerald-100 text-emerald-700',
  blocked: 'bg-red-100 text-red-700',
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

// Exported so TaskDetailModal can render the same badge.
export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLES[priority]}`}>
      {priority}
    </span>
  );
}

function formatDate(d?: string | null) {
  if (!d) return <span className="text-gray-300">—</span>;
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  tasks: Task[];
  assigneeNameById: Record<string, string>;
  onView: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  deletingId: string | null;
}

export function TaskTable({ tasks, assigneeNameById, onView, onEdit, onDelete, deletingId }: Props) {
  const submitTask = useSubmitTask();

  // Confirmation step before actually submitting a task for review.
  const [confirmSubmit, setConfirmSubmit] = useState<Task | null>(null);

  const handleConfirmSubmit = async () => {
    if (!confirmSubmit) return;
    const id = confirmSubmit.id;
    setConfirmSubmit(null);
    await submitTask.mutateAsync(id);
  };

  if (!tasks.length) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gray-100 mb-4">
          <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No tasks yet</p>
        <p className="text-gray-400 text-sm mt-1">Click &ldquo;New Task&rdquo; to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            {['Task', 'Status', 'Priority', 'Assignee', 'Due Date', 'Actions'].map((h) => (
              <th key={h} className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {tasks.map((t) => {
            const canSubmit = t.status === 'in_progress';
            const isSubmitting = submitTask.isPending && submitTask.variables === t.id;

            return (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 max-w-xs">
                  <p className="text-sm font-medium text-gray-900 hover:text-indigo-600 cursor-pointer truncate" onClick={() => onView(t)}>
                    {t.title}
                  </p>
                  {!!t.tags?.length && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                <td className="px-6 py-4"><PriorityBadge priority={t.priority} /></td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {t.assigneeId ? (assigneeNameById[t.assigneeId] ?? '—') : <span className="text-gray-300">Unassigned</span>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{formatDate(t.dueDate)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => canSubmit && setConfirmSubmit(t)}
                      disabled={!canSubmit || isSubmitting}
                      title={!canSubmit ? 'Only tasks that are In Progress can be submitted' : undefined}
                      className={`text-sm font-medium transition-colors ${
                        !canSubmit
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-purple-600 hover:text-purple-800 disabled:opacity-50'
                      }`}
                    >
                      {isSubmitting ? 'Submitting…' : 'Submit Task'}
                    </button>
                    <span className="text-gray-200">|</span>
                    <button onClick={() => onView(t)} className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">View</button>
                    <span className="text-gray-200">|</span>
                    <button onClick={() => onEdit(t)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900 transition-colors">Edit</button>
                    <span className="text-gray-200">|</span>
                    <button onClick={() => onDelete(t)} disabled={deletingId === t.id}
                      className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
                      {deletingId === t.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {confirmSubmit && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmSubmit(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900">Submit task for review?</h3>
            <p className="text-sm text-gray-500 mt-2">
              <strong>{confirmSubmit.title}</strong> will move to <strong>In Review</strong>.
            </p>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setConfirmSubmit(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleConfirmSubmit} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">
                Submit
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

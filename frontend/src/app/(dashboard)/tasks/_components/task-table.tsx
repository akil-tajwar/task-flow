'use client';

import type { Task, TaskStatus, TaskPriority } from '@/types/task';

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-600',
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

function StatusBadge({ status }: { status: TaskStatus }) {
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
          {tasks.map((t) => (
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
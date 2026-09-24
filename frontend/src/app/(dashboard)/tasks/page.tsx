'use client';

import { useState, useMemo } from 'react';
import { useTasks, useDeleteTask } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';
import { useMe } from '@/hooks/use-auth';
import { TaskTable } from './_components/task-table';
import { TaskFormModal } from './_components/task-form-modal';
import { TaskDetailModal } from './_components/task-detail-modal';
import type { Task } from '@/types/task';

export default function TasksPage() {
  const { data: me } = useMe();
  const { data: projects = [] } = useProjects();
  const { data: tasks = [], isLoading, isError } = useTasks();
  const deleteTask = useDeleteTask();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [viewing, setViewing] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);

  const assigneeNameById = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach((p) => p.projectMembers.forEach((m) => { map[m.userId] = m.memberName ?? m.userId; }));
    return map;
  }, [projects]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    setConfirmDelete(null);
    try { await deleteTask.mutateAsync(confirmDelete.id); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
          New Task
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            <span className="text-sm">Loading tasks…</span>
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-red-500 text-sm">Failed to load tasks.</div>
        ) : (
          <TaskTable
            tasks={tasks}
            assigneeNameById={assigneeNameById}
            onView={setViewing}
            onEdit={(t: Task) => { setEditing(t); setModalOpen(true); }}
            onDelete={(t: Task) => setConfirmDelete(t)}
            deletingId={deletingId}
          />
        )}
      </div>

      <TaskFormModal open={modalOpen} task={editing} projects={projects} onClose={() => setModalOpen(false)} />

      <TaskDetailModal
        task={viewing}
        assigneeNameById={assigneeNameById}
        currentUserId={me?.id ?? ''}
        onClose={() => setViewing(null)}
        onEdit={(t: Task) => { setViewing(null); setEditing(t); setModalOpen(true); }}
      />

      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setConfirmDelete(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900">Remove task?</h3>
            <p className="text-sm text-gray-500 mt-2">
              <strong>{confirmDelete.title}</strong> will be permanently deleted.
            </p>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Remove</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
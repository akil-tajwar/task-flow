'use client';

import { useState } from 'react';
import type { Task } from '@/types/task';
import { useMarkTaskDone, useUpdateTask } from '@/hooks/use-tasks';

interface Props {
  task: Task;
  onClose: () => void;
  onDone: () => void;
}

// Full backend payload for /tasks/edit/:id always replaces every field (see
// toTaskPayload in hooks/use-tasks.ts), so when we only want to change
// actualHours we still have to carry every other field forward from the
// existing task to avoid nulling them out.
function taskToUpdatePayload(t: Task) {
  return {
    title: t.title,
    description: t.description ?? undefined,
    priority: t.priority,
    projectId: t.projectId,
    parentTaskId: t.parentTaskId ?? undefined,
    milestoneId: t.milestoneId ?? undefined,
    assigneeId: t.assigneeId ?? undefined,
    startDate: t.startDate ?? undefined,
    dueDate: t.dueDate ?? undefined,
    estimatedHours: t.estimatedHours ?? undefined,
    isBillable: t.isBillable,
    sortOrder: t.sortOrder,
    tags: t.tags ?? [],
  };
}

export function TaskMarkDoneModal({ task, onClose, onDone }: Props) {
  const [actualHours, setActualHours] = useState(task.actualHours ?? '');
  const [error, setError] = useState('');

  const updateTask = useUpdateTask();
  const markDone = useMarkTaskDone();

  const isPending = updateTask.isPending || markDone.isPending;
  const hoursChanged = actualHours !== (task.actualHours ?? '');

  const handleConfirm = async () => {
    setError('');
    try {
      if (hoursChanged) {
        await updateTask.mutateAsync({
          id: task.id,
          ...taskToUpdatePayload(task),
          actualHours: actualHours || undefined,
        });
      }
      await markDone.mutateAsync(task.id);
      onDone();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err instanceof Error ? err.message : 'Something went wrong.');
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Mark task done</h2>
          <p className="text-xs text-gray-400 mt-0.5">{task.title}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <p className="text-sm text-gray-600">
            This will mark the task as <strong>done</strong> and record the completion time.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual hours <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={actualHours}
              onChange={(e) => setActualHours(e.target.value)}
              placeholder={task.estimatedHours ?? undefined}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {isPending ? 'Marking done…' : 'Mark done'}
          </button>
        </div>
      </div>
    </div>
  );
}
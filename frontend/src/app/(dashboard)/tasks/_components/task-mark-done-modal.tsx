'use client';

import { useState } from 'react';
import type { Task } from '@/types/task';
import { useMarkTaskDone } from '@/hooks/use-tasks';

interface Props {
  task: Task;
  onClose: () => void;
  onDone: () => void;
}

export function TaskMarkDoneModal({ task, onClose, onDone }: Props) {
  const [error, setError] = useState('');
  const markDone = useMarkTaskDone();

  const handleConfirm = async () => {
    setError('');
    try {
      await markDone.mutateAsync(task.id);
      onDone();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err instanceof Error ? err.message : 'Something went wrong.');
      setError(msg);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
        <h3 className="text-base font-semibold text-gray-900">Mark task done?</h3>
        <p className="text-sm text-gray-500 mt-2">
          <strong>{task.title}</strong> will be marked as <strong>done</strong>.
        </p>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mt-3">{error}</div>
        )}
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} disabled={markDone.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={markDone.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {markDone.isPending ? 'Marking done…' : 'Mark done'}
          </button>
        </div>
      </div>
    </>
  );
}


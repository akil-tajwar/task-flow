'use client';

import { useState } from 'react';
import type { Task } from '@/types/task';
import { useMarkTaskBlocked, useCreateComment } from '@/hooks/use-tasks';

interface Props {
  task: Task;
  onClose: () => void;
  onBlocked: () => void;
}

export function TaskMarkBlockedModal({ task, onClose, onBlocked }: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const markBlocked = useMarkTaskBlocked();
  // The /tasks/blocked/:id endpoint takes no body, so there's nowhere on
  // the task itself to store a reason — we log it as a comment instead so
  // it's visible in the task's activity/comment thread.
  const createComment = useCreateComment(task.id);

  const isPending = markBlocked.isPending || createComment.isPending;

  const handleConfirm = async () => {
    setError('');
    try {
      await markBlocked.mutateAsync(task.id);
      if (reason.trim()) {
        await createComment.mutateAsync({ content: `Blocked: ${reason.trim()}` });
      }
      onBlocked();
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
          <h2 className="text-lg font-semibold text-gray-900">Mark task blocked</h2>
          <p className="text-xs text-gray-400 mt-0.5">{task.title}</p>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <p className="text-sm text-gray-600">
            This will mark the task as <strong>blocked</strong> and notify the assignee.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-gray-400 font-normal">(optional, added as a comment)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="What's blocking this task…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
            {isPending ? 'Marking blocked…' : 'Mark blocked'}
          </button>
        </div>
      </div>
    </div>
  );
}
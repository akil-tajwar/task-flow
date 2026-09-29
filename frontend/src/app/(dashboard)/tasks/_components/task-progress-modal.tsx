'use client';

import { useState } from 'react';
import type { Task } from '@/types/task';
import { useTaskProgress, useAddTaskProgress } from '@/hooks/use-tasks';

interface Props {
  task: Task;
  onClose: () => void;
  onLogged: () => void;
}

const MAX_COMMENT_LENGTH = 1000;

// <input type="datetime-local"> expects "YYYY-MM-DDTHH:mm" in LOCAL time.
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number) {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

const inputCls =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent';

export function TaskProgressModal({ task, onClose, onLogged }: Props) {
  const { data: history = [], isLoading: historyLoading } = useTaskProgress(task.id);
  const addProgress = useAddTaskProgress(task.id);

  // History comes back ordered by startedAt DESC, so [0] is the latest session.
  const last = history[0];
  const lastPercentage = last?.progressPercentage ?? 0;

  // Defaults derived from history; user edits override them.
  const defaultStart = last ? toLocalInput(new Date(last.endedAt)) : toLocalInput(new Date(Date.now() - 60 * 60 * 1000));
  const [nowValue] = useState(() => toLocalInput(new Date()));

  const [startedAtInput, setStartedAtInput] = useState<string | null>(null);
  const [endedAtInput, setEndedAtInput] = useState<string | null>(null);
  const [percentageInput, setPercentageInput] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const startedAt = startedAtInput ?? defaultStart;
  const endedAt = endedAtInput ?? nowValue;
  const percentage = percentageInput ?? lastPercentage;

  const startMs = startedAt ? new Date(startedAt).getTime() : NaN;
  const endMs = endedAt ? new Date(endedAt).getTime() : NaN;
  const durationMs = endMs - startMs;
  const durationValid = Number.isFinite(durationMs) && durationMs > 0;

  const isComplete = percentage === 100;
  const isPending = addProgress.isPending;

  const handleConfirm = async () => {
    setError('');

    if (!Number.isFinite(startMs)) { setError('Start date and time is required.'); return; }
    if (!Number.isFinite(endMs)) { setError('End date and time is required.'); return; }
    if (endMs <= startMs) { setError('End time must be after start time.'); return; }
    if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
      setError('Progress must be a whole number between 0 and 100.');
      return;
    }
    if (percentage < lastPercentage) {
      setError(`Progress cannot go backwards. Last recorded progress was ${lastPercentage}%.`);
      return;
    }
    if (comment.length > MAX_COMMENT_LENGTH) {
      setError(`Comment must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
      return;
    }

    const trimmedComment = comment.trim();

    try {
      await addProgress.mutateAsync({
        startedAt: new Date(startMs).toISOString(),
        endedAt: new Date(endMs).toISOString(),
        progressPercentage: percentage,
        comment: trimmedComment || undefined,
      });
      onLogged();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? (err instanceof Error ? err.message : 'Something went wrong.');
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl">
        <div className="border-b px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Log progress</h2>
          <p className="text-xs text-gray-400 mt-0.5">{task.title}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Started at</label>
              <input
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAtInput(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ended at</label>
              <input
                type="datetime-local"
                value={endedAt}
                onChange={(e) => setEndedAtInput(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-2.5 text-sm text-gray-600 flex items-center justify-between">
            <span>Time worked in this session</span>
            <span className={`font-semibold ${durationValid ? 'text-gray-900' : 'text-red-500'}`}>
              {durationValid ? formatDuration(durationMs) : 'Invalid range'}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Overall progress</label>
              <span className="text-xs text-gray-400">
                Last recorded: {lastPercentage}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={lastPercentage}
                max={100}
                step={1}
                value={percentage}
                onChange={(e) => setPercentageInput(Number(e.target.value))}
                className="flex-1 accent-purple-600"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  min={lastPercentage}
                  max={100}
                  step={1}
                  value={percentage}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPercentageInput(v === '' ? 0 : Number(v));
                  }}
                  className={`${inputCls} pr-7`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Comment <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <span
                className={`text-xs ${comment.length > MAX_COMMENT_LENGTH ? 'text-red-500' : 'text-gray-400'}`}
              >
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="What did you work on in this session…"
              className={`${inputCls} resize-none`}
            />
            <p className="text-xs text-gray-400 mt-1">
              The project owner will see this in the progress notification.
            </p>
          </div>

          {isComplete && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-700">
              At 100% this task will be moved to <strong>In Review</strong> automatically.
            </div>
          )}

          {history.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Previous sessions
              </p>
              <ul className="space-y-1.5">
                {history.slice(0, 5).map((h) => (
                  <li
                    key={h.id}
                    className="rounded-lg border border-gray-100 px-3 py-2 text-xs text-gray-600"
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {formatDateTime(h.startedAt)} → {formatDateTime(h.endedAt)}
                      </span>
                      <span className="font-semibold text-gray-800 ml-3 flex-shrink-0">
                        {h.progressPercentage}%
                      </span>
                    </div>
                    {h.comment && (
                      <p className="mt-1 text-gray-500 whitespace-pre-wrap break-words">
                        {h.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {history.length > 5 && (
                <p className="text-xs text-gray-400 mt-1.5">+ {history.length - 5} older</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
          <button type="button" onClick={onClose} disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={isPending || historyLoading}
            className="px-5 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {isPending ? 'Saving…' : isComplete ? 'Log & submit for review' : 'Log progress'}
          </button>
        </div>
      </div>
    </div>
  );
}
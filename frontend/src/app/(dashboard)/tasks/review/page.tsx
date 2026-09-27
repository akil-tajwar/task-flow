'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTasksInReview } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';
import { useMe } from '@/hooks/use-auth';
import { TaskReviewTable } from './_components/task-review-table';
import { TaskDetailModal } from '../_components/task-detail-modal';
import { TaskMarkDoneModal } from '../_components/task-mark-done-modal';
import { TaskMarkBlockedModal } from '../_components/task-mark-blocked-modal';
import type { Task } from '@/types/task';

export default function TaskReviewPage() {
  const { data: me } = useMe();
  const { data: projects = [] } = useProjects();
  const { data: result, isLoading, isError } = useTasksInReview();
  const tasks = result?.data ?? [];

  const [viewing, setViewing] = useState<Task | null>(null);
  const [markingDone, setMarkingDone] = useState<Task | null>(null);
  const [markingBlocked, setMarkingBlocked] = useState<Task | null>(null);

  const assigneeNameById = useMemo(() => {
    const map: Record<string, string> = {};
    projects.forEach((p) => p.projectMembers.forEach((m) => { map[m.userId] = m.memberName ?? m.userId; }));
    return map;
  }, [projects]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {result?.pagination.total ?? tasks.length} task{(result?.pagination.total ?? tasks.length) !== 1 ? 's' : ''} waiting for review
          </p>
        </div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back to Tasks
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            <span className="text-sm">Loading review queue…</span>
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-red-500 text-sm">Failed to load the review queue.</div>
        ) : (
          <TaskReviewTable
            tasks={tasks}
            assigneeNameById={assigneeNameById}
            onView={setViewing}
            onMarkDone={setMarkingDone}
            onMarkBlocked={setMarkingBlocked}
          />
        )}
      </div>

      <TaskDetailModal
        task={viewing}
        assigneeNameById={assigneeNameById}
        currentUserId={me?.id ?? ''}
        onClose={() => setViewing(null)}
        onEdit={() => setViewing(null)}
      />

      {markingDone && (
        <TaskMarkDoneModal
          task={markingDone}
          onClose={() => setMarkingDone(null)}
          onDone={() => setMarkingDone(null)}
        />
      )}

      {markingBlocked && (
        <TaskMarkBlockedModal
          task={markingBlocked}
          onClose={() => setMarkingBlocked(null)}
          onBlocked={() => setMarkingBlocked(null)}
        />
      )}
    </div>
  );
}
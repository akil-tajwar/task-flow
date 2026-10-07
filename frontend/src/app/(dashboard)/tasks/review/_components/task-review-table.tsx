"use client";

import type { Task, TaskPriority } from "@/types/task";
import { StatusBadge } from "../../_components/task-table";
import { Check, Ban } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PRIORITY_STYLES[priority]}`}
    >
      {priority}
    </span>
  );
}

function formatDate(d?: string | null) {
  if (!d) return <span className="text-gray-300">—</span>;
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface Props {
  tasks: Task[];
  assigneeNameById: Record<string, string>;
  onView: (t: Task) => void;
  onMarkDone: (t: Task) => void;
  onMarkBlocked: (t: Task) => void;
}

/**
 * Tooltip-wrapped icon button — same pattern as TaskTable's ActionButton.
 */
function ActionButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={`p-1.5 rounded-md transition-colors ${className ?? ""}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function TaskReviewTable({
  tasks,
  assigneeNameById,
  onView,
  onMarkDone,
  onMarkBlocked,
}: Props) {
  if (!tasks.length) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gray-100 mb-4">
          <svg
            className="h-7 w-7 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">Nothing waiting for review</p>
        <p className="text-gray-400 text-sm mt-1">
          Submitted tasks will show up here
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              {[
                "Task",
                "Status",
                "Priority",
                "Assignee",
                "Due Date",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === "Actions" ? "text-right" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {tasks.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 max-w-xs">
                  <p
                    onClick={() => onView(t)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate"
                  >
                    {t.title}
                  </p>
                  {!!t.tags?.length && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-6 py-4">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {t.assigneeId ? (
                    (assigneeNameById[t.assigneeId] ?? "—")
                  ) : (
                    <span className="text-gray-300">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                  {formatDate(t.dueDate)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <ActionButton
                      label="Mark done"
                      onClick={() => onMarkDone(t)}
                      className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                    >
                      <Check className="h-4 w-4" />
                    </ActionButton>

                    <ActionButton
                      label="Mark blocked"
                      onClick={() => onMarkBlocked(t)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Ban className="h-4 w-4" />
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}

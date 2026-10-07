"use client";

import { useState } from "react";
import type { Task, TaskStatus, TaskPriority } from "@/types/task";
import { TaskProgressModal } from "./task-progress-modal";
import { useDownloadTaskIcs } from "@/hooks/use-tasks";
import {
  Clock,
  Pencil,
  Trash2,
  CalendarPlus,
  Loader2,
  MoreVertical,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// No "todo" status on the backend — a task is created straight into
// "in_progress" and only ever moves between in_progress / in_review /
// done / blocked.
const STATUS_STYLES: Record<TaskStatus, string> = {
  in_progress: "bg-blue-100 text-blue-700",
  in_review: "bg-purple-100 text-purple-700",
  done: "bg-emerald-100 text-emerald-700",
  blocked: "bg-red-100 text-red-700",
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

// Exported so TaskDetailModal can render the same badge.
export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

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
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  deletingId: string | null;
}

/**
 * Small helper that keeps the icon buttons consistent:
 * a Tooltip-wrapped button with a shared size / hover style.
 */
function ActionButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={`p-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className ?? ""}`}
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

export function TaskTable({
  tasks,
  assigneeNameById,
  onView,
  onEdit,
  onDelete,
  deletingId,
}: Props) {
  // Opens the Log Progress modal (start/end time + percentage) for this task.
  const [logging, setLogging] = useState<Task | null>(null);
  const downloadIcs = useDownloadTaskIcs();

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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No tasks yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Click &ldquo;New Task&rdquo; to get started
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
            {tasks.map((t) => {
              // The backend rejects progress on in_review / done tasks.
              const canLogProgress =
                t.status === "in_progress" || t.status === "blocked";

              const isDownloading =
                downloadIcs.isPending && downloadIcs.variables?.id === t.id;

              return (
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
                    <div className="flex items-center justify-end gap-1">
                      <ActionButton
                        label="Edit"
                        onClick={() => onEdit(t)}
                        className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </ActionButton>

                      <ActionButton
                        label={deletingId === t.id ? "Removing…" : "Remove"}
                        onClick={() => onDelete(t)}
                        disabled={deletingId === t.id}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingId === t.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </ActionButton>

                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label="More actions"
                                className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>More actions</p>
                          </TooltipContent>
                        </Tooltip>

                        <DropdownMenuContent
                          align="end"
                          className="w-48 bg-white text-zinc-900 border-zinc-200 dark:bg-white dark:text-zinc-900 dark:border-zinc-200"
                        >
                          <DropdownMenuItem
                            disabled={!canLogProgress}
                            onClick={() => {
                              if (canLogProgress) setLogging(t);
                            }}
                            className={`cursor-pointer dark:focus:bg-zinc-100 dark:focus:text-zinc-900 ${!canLogProgress ? "bg-gray-200" : ""}`}
                          >
                            <Clock className="h-4 w-4 mr-2 text-purple-600" />
                            Log Progress
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            disabled={isDownloading}
                            onClick={() =>
                              downloadIcs.mutate({
                                id: t.id,
                                title: t.title,
                              })
                            }
                            className="cursor-pointer dark:focus:bg-zinc-100 dark:focus:text-zinc-900"
                          >
                            {isDownloading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin text-emerald-600" />
                            ) : (
                              <CalendarPlus className="h-4 w-4 mr-2 text-emerald-600" />
                            )}
                            {isDownloading ? "Downloading…" : "Add to Calendar"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {logging && (
          <TaskProgressModal
            task={logging}
            onClose={() => setLogging(null)}
            onLogged={() => setLogging(null)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

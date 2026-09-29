'use client';

import { useEffect, useRef, useState } from 'react';
import type { Project, ProjectStatus } from '@/types/project';
import { TaskFormModal } from '../../tasks/_components/task-form-modal';


const DEFAULT_COLOR = '#6366f1';

const STATUS_DOT: Record<ProjectStatus, string> = {
  active: 'bg-emerald-500',
  on_hold: 'bg-amber-500',
  completed: 'bg-blue-500',
  archived: 'bg-gray-400',
  cancelled: 'bg-red-500',
};

// ---------- color helpers ----------

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex?: string | null): RGB {
  const fallback = { r: 99, g: 102, b: 241 };
  if (!hex) return fallback;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgba({ r, g, b }: RGB, a: number) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Relative luminance (0 = black, 1 = white)
function luminance({ r, g, b }: RGB) {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// Mix a color toward black by `amount` (0..1)
function darken({ r, g, b }: RGB, amount: number): RGB {
  return {
    r: Math.round(r * (1 - amount)),
    g: Math.round(g * (1 - amount)),
    b: Math.round(b * (1 - amount)),
  };
}

function getTheme(color?: string | null) {
  const rgb = hexToRgb(color ?? DEFAULT_COLOR);
  const lum = luminance(rgb);
  const isLight = lum > 0.5;
  // Accent used on the light body (progress fill, icons); darkened if the color is too pale.
  const accent = lum > 0.6 ? darken(rgb, 0.35) : rgb;
  return {
    headerBg: `linear-gradient(135deg, ${rgba(rgb, 1)} 0%, ${rgba(darken(rgb, 0.22), 1)} 100%)`,
    bodyBg: rgba(rgb, 0.06),
    border: rgba(rgb, 0.22),
    track: rgba(rgb, 0.16),
    accent: rgba(accent, 1),
    chipBg: rgba(rgb, 0.14),
    chipText: rgba(darken(rgb, lum > 0.4 ? 0.5 : 0.15), 1),
    circle: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.12)',
    onHeader: isLight ? 'text-gray-900' : 'text-white',
    onHeaderMuted: isLight ? 'text-gray-900/70' : 'text-white/75',
    menuBtn: isLight ? 'hover:bg-black/10 text-gray-900' : 'hover:bg-white/20 text-white',
  };
}

// ---------- formatting helpers ----------

function formatMoney(amount?: string | null, currency?: string | null) {
  if (!amount) return '—';
  const n = Number(amount);
  return `${currency ?? 'USD'} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------- task stats ----------

// Minimal shape we need from a task. Kept loose on purpose so this works
// no matter how the project payload types its nested tasks.
//
// The backend should send, for every task:
//   id, status, isCompleted, progressPercentage (latest logged %, or null)
// `latestProgress` is accepted as an alternative name for the same value.
type StatTask = {
  id?: string;
  status?: string | null;
  isCompleted?: boolean | null;
  progressPercentage?: number | string | null;
  latestProgress?: number | string | null;
};

function clampPercent(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

// Progress of a single task, 0..100:
// - done / in_review -> 100 (work is finished; in_review only happens at 100%)
// - anything else    -> latest logged percentage (0 if nothing logged yet)
function getTaskPercent(t: StatTask): number {
  if (t.isCompleted || t.status === 'done' || t.status === 'in_review') return 100;
  return clampPercent(t.progressPercentage ?? t.latestProgress ?? 0);
}

// Collects tasks from every milestone AND from a top-level `project.tasks`
// array (if the backend sends one), so tasks without a milestone are
// counted too. Duplicates are removed by id.
//
// Project percent = average of every task's percent.
function getTaskStats(project: Project) {
  const seen = new Set<string>();
  const all: StatTask[] = [];

  const collect = (list?: StatTask[] | null) => {
    (list ?? []).forEach((t) => {
      if (t.id) {
        if (seen.has(t.id)) return;
        seen.add(t.id);
      }
      all.push(t);
    });
  };

  (project.milestones ?? []).forEach((m) => {
    collect((m as unknown as { tasks?: StatTask[] | null }).tasks);
  });
  collect((project as unknown as { tasks?: StatTask[] | null }).tasks);

  const total = all.length;
  const isDone = (t: StatTask) => !!t.isCompleted || t.status === 'done';

  const completed = all.filter(isDone).length;
  const inReview = all.filter((t) => !isDone(t) && t.status === 'in_review').length;

  const percent =
    total === 0
      ? 0
      : Math.round(all.reduce((sum, t) => sum + getTaskPercent(t), 0) / total);

  return { total, completed, inReview, percent };
}

// ---------- small pieces ----------

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold capitalize text-gray-700 shadow-sm">
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-gray-400'}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

function ActionsMenu({
  project,
  busy,
  btnClass,
  onView,
  onEdit,
  onNewTask,
  onArchive,
  onRestore,
  onDelete,
  onOpenChange,
}: {
  project: Project;
  busy: boolean;
  btnClass: string;
  onView: (p: Project) => void;
  onEdit: (p: Project) => void;
  onNewTask: (p: Project) => void;
  onArchive: (p: Project) => void;
  onRestore: (p: Project) => void;
  onDelete: (p: Project) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const setOpenState = (v: boolean) => {
    setOpen(v);
    onOpenChange(v);
  };

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onOpenChange(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        onOpenChange(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const run = (fn: (p: Project) => void) => {
    setOpenState(false);
    fn(project);
  };

  const itemCls =
    'flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-left text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50';

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Project actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpenState(!open)}
        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${btnClass}`}
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
        >
          <button role="menuitem" type="button" className={itemCls} onClick={() => run(onView)}>
            <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
              <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.147.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            View
          </button>
          <button role="menuitem" type="button" className={itemCls} onClick={() => run(onEdit)}>
            <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit
          </button>
          {!project.isArchived && (
            <button
              role="menuitem"
              type="button"
              className={`${itemCls} !text-indigo-600 hover:!bg-indigo-50`}
              onClick={() => run(onNewTask)}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              New Task
            </button>
          )}
          {project.isArchived ? (
            <button
              role="menuitem"
              type="button"
              disabled={busy}
              className={`${itemCls} !text-emerald-700 hover:!bg-emerald-50`}
              onClick={() => run(onRestore)}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {busy ? 'Restoring…' : 'Restore'}
            </button>
          ) : (
            <button
              role="menuitem"
              type="button"
              disabled={busy}
              className={`${itemCls} !text-amber-700 hover:!bg-amber-50`}
              onClick={() => run(onArchive)}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              {busy ? 'Archiving…' : 'Archive'}
            </button>
          )}
          <div className="my-1 border-t border-gray-100" />
          <button
            role="menuitem"
            type="button"
            disabled={busy}
            className={`${itemCls} !text-red-600 hover:!bg-red-50`}
            onClick={() => run(onDelete)}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- card ----------

interface CardProps {
  project: Project;
  busy: boolean;
  onView: (p: Project) => void;
  onEdit: (p: Project) => void;
  onNewTask: (p: Project) => void;
  onArchive: (p: Project) => void;
  onRestore: (p: Project) => void;
  onDelete: (p: Project) => void;
}

function ProjectCard({ project: p, busy, onView, onEdit, onNewTask, onArchive, onRestore, onDelete }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = getTheme(p.color);
  const { completed, inReview, total, percent } = getTaskStats(p);
  const milestoneCount = p.milestones?.length ?? 0;
  const memberCount = p.projectMembers?.length ?? 0;
  const tags = p.tags ?? [];

  const progressLabel =
    total === 0
      ? 'No tasks yet'
      : `${completed}/${total} done${inReview > 0 ? ` · ${inReview} in review` : ''}`;

  return (
    <div
      onClick={() => onView(p)}
      className={`group relative flex cursor-pointer flex-col rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        menuOpen ? 'z-20' : 'z-0'
      } ${p.isArchived ? 'opacity-80' : ''}`}
      style={{ backgroundColor: theme.bodyBg, borderColor: theme.border }}
    >
      {/* Header: project color gradient */}
      <div className="relative rounded-t-xl px-4 pb-3.5 pt-3" style={{ background: theme.headerBg }}>
        {/* Decorative circles (clipped separately so the dropdown is never cut off) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-xl">
          <span
            className="absolute -right-6 -top-8 h-24 w-24 rounded-full"
            style={{ backgroundColor: theme.circle }}
          />
          <span
            className="absolute -bottom-10 right-10 h-20 w-20 rounded-full"
            style={{ backgroundColor: theme.circle }}
          />
        </div>

        <div className="relative flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={p.status} />
            {p.isArchived && (
              <span className="inline-flex items-center rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-medium text-white">
                Archived
              </span>
            )}
          </div>
          <ActionsMenu
            project={p}
            busy={busy}
            btnClass={theme.menuBtn}
            onView={onView}
            onEdit={onEdit}
            onNewTask={onNewTask}
            onArchive={onArchive}
            onRestore={onRestore}
            onDelete={onDelete}
            onOpenChange={setMenuOpen}
          />
        </div>

        <h3 className={`relative mt-2.5 line-clamp-1 text-[15px] font-semibold leading-snug ${theme.onHeader}`}>
          {p.name}
        </h3>
        <p className={`relative mt-0.5 text-[11px] ${theme.onHeaderMuted}`}>
          {formatDate(p.startDate)} → {formatDate(p.endDate)}
        </p>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        {/* Progress */}
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate text-gray-500">{progressLabel}</span>
            <span className="flex-shrink-0 font-semibold text-gray-800">{percent}%</span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: theme.track }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${percent}%`, backgroundColor: theme.accent }}
            />
          </div>
        </div>

        {/* Budget + tags */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Budget</p>
            <p className="truncate text-[13px] font-semibold text-gray-900">
              {formatMoney(p.budgetAmount, p.currency)}
            </p>
          </div>
          {p.budgetType && (
            <span
              className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
              style={{ backgroundColor: theme.chipBg, color: theme.chipText }}
            >
              {p.budgetType.replace('_', ' ')}
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] text-gray-600 ring-1 ring-gray-200"
              >
                {t}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="px-1 py-0.5 text-[11px] text-gray-400">+{tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          className="mt-auto flex items-center gap-3 border-t pt-2.5 text-[11px] text-gray-500"
          style={{ borderColor: theme.border }}
        >
          <span className="inline-flex items-center gap-1">
            <svg className="h-3.5 w-3.5" style={{ color: theme.accent }} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
            </svg>
            {milestoneCount} milestone{milestoneCount !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1">
            <svg className="h-3.5 w-3.5" style={{ color: theme.accent }} viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------- list ----------

interface Props {
  projects: Project[];
  onView: (p: Project) => void;
  onEdit: (p: Project) => void;
  onArchive: (p: Project) => void;
  onRestore: (p: Project) => void;
  onDelete: (p: Project) => void;
  busyId: string | null;
}

export function ProjectTable({ projects, onView, onEdit, onArchive, onRestore, onDelete, busyId }: Props) {
  // Project for which the "New Task" modal is currently open.
  const [taskProject, setTaskProject] = useState<Project | null>(null);

  if (!projects.length) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gray-100 mb-4">
          <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No projects yet</p>
        <p className="text-gray-400 text-sm mt-1">Click &ldquo;New Project&rdquo; to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 p-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            busy={busyId === p.id}
            onView={onView}
            onEdit={onEdit}
            onNewTask={setTaskProject}
            onArchive={onArchive}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
      </div>

      <TaskFormModal
        open={!!taskProject}
        task={null}
        projects={projects}
        defaultProjectId={taskProject?.id}
        onClose={() => setTaskProject(null)}
      />
    </>
  );
}


// 'use client';

// import { useEffect, useRef, useState } from 'react';
// import type { Project, ProjectStatus } from '@/types/project';
// import { TaskFormModal } from '../../tasks/_components/task-form-modal';


// const DEFAULT_COLOR = '#6366f1';

// const STATUS_DOT: Record<ProjectStatus, string> = {
//   active: 'bg-emerald-500',
//   on_hold: 'bg-amber-500',
//   completed: 'bg-blue-500',
//   archived: 'bg-gray-400',
//   cancelled: 'bg-red-500',
// };

// // ---------- color helpers ----------

// type RGB = { r: number; g: number; b: number };

// function hexToRgb(hex?: string | null): RGB {
//   const fallback = { r: 99, g: 102, b: 241 };
//   if (!hex) return fallback;
//   let h = hex.trim().replace('#', '');
//   if (h.length === 3) h = h.split('').map((c) => c + c).join('');
//   if (!/^[0-9a-fA-F]{6}$/.test(h)) return fallback;
//   return {
//     r: parseInt(h.slice(0, 2), 16),
//     g: parseInt(h.slice(2, 4), 16),
//     b: parseInt(h.slice(4, 6), 16),
//   };
// }

// function rgba({ r, g, b }: RGB, a: number) {
//   return `rgba(${r}, ${g}, ${b}, ${a})`;
// }

// // Relative luminance (0 = black, 1 = white)
// function luminance({ r, g, b }: RGB) {
//   const f = (v: number) => {
//     const s = v / 255;
//     return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
//   };
//   return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
// }

// // Mix a color toward black by `amount` (0..1)
// function darken({ r, g, b }: RGB, amount: number): RGB {
//   return {
//     r: Math.round(r * (1 - amount)),
//     g: Math.round(g * (1 - amount)),
//     b: Math.round(b * (1 - amount)),
//   };
// }

// function getTheme(color?: string | null) {
//   const rgb = hexToRgb(color ?? DEFAULT_COLOR);
//   const lum = luminance(rgb);
//   const isLight = lum > 0.5;
//   // Accent used on the light body (progress fill, icons); darkened if the color is too pale.
//   const accent = lum > 0.6 ? darken(rgb, 0.35) : rgb;
//   return {
//     headerBg: `linear-gradient(135deg, ${rgba(rgb, 1)} 0%, ${rgba(darken(rgb, 0.22), 1)} 100%)`,
//     bodyBg: rgba(rgb, 0.06),
//     border: rgba(rgb, 0.22),
//     track: rgba(rgb, 0.16),
//     accent: rgba(accent, 1),
//     chipBg: rgba(rgb, 0.14),
//     chipText: rgba(darken(rgb, lum > 0.4 ? 0.5 : 0.15), 1),
//     circle: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.12)',
//     onHeader: isLight ? 'text-gray-900' : 'text-white',
//     onHeaderMuted: isLight ? 'text-gray-900/70' : 'text-white/75',
//     menuBtn: isLight ? 'hover:bg-black/10 text-gray-900' : 'hover:bg-white/20 text-white',
//   };
// }

// // ---------- formatting helpers ----------

// function formatMoney(amount?: string | null, currency?: string | null) {
//   if (!amount) return '—';
//   const n = Number(amount);
//   return `${currency ?? 'USD'} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
// }

// function formatDate(d?: string | null) {
//   if (!d) return '—';
//   return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
// }

// // Task progress helper — flattens tasks from all milestones
// function getTaskStats(project: Project) {
//   const allTasks = project.milestones.flatMap((m) => m.tasks ?? []);
//   const total = allTasks.length;
//   const completed = allTasks.filter((t) => t.isCompleted).length;
//   const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
//   return { total, completed, percent };
// }

// // ---------- small pieces ----------

// function StatusBadge({ status }: { status: ProjectStatus }) {
//   return (
//     <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold capitalize text-gray-700 shadow-sm">
//       <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-gray-400'}`} />
//       {status.replace('_', ' ')}
//     </span>
//   );
// }

// function ActionsMenu({
//   project,
//   busy,
//   btnClass,
//   onView,
//   onEdit,
//   onNewTask,
//   onArchive,
//   onRestore,
//   onDelete,
//   onOpenChange,
// }: {
//   project: Project;
//   busy: boolean;
//   btnClass: string;
//   onView: (p: Project) => void;
//   onEdit: (p: Project) => void;
//   onNewTask: (p: Project) => void;
//   onArchive: (p: Project) => void;
//   onRestore: (p: Project) => void;
//   onDelete: (p: Project) => void;
//   onOpenChange: (open: boolean) => void;
// }) {
//   const [open, setOpen] = useState(false);
//   const ref = useRef<HTMLDivElement>(null);

//   const setOpenState = (v: boolean) => {
//     setOpen(v);
//     onOpenChange(v);
//   };

//   useEffect(() => {
//     if (!open) return;
//     const onMouseDown = (e: MouseEvent) => {
//       if (ref.current && !ref.current.contains(e.target as Node)) {
//         setOpen(false);
//         onOpenChange(false);
//       }
//     };
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === 'Escape') {
//         setOpen(false);
//         onOpenChange(false);
//       }
//     };
//     document.addEventListener('mousedown', onMouseDown);
//     document.addEventListener('keydown', onKey);
//     return () => {
//       document.removeEventListener('mousedown', onMouseDown);
//       document.removeEventListener('keydown', onKey);
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [open]);

//   const run = (fn: (p: Project) => void) => {
//     setOpenState(false);
//     fn(project);
//   };

//   const itemCls =
//     'flex w-full items-center gap-2 px-3 py-1.5 text-[13px] text-left text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50';

//   return (
//     <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
//       <button
//         type="button"
//         aria-label="Project actions"
//         aria-haspopup="menu"
//         aria-expanded={open}
//         onClick={() => setOpenState(!open)}
//         className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${btnClass}`}
//       >
//         <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//           <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
//         </svg>
//       </button>

//       {open && (
//         <div
//           role="menu"
//           className="absolute right-0 top-full z-30 mt-1 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
//         >
//           <button role="menuitem" type="button" className={itemCls} onClick={() => run(onView)}>
//             <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
//               <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
//               <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.147.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
//             </svg>
//             View
//           </button>
//           <button role="menuitem" type="button" className={itemCls} onClick={() => run(onEdit)}>
//             <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
//               <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
//             </svg>
//             Edit
//           </button>
//           {!project.isArchived && (
//             <button
//               role="menuitem"
//               type="button"
//               className={`${itemCls} !text-indigo-600 hover:!bg-indigo-50`}
//               onClick={() => run(onNewTask)}
//             >
//               <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
//               </svg>
//               New Task
//             </button>
//           )}
//           {project.isArchived ? (
//             <button
//               role="menuitem"
//               type="button"
//               disabled={busy}
//               className={`${itemCls} !text-emerald-700 hover:!bg-emerald-50`}
//               onClick={() => run(onRestore)}
//             >
//               <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
//               </svg>
//               {busy ? 'Restoring…' : 'Restore'}
//             </button>
//           ) : (
//             <button
//               role="menuitem"
//               type="button"
//               disabled={busy}
//               className={`${itemCls} !text-amber-700 hover:!bg-amber-50`}
//               onClick={() => run(onArchive)}
//             >
//               <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                 <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
//                 <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
//               </svg>
//               {busy ? 'Archiving…' : 'Archive'}
//             </button>
//           )}
//           <div className="my-1 border-t border-gray-100" />
//           <button
//             role="menuitem"
//             type="button"
//             disabled={busy}
//             className={`${itemCls} !text-red-600 hover:!bg-red-50`}
//             onClick={() => run(onDelete)}
//           >
//             <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
//             </svg>
//             Delete
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// // ---------- card ----------

// interface CardProps {
//   project: Project;
//   busy: boolean;
//   onView: (p: Project) => void;
//   onEdit: (p: Project) => void;
//   onNewTask: (p: Project) => void;
//   onArchive: (p: Project) => void;
//   onRestore: (p: Project) => void;
//   onDelete: (p: Project) => void;
// }

// function ProjectCard({ project: p, busy, onView, onEdit, onNewTask, onArchive, onRestore, onDelete }: CardProps) {
//   const [menuOpen, setMenuOpen] = useState(false);
//   const theme = getTheme(p.color);
//   const { completed, total, percent } = getTaskStats(p);
//   const milestoneCount = p.milestones.length;
//   const memberCount = p.projectMembers.length;

//   return (
//     <div
//       onClick={() => onView(p)}
//       className={`group relative flex cursor-pointer flex-col rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
//         menuOpen ? 'z-20' : 'z-0'
//       } ${p.isArchived ? 'opacity-80' : ''}`}
//       style={{ backgroundColor: theme.bodyBg, borderColor: theme.border }}
//     >
//       {/* Header: project color gradient */}
//       <div className="relative rounded-t-xl px-4 pb-3.5 pt-3" style={{ background: theme.headerBg }}>
//         {/* Decorative circles (clipped separately so the dropdown is never cut off) */}
//         <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-xl">
//           <span
//             className="absolute -right-6 -top-8 h-24 w-24 rounded-full"
//             style={{ backgroundColor: theme.circle }}
//           />
//           <span
//             className="absolute -bottom-10 right-10 h-20 w-20 rounded-full"
//             style={{ backgroundColor: theme.circle }}
//           />
//         </div>

//         <div className="relative flex items-center justify-between gap-2">
//           <div className="flex flex-wrap items-center gap-1.5">
//             <StatusBadge status={p.status} />
//             {p.isArchived && (
//               <span className="inline-flex items-center rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-medium text-white">
//                 Archived
//               </span>
//             )}
//           </div>
//           <ActionsMenu
//             project={p}
//             busy={busy}
//             btnClass={theme.menuBtn}
//             onView={onView}
//             onEdit={onEdit}
//             onNewTask={onNewTask}
//             onArchive={onArchive}
//             onRestore={onRestore}
//             onDelete={onDelete}
//             onOpenChange={setMenuOpen}
//           />
//         </div>

//         <h3 className={`relative mt-2.5 line-clamp-1 text-[15px] font-semibold leading-snug ${theme.onHeader}`}>
//           {p.name}
//         </h3>
//         <p className={`relative mt-0.5 text-[11px] ${theme.onHeaderMuted}`}>
//           {formatDate(p.startDate)} → {formatDate(p.endDate)}
//         </p>
//       </div>

//       {/* Body */}
//       <div className="flex flex-1 flex-col gap-3 px-4 py-3">
//         {/* Progress */}
//         <div>
//           <div className="mb-1 flex items-center justify-between text-[11px]">
//             <span className="text-gray-500">{total === 0 ? 'No tasks yet' : `${completed}/${total} tasks`}</span>
//             <span className="font-semibold text-gray-800">{percent}%</span>
//           </div>
//           <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: theme.track }}>
//             <div
//               className="h-full rounded-full transition-all duration-500"
//               style={{ width: `${percent}%`, backgroundColor: theme.accent }}
//             />
//           </div>
//         </div>

//         {/* Budget + tags */}
//         <div className="flex items-center justify-between gap-2">
//           <div className="min-w-0">
//             <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Budget</p>
//             <p className="truncate text-[13px] font-semibold text-gray-900">
//               {formatMoney(p.budgetAmount, p.currency)}
//             </p>
//           </div>
//           {p.budgetType && (
//             <span
//               className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize"
//               style={{ backgroundColor: theme.chipBg, color: theme.chipText }}
//             >
//               {p.budgetType.replace('_', ' ')}
//             </span>
//           )}
//         </div>

//         {p.tags.length > 0 && (
//           <div className="flex flex-wrap gap-1">
//             {p.tags.slice(0, 2).map((t) => (
//               <span
//                 key={t}
//                 className="rounded-md bg-white/80 px-1.5 py-0.5 text-[11px] text-gray-600 ring-1 ring-gray-200"
//               >
//                 {t}
//               </span>
//             ))}
//             {p.tags.length > 2 && (
//               <span className="px-1 py-0.5 text-[11px] text-gray-400">+{p.tags.length - 2}</span>
//             )}
//           </div>
//         )}

//         {/* Footer */}
//         <div
//           className="mt-auto flex items-center gap-3 border-t pt-2.5 text-[11px] text-gray-500"
//           style={{ borderColor: theme.border }}
//         >
//           <span className="inline-flex items-center gap-1">
//             <svg className="h-3.5 w-3.5" style={{ color: theme.accent }} viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
//             </svg>
//             {milestoneCount} milestone{milestoneCount !== 1 ? 's' : ''}
//           </span>
//           <span className="inline-flex items-center gap-1">
//             <svg className="h-3.5 w-3.5" style={{ color: theme.accent }} viewBox="0 0 20 20" fill="currentColor">
//               <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
//             </svg>
//             {memberCount} member{memberCount !== 1 ? 's' : ''}
//           </span>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ---------- list ----------

// interface Props {
//   projects: Project[];
//   onView: (p: Project) => void;
//   onEdit: (p: Project) => void;
//   onArchive: (p: Project) => void;
//   onRestore: (p: Project) => void;
//   onDelete: (p: Project) => void;
//   busyId: string | null;
// }

// export function ProjectTable({ projects, onView, onEdit, onArchive, onRestore, onDelete, busyId }: Props) {
//   // Project for which the "New Task" modal is currently open.
//   const [taskProject, setTaskProject] = useState<Project | null>(null);

//   if (!projects.length) {
//     return (
//       <div className="text-center py-16">
//         <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gray-100 mb-4">
//           <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
//               d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
//           </svg>
//         </div>
//         <p className="text-gray-500 font-medium">No projects yet</p>
//         <p className="text-gray-400 text-sm mt-1">Click &ldquo;New Project&rdquo; to get started</p>
//       </div>
//     );
//   }

//   return (
//     <>
//       <div className="grid grid-cols-1 gap-4 p-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
//         {projects.map((p) => (
//           <ProjectCard
//             key={p.id}
//             project={p}
//             busy={busyId === p.id}
//             onView={onView}
//             onEdit={onEdit}
//             onNewTask={setTaskProject}
//             onArchive={onArchive}
//             onRestore={onRestore}
//             onDelete={onDelete}
//           />
//         ))}
//       </div>

//       <TaskFormModal
//         open={!!taskProject}
//         task={null}
//         projects={projects}
//         defaultProjectId={taskProject?.id}
//         onClose={() => setTaskProject(null)}
//       />
//     </>
//   );
// }





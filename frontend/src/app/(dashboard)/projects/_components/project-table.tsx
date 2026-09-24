'use client';

import type { Project, ProjectStatus } from '@/types/project';

const STATUS_STYLES: Record<ProjectStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function formatMoney(amount?: string | null, currency?: string) {
  if (!amount) return <span className="text-gray-300">—</span>;
  const n = Number(amount);
  return `${currency ?? 'USD'} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(d?: string | null) {
  if (!d) return <span className="text-gray-300">—</span>;
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// 👇 NEW: task progress helper — flattens tasks from all milestones
function getTaskStats(project: Project) {
  const allTasks = project.milestones.flatMap((m) => m.tasks ?? []);
  const total = allTasks.length;
  const completed = allTasks.filter((t) => t.isCompleted).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percent };
}

// 👇 NEW: small progress bar component
function TaskProgressBar({ completed, total, percent }: { completed: number; total: number; percent: number }) {
  if (total === 0) {
    return <span className="text-xs text-gray-300">No tasks</span>;
  }
  return (
    <div className="w-32">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{completed}/{total} tasks</span>
        <span className="text-xs font-medium text-gray-600">{percent}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

interface Props {
  projects:   Project[];
  onView:     (p: Project) => void;
  onEdit:     (p: Project) => void;
  onArchive:  (p: Project) => void;
  onRestore:  (p: Project) => void;
  onDelete:   (p: Project) => void;
  busyId:     string | null;
}

export function ProjectTable({ projects, onView, onEdit, onArchive, onRestore, onDelete, busyId }: Props) {
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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            {['Project', 'Status', 'Progress', 'Timeline', 'Budget', 'Tags', 'Actions'].map((h) => (
              <th key={h} className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {projects.map((p) => {
            const { completed, total, percent } = getTaskStats(p);
            return (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div
                    className="flex items-center gap-2.5 cursor-pointer"
                    onClick={() => onView(p)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') onView(p); }}
                  >
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color ?? '#6366f1' }} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 hover:text-indigo-600">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.milestones.length} milestone{p.milestones.length !== 1 ? 's' : ''} · {p.projectMembers.length} member{p.projectMembers.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                <td className="px-6 py-4">
                  <TaskProgressBar completed={completed} total={total} percent={percent} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                  {formatDate(p.startDate)} → {formatDate(p.endDate)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatMoney(p.budgetAmount, p.currency)}
                  <span className="text-xs text-gray-400 ml-1 capitalize">({p.budgetType.replace('_', ' ')})</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1 max-w-[180px]">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                    {p.tags.length > 3 && <span className="text-xs text-gray-400">+{p.tags.length - 3}</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onView(p)} className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">View</button>
                    <span className="text-gray-200">|</span>
                    <button onClick={() => onEdit(p)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900 transition-colors">Edit</button>
                    <span className="text-gray-200">|</span>
                    {p.isArchived ? (
                      <button onClick={() => onRestore(p)} disabled={busyId === p.id}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-800 transition-colors disabled:opacity-50">
                        {busyId === p.id ? 'Restoring…' : 'Restore'}
                      </button>
                    ) : (
                      <button onClick={() => onArchive(p)} disabled={busyId === p.id}
                        className="text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors disabled:opacity-50">
                        {busyId === p.id ? 'Archiving…' : 'Archive'}
                      </button>
                    )}
                    <span className="text-gray-200">|</span>
                    <button onClick={() => onDelete(p)} disabled={busyId === p.id}
                      className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


// 'use client';

// import type { Project, ProjectStatus } from '@/types/project';

// const STATUS_STYLES: Record<ProjectStatus, string> = {
//   active: 'bg-emerald-100 text-emerald-700',
//   on_hold: 'bg-amber-100 text-amber-700',
//   completed: 'bg-blue-100 text-blue-700',
//   archived: 'bg-gray-100 text-gray-500',
// };

// function StatusBadge({ status }: { status: ProjectStatus }) {
//   return (
//     <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
//       {status.replace('_', ' ')}
//     </span>
//   );
// }

// function formatMoney(amount?: string | null, currency?: string) {
//   if (!amount) return <span className="text-gray-300">—</span>;
//   const n = Number(amount);
//   return `${currency ?? 'USD'} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
// }

// function formatDate(d?: string | null) {
//   if (!d) return <span className="text-gray-300">—</span>;
//   return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
// }

// interface Props {
//   projects:   Project[];
//   onView:     (p: Project) => void;
//   onEdit:     (p: Project) => void;
//   onArchive:  (p: Project) => void;
//   onRestore:  (p: Project) => void;
//   onDelete:   (p: Project) => void;
//   busyId:     string | null;
// }

// export function ProjectTable({ projects, onView, onEdit, onArchive, onRestore, onDelete, busyId }: Props) {
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
//     <div className="overflow-x-auto">
//       <table className="min-w-full divide-y divide-gray-200">
//         <thead>
//           <tr className="bg-gray-50">
//             {['Project', 'Status', 'Timeline', 'Budget', 'Tags', 'Actions'].map((h) => (
//               <th key={h} className={`px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
//             ))}
//           </tr>
//         </thead>
//         <tbody className="bg-white divide-y divide-gray-100">
//           {projects.map((p) => (
//             <tr key={p.id} className="hover:bg-gray-50 transition-colors">
//               <td className="px-6 py-4">
//                 <div
//                   className="flex items-center gap-2.5 cursor-pointer"
//                   onClick={() => onView(p)}
//                   role="button"
//                   tabIndex={0}
//                   onKeyDown={(e) => { if (e.key === 'Enter') onView(p); }}
//                 >
//                   <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color ?? '#6366f1' }} />
//                   <div>
//                     <p className="text-sm font-medium text-gray-900 hover:text-indigo-600">{p.name}</p>
//                     <p className="text-xs text-gray-400 mt-0.5">{p.milestones.length} milestone{p.milestones.length !== 1 ? 's' : ''} · {p.projectMembers.length} member{p.projectMembers.length !== 1 ? 's' : ''}</p>
//                   </div>
//                 </div>
//               </td>
//               <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
//               <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
//                 {formatDate(p.startDate)} → {formatDate(p.endDate)}
//               </td>
//               <td className="px-6 py-4 text-sm text-gray-600">
//                 {formatMoney(p.budgetAmount, p.currency)}
//                 <span className="text-xs text-gray-400 ml-1 capitalize">({p.budgetType.replace('_', ' ')})</span>
//               </td>
//               <td className="px-6 py-4">
//                 <div className="flex flex-wrap gap-1 max-w-[180px]">
//                   {p.tags.slice(0, 3).map((t) => (
//                     <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
//                   ))}
//                   {p.tags.length > 3 && <span className="text-xs text-gray-400">+{p.tags.length - 3}</span>}
//                 </div>
//               </td>
//               <td className="px-6 py-4 text-right">
//                 <div className="flex items-center justify-end gap-2">
//                   <button onClick={() => onView(p)} className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">View</button>
//                   <span className="text-gray-200">|</span>
//                   <button onClick={() => onEdit(p)} className="text-sm font-medium text-indigo-600 hover:text-indigo-900 transition-colors">Edit</button>
//                   <span className="text-gray-200">|</span>
//                   {p.isArchived ? (
//                     <button onClick={() => onRestore(p)} disabled={busyId === p.id}
//                       className="text-sm font-medium text-emerald-600 hover:text-emerald-800 transition-colors disabled:opacity-50">
//                       {busyId === p.id ? 'Restoring…' : 'Restore'}
//                     </button>
//                   ) : (
//                     <button onClick={() => onArchive(p)} disabled={busyId === p.id}
//                       className="text-sm font-medium text-amber-600 hover:text-amber-800 transition-colors disabled:opacity-50">
//                       {busyId === p.id ? 'Archiving…' : 'Archive'}
//                     </button>
//                   )}
//                   <span className="text-gray-200">|</span>
//                   <button onClick={() => onDelete(p)} disabled={busyId === p.id}
//                     className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors disabled:opacity-50">
//                     Delete
//                   </button>
//                 </div>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }


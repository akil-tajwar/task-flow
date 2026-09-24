'use client';

import type { Project } from '@/types/project';

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatMoney(amount?: string | null, currency?: string) {
  if (!amount) return '—';
  const n = Number(amount);
  return `${currency ?? 'USD'} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// 👇 NEW: overall + per-milestone task stats
function getTaskStats(tasks: { isCompleted: boolean }[]) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.isCompleted).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, percent };
}

function ProgressBar({ percent, size = 'md' }: { percent: number; size?: 'sm' | 'md' }) {
  const height = size === 'sm' ? 'h-1' : 'h-2';
  return (
    <div className={`w-full rounded-full bg-gray-100 overflow-hidden ${height}`}>
      <div
        className={`h-full rounded-full transition-all ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

interface Props {
  project: Project | null;
  onClose: () => void;
  onEdit?: (p: Project) => void;
}

export function ProjectDetailModal({ project, onClose, onEdit }: Props) {
  if (!project) return null;

  const sortedMilestones = [...project.milestones].sort((a, b) => a.sortOrder - b.sortOrder);
  const completedCount = sortedMilestones.filter((m) => m.isCompleted).length;

  // 👇 NEW: overall task progress across all milestones
  const allTasks = sortedMilestones.flatMap((m) => m.tasks ?? []);
  const overallStats = getTaskStats(allTasks);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: project.color ?? '#6366f1' }} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
              {project.description && (
                <p className="text-sm text-gray-500 mt-0.5 max-w-md">{project.description}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status + Timeline + Budget grid */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
              <p className="text-sm text-gray-800 capitalize">{project.status.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Timeline</p>
              <p className="text-sm text-gray-800">{formatDate(project.startDate)} → {formatDate(project.endDate)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Budget</p>
              <p className="text-sm text-gray-800">
                {formatMoney(project.budgetAmount, project.currency)}
                <span className="text-xs text-gray-400 ml-1 capitalize">({project.budgetType.replace('_', ' ')})</span>
              </p>
            </div>
          </div>

          {/* 👇 NEW: Overall task progress */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Task Progress</p>
              <p className="text-xs text-gray-500">
                {overallStats.completed}/{overallStats.total} tasks · {overallStats.percent}%
              </p>
            </div>
            <ProgressBar percent={overallStats.percent} />
          </div>

          {/* Tags — full list, no truncation */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Tags {project.tags.length > 0 && `(${project.tags.length})`}
            </p>
            {project.tags.length === 0 ? (
              <p className="text-sm text-gray-400">No tags</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {project.tags.map((t) => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Members ({project.projectMembers.length})
            </p>
            {project.projectMembers.length === 0 ? (
              <p className="text-sm text-gray-400">No members assigned</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {project.projectMembers.map((m) => (
                  <span key={m.memberName} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                    {m.memberName}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Milestones — full detail + per-milestone task progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Milestones ({sortedMilestones.length})
              </p>
              {sortedMilestones.length > 0 && (
                <p className="text-xs text-gray-400">{completedCount}/{sortedMilestones.length} completed</p>
              )}
            </div>

            {sortedMilestones.length === 0 ? (
              <p className="text-sm text-gray-400">No milestones yet.</p>
            ) : (
              <div className="space-y-2">
                {sortedMilestones.map((m) => {
                  const mStats = getTaskStats(m.tasks ?? []);
                  return (
                    <div key={m.id ?? m.name} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                          m.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-medium ${m.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {m.name}
                            </p>
                            {m.dueDate && (
                              <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(m.dueDate)}</span>
                            )}
                          </div>
                          {m.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                          )}

                          {/* 👇 NEW: per-milestone task progress (only if it has tasks) */}
                          {mStats.total > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1">
                                <ProgressBar percent={mStats.percent} size="sm" />
                              </div>
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {mStats.completed}/{mStats.total} tasks
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Close
          </button>
          {onEdit && (
            <button type="button" onClick={() => onEdit(project)}
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
              Edit project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}



// 'use client';

// import type { Project } from '@/types/project';

// function formatDate(d?: string | null) {
//   if (!d) return '—';
//   return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
// }

// function formatMoney(amount?: string | null, currency?: string) {
//   if (!amount) return '—';
//   const n = Number(amount);
//   return `${currency ?? 'USD'} ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
// }

// interface Props {
//   project: Project | null;
//   onClose: () => void;
//   onEdit?: (p: Project) => void;
// }

// export function ProjectDetailModal({ project, onClose, onEdit }: Props) {
//   if (!project) return null;

//   const sortedMilestones = [...project.milestones].sort((a, b) => a.sortOrder - b.sortOrder);
//   const completedCount = sortedMilestones.filter((m) => m.isCompleted).length;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//       <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

//       <div className="relative z-10 w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl">
//         {/* Header */}
//         <div className="flex items-start justify-between border-b px-6 py-4 flex-shrink-0">
//           <div className="flex items-center gap-2.5">
//             <span className="h-3 w-3 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: project.color ?? '#6366f1' }} />
//             <div>
//               <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
//               {project.description && (
//                 <p className="text-sm text-gray-500 mt-0.5 max-w-md">{project.description}</p>
//               )}
//             </div>
//           </div>
//           <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
//             <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//             </svg>
//           </button>
//         </div>

//         {/* Body */}
//         <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
//           {/* Status + Timeline + Budget grid */}
//           <div className="grid grid-cols-3 gap-4">
//             <div>
//               <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</p>
//               <p className="text-sm text-gray-800 capitalize">{project.status.replace('_', ' ')}</p>
//             </div>
//             <div>
//               <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Timeline</p>
//               <p className="text-sm text-gray-800">{formatDate(project.startDate)} → {formatDate(project.endDate)}</p>
//             </div>
//             <div>
//               <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Budget</p>
//               <p className="text-sm text-gray-800">
//                 {formatMoney(project.budgetAmount, project.currency)}
//                 <span className="text-xs text-gray-400 ml-1 capitalize">({project.budgetType.replace('_', ' ')})</span>
//               </p>
//             </div>
//           </div>

//           {/* Tags — full list, no truncation */}
//           <div>
//             <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
//               Tags {project.tags.length > 0 && `(${project.tags.length})`}
//             </p>
//             {project.tags.length === 0 ? (
//               <p className="text-sm text-gray-400">No tags</p>
//             ) : (
//               <div className="flex flex-wrap gap-1.5">
//                 {project.tags.map((t) => (
//                   <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{t}</span>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Members */}
//           <div>
//             <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
//               Members ({project.projectMembers.length})
//             </p>
//             {project.projectMembers.length === 0 ? (
//               <p className="text-sm text-gray-400">No members assigned</p>
//             ) : (
//               <div className="flex flex-wrap gap-1.5">
//                 {project.projectMembers.map((m) => (
//                   <span key={m.memberName} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
//                     {m.memberName}
//                   </span>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Milestones — full detail */}
//           <div>
//             <div className="flex items-center justify-between mb-2">
//               <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
//                 Milestones ({sortedMilestones.length})
//               </p>
//               {sortedMilestones.length > 0 && (
//                 <p className="text-xs text-gray-400">{completedCount}/{sortedMilestones.length} completed</p>
//               )}
//             </div>

//             {sortedMilestones.length === 0 ? (
//               <p className="text-sm text-gray-400">No milestones yet.</p>
//             ) : (
//               <div className="space-y-2">
//                 {sortedMilestones.map((m) => (
//                   <div key={m.id ?? m.name} className="flex items-start gap-3 border border-gray-200 rounded-lg p-3">
//                     <div className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 ${
//                       m.isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
//                     }`} />
//                     <div className="flex-1 min-w-0">
//                       <div className="flex items-center justify-between gap-2">
//                         <p className={`text-sm font-medium ${m.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
//                           {m.name}
//                         </p>
//                         {m.dueDate && (
//                           <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(m.dueDate)}</span>
//                         )}
//                       </div>
//                       {m.description && (
//                         <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
//                       )}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
//           <button type="button" onClick={onClose}
//             className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
//             Close
//           </button>
//           {onEdit && (
//             <button type="button" onClick={() => onEdit(project)}
//               className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
//               Edit project
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
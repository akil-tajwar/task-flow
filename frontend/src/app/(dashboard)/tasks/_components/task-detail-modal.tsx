'use client';

import { useState, useRef } from 'react';
import type { Task } from '@/types/task';
import { useTaskComments, useCreateComment, useDeleteComment } from '@/hooks/use-tasks';
import { fileToAttachment, type PendingAttachment } from '@/lib/file-to-attachment';

function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isImage(type: string) {
  return type.startsWith('image/');
}

interface Props {
  task: Task | null;
  assigneeNameById: Record<string, string>;
  currentUserId: string;
  onClose: () => void;
  onEdit: (t: Task) => void;
}

export function TaskDetailModal({ task, assigneeNameById, currentUserId, onClose, onEdit }: Props) {
  const [comment, setComment] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [converting, setConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: comments = [], isLoading } = useTaskComments(task?.id ?? null);
  const createComment = useCreateComment(task?.id ?? '');
  const deleteComment = useDeleteComment(task?.id ?? '');

  if (!task) return null;

  const addFiles = async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList).slice(0, 10 - pendingFiles.length);
    if (!arr.length) return;
    setConverting(true);
    try {
      const converted = await Promise.all(arr.map(fileToAttachment));
      setPendingFiles((prev) => [...prev, ...converted]);
    } finally {
      setConverting(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData.items)
      .filter((i) => i.kind === 'file')
      .map((i) => i.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length) addFiles(files);
  };

  const removeFile = (index: number) => setPendingFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSend = async () => {
    if (!comment.trim() && pendingFiles.length === 0) return;
    await createComment.mutateAsync({ content: comment.trim(), attachments: pendingFiles });
    setComment('');
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between border-b px-6 py-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{task.title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {task.description && <p className="text-sm text-gray-600">{task.description}</p>}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Assignee</p>
              <p className="text-sm text-gray-800">{task.assigneeId ? assigneeNameById[task.assigneeId] ?? '—' : 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Start → Due</p>
              <p className="text-sm text-gray-800">{formatDate(task.startDate)} → {formatDate(task.dueDate)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Hours</p>
              <p className="text-sm text-gray-800">{task.actualHours ?? '0'} / {task.estimatedHours ?? '—'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Comments ({comments.length})</p>

            <div className="space-y-3 mb-4">
              {isLoading ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-gray-400">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start justify-between gap-3 border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <div className="min-w-0 flex-1">
                      {c.content && <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.content}</p>}
                      {!!c.attachments?.length && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {c.attachments.map((a, i) =>
                            isImage(a.type) ? (
                              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer">
                                <img src={a.url} alt={a.name} className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                              </a>
                            ) : (
                              <a key={i} href={a.url} download={a.name}
                                className="text-xs text-indigo-600 underline">
                                {a.name}
                              </a>
                            )
                          )}
                        </div>
                      )}
                    </div>
                    {c.userId === currentUserId && (
                      <button onClick={() => deleteComment.mutate(c.id)} className="text-xs text-red-500 hover:text-red-700 flex-shrink-0">
                        Delete
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="relative">
                    {isImage(f.type) ? (
                      <img src={f.url} alt={f.name} className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                    ) : (
                      <div className="h-16 w-16 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-[10px] text-gray-500 px-1 text-center">
                        {f.name}
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Write a comment… (paste a screenshot with Ctrl+V)"
                rows={1}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={converting}
                title="Attach files"
                className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                📎
              </button>

              <button
                onClick={handleSend}
                disabled={(!comment.trim() && pendingFiles.length === 0) || createComment.isPending || converting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {createComment.isPending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Close
          </button>
          <button type="button" onClick={() => onEdit(task)} className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
            Edit task
          </button>
        </div>
      </div>
    </div>
  );
}
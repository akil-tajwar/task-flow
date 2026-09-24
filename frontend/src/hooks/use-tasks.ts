'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskComment,
  TaskAttachment,
} from '@/types/task';

// NOTE: backend /tasks/getAll returns a plain array (no total/totalPages) —
// same shape quirk as /projects/getAll's non-empty case.
function normalizeTasksResponse(raw: unknown): Task[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: Task[] }).data;
  }
  return [];
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery<Task[]>({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const { data } = await api.get('/tasks/getAll', { params: filters });
      return normalizeTasksResponse(data);
    },
  });
}

export function useTask(id: string | null) {
  return useQuery<Task>({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/getById/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// The backend's Zod schema marks many fields `.nullable()` WITHOUT `.optional()`,
// so it requires the key to be present (value can be null, but not undefined/missing).
// This fills every nullable field with `null` explicitly so JSON.stringify doesn't drop it.
function toTaskPayload(input: CreateTaskInput) {
  return {
    title: input.title,
    description: input.description ?? null,
    status: input.status,
    priority: input.priority,
    projectId: input.projectId,
    parentTaskId: input.parentTaskId ?? null,
    milestoneId: input.milestoneId ?? null,
    assigneeId: input.assigneeId ?? null,
    startDate: input.startDate ?? null,
    dueDate: input.dueDate ?? null,
    estimatedHours: input.estimatedHours ?? null,
    actualHours: input.actualHours ?? null,
    sortOrder: input.sortOrder ?? 0,
    isBillable: input.isBillable ?? true,
    tags: input.tags ?? [],
  };
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data } = await api.post('/tasks/create', toTaskPayload(input));
      return data as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskInput & { id: string }) => {
      const { data } = await api.put(`/tasks/edit/${id}`, toTaskPayload(input as CreateTaskInput));
      return data as Task;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task', vars.id] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/delete/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

// ---- Comments ----

export function useTaskComments(taskId: string | null) {
  return useQuery<TaskComment[]>({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/comments/getAll/${taskId}`);
      return data;
    },
    enabled: !!taskId,
  });
}

export function useCreateComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      content,
      attachments,
    }: {
      content: string;
      attachments?: TaskAttachment[];
    }) => {
      const { data } = await api.post('/tasks/comments/create', {
        taskId,
        content,
        parentCommentId: null,
        attachments: attachments && attachments.length > 0 ? attachments : null,
      });
      return data as TaskComment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-comments', taskId] }),
  });
}

export function useDeleteComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/tasks/comments/delete/${commentId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-comments', taskId] }),
  });
}
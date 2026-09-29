"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilters,
  TaskComment,
  TaskProgress,
  AddProgressInput,
} from "@/types/task";

// NOTE: backend /tasks/getAll returns a plain array (no total/totalPages) —
// same shape quirk as /projects/getAll's non-empty case.
function normalizeTasksResponse(raw: unknown): Task[] {
  if (Array.isArray(raw)) return raw;
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as { data?: unknown }).data)
  ) {
    return (raw as { data: Task[] }).data;
  }
  return [];
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery<Task[]>({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      const { data } = await api.get("/tasks/getAll", { params: filters });
      return normalizeTasksResponse(data);
    },
  });
}

export function useTask(id: string | null) {
  return useQuery<Task>({
    queryKey: ["task", id],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/getById/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

// The backend's Zod `newTasksSchema` marks most fields `.nullable()`
// WITHOUT `.optional()`, so it requires the key to be present (value can be
// null, but not undefined/missing). This fills every nullable field with
// `null` explicitly so JSON.stringify doesn't drop it.
//
// `status` is deliberately never sent here — see the comment on
// createTaskInputSchema in types/task.ts. Use useMarkTaskDone /
// useMarkTaskBlocked (or log 100% progress) to change a task's status.
function toTaskPayload(input: CreateTaskInput | UpdateTaskInput) {
  return {
    title: input.title,
    description: input.description ?? null,
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
      const { data } = await api.post("/tasks/create", toTaskPayload(input));
      return data as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskInput & { id: string }) => {
      const { data } = await api.put(`/tasks/edit/${id}`, toTaskPayload(input));
      return data as Task;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", vars.id] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/delete/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

// ---- Status transitions ----
// The backend changes a task's status through these dedicated PATCH
// endpoints (taskController.submit / done / blocked), or automatically when
// progress reaches 100% (in_review). None of the service methods behind the
// PATCH endpoints check the task's current status before transitioning, so
// any of them can be called from any state.
// `done` also sets isCompleted + completedAt server-side; `submit` and
// `blocked` clear completedAt (see taskService.changeStatus).

function useStatusTransition(path: "submit" | "done" | "blocked") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/tasks/${path}/${id}`);
      return data as Task;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", id] });
      qc.invalidateQueries({ queryKey: ["tasks-in-review"] });
    },
  });
}

/** in_progress -> in_review (no longer used by the UI: 100% progress auto-submits) */
export function useSubmitTask() {
  return useStatusTransition("submit");
}

/** any -> done */
export function useMarkTaskDone() {
  return useStatusTransition("done");
}

/** any -> blocked */
export function useMarkTaskBlocked() {
  return useStatusTransition("blocked");
}

// ---- Task progress ----
// Each entry is one work session (startedAt → endedAt) with the cumulative
// percentage at the end of it. The backend:
//   - recomputes task.actualHours from ALL sessions
//   - rejects overlapping time ranges and percentages lower than the last one
//   - moves the task to "in_review" automatically when the percentage is 100
//   - only allows the task's assignee to log progress

export interface AddProgressResult {
  progress: TaskProgress;
  task: Task;
  actualHours: number;
}

export function useTaskProgress(taskId: string | null) {
  return useQuery<TaskProgress[]>({
    queryKey: ["task-progress", taskId],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/progress/getAll/${taskId}`);
      return data;
    },
    enabled: !!taskId,
  });
}

export function useAddTaskProgress(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddProgressInput) => {
      const { data } = await api.post("/tasks/progress/create", {
        taskId,
        ...input,
      });
      return data as AddProgressResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-progress", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks-in-review"] });
    },
  });
}

// ---- Review queue ----
// /tasks/getInReview is a DIFFERENT shape from /tasks/getAll: it's always
// paginated ({ data, pagination }), it always filters status="in_review"
// server-side (so passing `status` in filters here has no effect), and it
// doesn't accept a `status` filter param at all on the backend.

export interface PaginatedTasks {
  data: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useTasksInReview(filters: Omit<TaskFilters, "status"> = {}) {
  return useQuery<PaginatedTasks>({
    queryKey: ["tasks-in-review", filters],
    queryFn: async () => {
      const { data } = await api.get("/tasks/getInReview", { params: filters });
      return data as PaginatedTasks;
    },
  });
}

// ---- Comments ----

export function useTaskComments(taskId: string | null) {
  return useQuery<TaskComment[]>({
    queryKey: ["task-comments", taskId],
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
      files,
    }: {
      content: string;
      files?: File[];
    }) => {
      const form = new FormData();

      // Text fields FIRST — multer reads them in order
      form.append("taskId", taskId);
      form.append("content", content);
      // form.append('parentCommentId', ''); // optional

      // Files AFTER
      files?.forEach((f) => form.append("attachments", f));

      const { data } = await api.post("/tasks/comments/create", form, {
        // Let the browser set Content-Type with the correct boundary
        headers: { "Content-Type": undefined as unknown as string },
      });

      return data as TaskComment;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
    },
  });
}

export function useDeleteComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/tasks/comments/delete/${commentId}`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["task-comments", taskId] }),
  });
}


// "use client";

// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { api } from "@/lib/api";
// import type {
//   Task,
//   CreateTaskInput,
//   UpdateTaskInput,
//   TaskFilters,
//   TaskComment,
//   TaskAttachment,
// } from "@/types/task";

// // NOTE: backend /tasks/getAll returns a plain array (no total/totalPages) —
// // same shape quirk as /projects/getAll's non-empty case.
// function normalizeTasksResponse(raw: unknown): Task[] {
//   if (Array.isArray(raw)) return raw;
//   if (
//     raw &&
//     typeof raw === "object" &&
//     Array.isArray((raw as { data?: unknown }).data)
//   ) {
//     return (raw as { data: Task[] }).data;
//   }
//   return [];
// }

// export function useTasks(filters: TaskFilters = {}) {
//   return useQuery<Task[]>({
//     queryKey: ["tasks", filters],
//     queryFn: async () => {
//       const { data } = await api.get("/tasks/getAll", { params: filters });
//       return normalizeTasksResponse(data);
//     },
//   });
// }

// export function useTask(id: string | null) {
//   return useQuery<Task>({
//     queryKey: ["task", id],
//     queryFn: async () => {
//       const { data } = await api.get(`/tasks/getById/${id}`);
//       return data;
//     },
//     enabled: !!id,
//   });
// }

// // The backend's Zod `newTasksSchema` marks most fields `.nullable()`
// // WITHOUT `.optional()`, so it requires the key to be present (value can be
// // null, but not undefined/missing). This fills every nullable field with
// // `null` explicitly so JSON.stringify doesn't drop it.
// //
// // `status` is deliberately never sent here — see the comment on
// // createTaskInputSchema in types/task.ts. Use useSubmitTask /
// // useMarkTaskDone / useMarkTaskBlocked to change a task's status.
// function toTaskPayload(input: CreateTaskInput | UpdateTaskInput) {
//   return {
//     title: input.title,
//     description: input.description ?? null,
//     priority: input.priority,
//     projectId: input.projectId,
//     parentTaskId: input.parentTaskId ?? null,
//     milestoneId: input.milestoneId ?? null,
//     assigneeId: input.assigneeId ?? null,
//     startDate: input.startDate ?? null,
//     dueDate: input.dueDate ?? null,
//     estimatedHours: input.estimatedHours ?? null,
//     actualHours: input.actualHours ?? null,
//     sortOrder: input.sortOrder ?? 0,
//     isBillable: input.isBillable ?? true,
//     tags: input.tags ?? [],
//   };
// }

// export function useCreateTask() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async (input: CreateTaskInput) => {
//       const { data } = await api.post("/tasks/create", toTaskPayload(input));
//       return data as Task;
//     },
//     onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
//   });
// }

// export function useUpdateTask() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async ({ id, ...input }: UpdateTaskInput & { id: string }) => {
//       const { data } = await api.put(`/tasks/edit/${id}`, toTaskPayload(input));
//       return data as Task;
//     },
//     onSuccess: (_data, vars) => {
//       qc.invalidateQueries({ queryKey: ["tasks"] });
//       qc.invalidateQueries({ queryKey: ["task", vars.id] });
//     },
//   });
// }

// export function useDeleteTask() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async (id: string) => {
//       await api.delete(`/tasks/delete/${id}`);
//     },
//     onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
//   });
// }

// // ---- Status transitions ----
// // The backend only changes a task's status through these three dedicated
// // PATCH endpoints (taskController.submit / done / blocked). None of the
// // service methods behind them check the task's current status before
// // transitioning, so any of the three can be called from any state.
// // `done` also sets isCompleted + completedAt server-side; `submit` and
// // `blocked` clear completedAt (see taskService.changeStatus).

// function useStatusTransition(path: "submit" | "done" | "blocked") {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async (id: string) => {
//       const { data } = await api.patch(`/tasks/${path}/${id}`);
//       return data as Task;
//     },
//     onSuccess: (_data, id) => {
//       qc.invalidateQueries({ queryKey: ["tasks"] });
//       qc.invalidateQueries({ queryKey: ["task", id] });
//       qc.invalidateQueries({ queryKey: ["tasks-in-review"] });
//     },
//   });
// }

// /** in_progress -> in_review */
// export function useSubmitTask() {
//   return useStatusTransition("submit");
// }

// /** any -> done */
// export function useMarkTaskDone() {
//   return useStatusTransition("done");
// }

// /** any -> blocked */
// export function useMarkTaskBlocked() {
//   return useStatusTransition("blocked");
// }

// // ---- Review queue ----
// // /tasks/getInReview is a DIFFERENT shape from /tasks/getAll: it's always
// // paginated ({ data, pagination }), it always filters status="in_review"
// // server-side (so passing `status` in filters here has no effect), and it
// // doesn't accept a `status` filter param at all on the backend.

// export interface PaginatedTasks {
//   data: Task[];
//   pagination: {
//     page: number;
//     limit: number;
//     total: number;
//     totalPages: number;
//   };
// }

// export function useTasksInReview(filters: Omit<TaskFilters, "status"> = {}) {
//   return useQuery<PaginatedTasks>({
//     queryKey: ["tasks-in-review", filters],
//     queryFn: async () => {
//       const { data } = await api.get("/tasks/getInReview", { params: filters });
//       return data as PaginatedTasks;
//     },
//   });
// }

// // ---- Comments ----

// export function useTaskComments(taskId: string | null) {
//   return useQuery<TaskComment[]>({
//     queryKey: ["task-comments", taskId],
//     queryFn: async () => {
//       const { data } = await api.get(`/tasks/comments/getAll/${taskId}`);
//       return data;
//     },
//     enabled: !!taskId,
//   });
// }

// export function useCreateComment(taskId: string) {
//   const qc = useQueryClient();

//   return useMutation({
//     mutationFn: async ({
//       content,
//       files,
//     }: {
//       content: string;
//       files?: File[];
//     }) => {
//       const form = new FormData();

//       // ⚠️ Text fields FIRST — multer reads them in order
//       form.append("taskId", taskId);
//       form.append("content", content);
//       // form.append('parentCommentId', ''); // optional

//       // Files AFTER
//       files?.forEach((f) => form.append("attachments", f));

//       const { data } = await api.post("/tasks/comments/create", form, {
//         // Let the browser set Content-Type with the correct boundary
//         headers: { "Content-Type": undefined as unknown as string },
//       });

//       return data as TaskComment;
//     },

//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
//     },
//   });
// }

// export function useDeleteComment(taskId: string) {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: async (commentId: string) => {
//       await api.delete(`/tasks/comments/delete/${commentId}`);
//     },
//     onSuccess: () =>
//       qc.invalidateQueries({ queryKey: ["task-comments", taskId] }),
//   });
// }


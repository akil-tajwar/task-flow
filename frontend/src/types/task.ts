import { z } from "zod";

// --- Base Enums ---
// Matches backend `taskStatusEnum` (db/schema/tasks.schema.ts) exactly.
// There is NO "todo" status on the backend — a new task is always created
// with status "in_progress" (hardcoded server-side in taskService.create,
// since `newTasksSchema` omits `status` on create entirely).
export const taskStatusSchema = z.enum([
  "in_progress",
  "in_review",
  "done",
  "blocked",
]);

export const taskPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

// --- Base Attachments Schema ---
export const taskAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  size: z.number(),
  type: z.string(),
});

// --- Tasks Schemas (full row shape — as returned by the backend) ---
export const tasksSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  projectId: z.string().uuid(),
  parentTaskId: z.string().uuid().nullable(),
  milestoneId: z.string().uuid().nullable(),
  title: z.string().max(500),
  description: z.string().nullable(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  assigneeId: z.string().uuid().nullable(),
  creatorId: z.string().uuid().nullable(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  isCompleted: z.boolean(),
  // Dates come back over HTTP as JSON-serialized ISO strings, not Date
  // instances — using z.date() here was a mismatch with what axios actually
  // hands back.
  completedAt: z.string().nullable(),
  estimatedHours: z.string().nullable(),
  actualHours: z.string().nullable(),
  sortOrder: z.number().int(),
  isBillable: z.boolean(),
  tags: z.array(z.string()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// --- Create Task Input Schema (what the CLIENT actually sends) ---
// `status` is intentionally NOT a field here: the backend's `newTasksSchema`
// omits it on create (taskService.create always forces status:
// "in_progress"), and `newTasksSchema.partial()` — used for update — has no
// `status` key either, since `.partial()` only makes existing keys
// optional, it can't resurrect an omitted one. So a `status` sent to either
// /tasks/create or /tasks/edit/:id is silently stripped by zod and does
// nothing. Use useMarkTaskDone / useMarkTaskBlocked (or log 100% progress)
// instead.
export const createTaskInputSchema = z.object({
  projectId: z.string().uuid(),
  parentTaskId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional(),
  priority: taskPrioritySchema,
  assigneeId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  // isCompleted is fully derived server-side from status — client never
  // sends this.
  estimatedHours: z.string().optional(),
  actualHours: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isBillable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

// --- Update Task Input Schema ---
export const updateTaskInputSchema = createTaskInputSchema.partial();

// --- Task Filters Schema ---
// Includes every query param the backend's taskController.getAll actually
// reads (parentTaskId was previously missing here).
export const taskFiltersSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  projectId: z.string().uuid().optional(),
  milestoneId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  search: z.string().optional(),
});

// --- Task Progress Schemas ---
// One row = one work session (startedAt → endedAt) plus the cumulative
// progress percentage reported at the end of that session, and an optional
// note describing what was done in the session.
export const taskProgressSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  taskId: z.string().uuid(),
  startedAt: z.string(),
  endedAt: z.string(),
  progressPercentage: z.number().int().min(0).max(100),
  comment: z.string().nullable(),
  createdAt: z.string(),
});

// What the client sends to POST /tasks/progress/create (taskId is added by
// the hook). Dates are ISO strings. `comment` is optional — the backend
// treats a missing/blank comment as null.
export const addProgressInputSchema = z.object({
  startedAt: z.string(),
  endedAt: z.string(),
  progressPercentage: z.number().int().min(0).max(100),
  comment: z.string().optional(),
});

// --- Task Dependencies Schema ---
export const taskDependenciesSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  dependsOnTaskId: z.string().uuid(),
  type: z.string().max(20),
  createdAt: z.string(),
});

// --- Comments Schema ---
export const commentsSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  content: z.string(),
  parentCommentId: z.string().uuid().nullable(),
  attachments: z.array(taskAttachmentSchema).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// --- Inferred Types ---
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type TaskAttachment = z.infer<typeof taskAttachmentSchema>;
export type TaskComment = z.infer<typeof commentsSchema>;
export type Task = z.infer<typeof tasksSchema>;
export type TaskProgress = z.infer<typeof taskProgressSchema>;
export type AddProgressInput = z.infer<typeof addProgressInputSchema>;
export type TaskDependency = z.infer<typeof taskDependenciesSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
export type TaskFilters = z.infer<typeof taskFiltersSchema>;


// import { z } from "zod";

// // --- Base Enums ---
// // Matches backend `taskStatusEnum` (db/schema/tasks.schema.ts) exactly.
// // There is NO "todo" status on the backend — a new task is always created
// // with status "in_progress" (hardcoded server-side in taskService.create,
// // since `newTasksSchema` omits `status` on create entirely).
// export const taskStatusSchema = z.enum([
//   "in_progress",
//   "in_review",
//   "done",
//   "blocked",
// ]);

// export const taskPrioritySchema = z.enum([
//   "low",
//   "medium",
//   "high",
//   "urgent",
// ]);

// // --- Base Attachments Schema ---
// export const taskAttachmentSchema = z.object({
//   name: z.string(),
//   url: z.string(),
//   size: z.number(),
//   type: z.string(),
// });

// // --- Tasks Schemas (full row shape — as returned by the backend) ---
// export const tasksSchema = z.object({
//   id: z.string().uuid(),
//   tenantId: z.string().uuid(),
//   projectId: z.string().uuid(),
//   parentTaskId: z.string().uuid().nullable(),
//   milestoneId: z.string().uuid().nullable(),
//   title: z.string().max(500),
//   description: z.string().nullable(),
//   status: taskStatusSchema,
//   priority: taskPrioritySchema,
//   assigneeId: z.string().uuid().nullable(),
//   creatorId: z.string().uuid().nullable(),
//   startDate: z.string().nullable(),
//   dueDate: z.string().nullable(),
//   isCompleted: z.boolean(),
//   // Dates come back over HTTP as JSON-serialized ISO strings, not Date
//   // instances — using z.date() here was a mismatch with what axios actually
//   // hands back.
//   completedAt: z.string().nullable(),
//   estimatedHours: z.string().nullable(),
//   actualHours: z.string().nullable(),
//   sortOrder: z.number().int(),
//   isBillable: z.boolean(),
//   tags: z.array(z.string()).nullable(),
//   createdAt: z.string(),
//   updatedAt: z.string(),
// });

// // --- Create Task Input Schema (what the CLIENT actually sends) ---
// // `status` is intentionally NOT a field here: the backend's `newTasksSchema`
// // omits it on create (taskService.create always forces status:
// // "in_progress"), and `newTasksSchema.partial()` — used for update — has no
// // `status` key either, since `.partial()` only makes existing keys
// // optional, it can't resurrect an omitted one. So a `status` sent to either
// // /tasks/create or /tasks/edit/:id is silently stripped by zod and does
// // nothing. Use useSubmitTask / useMarkTaskDone / useMarkTaskBlocked instead.
// export const createTaskInputSchema = z.object({
//   projectId: z.string().uuid(),
//   parentTaskId: z.string().uuid().optional(),
//   milestoneId: z.string().uuid().optional(),
//   title: z.string().min(1, "Title is required").max(500),
//   description: z.string().optional(),
//   priority: taskPrioritySchema,
//   assigneeId: z.string().uuid().optional(),
//   startDate: z.string().optional(),
//   dueDate: z.string().optional(),
//   // isCompleted is fully derived server-side from status — client never
//   // sends this.
//   estimatedHours: z.string().optional(),
//   actualHours: z.string().optional(),
//   sortOrder: z.number().int().optional(),
//   isBillable: z.boolean().optional(),
//   tags: z.array(z.string()).optional(),
// });

// // --- Update Task Input Schema ---
// export const updateTaskInputSchema = createTaskInputSchema.partial();

// // --- Task Filters Schema ---
// // Includes every query param the backend's taskController.getAll actually
// // reads (parentTaskId was previously missing here).
// export const taskFiltersSchema = z.object({
//   page: z.number().int().positive().optional(),
//   limit: z.number().int().positive().optional(),
//   projectId: z.string().uuid().optional(),
//   milestoneId: z.string().uuid().optional(),
//   parentTaskId: z.string().uuid().optional(),
//   assigneeId: z.string().uuid().optional(),
//   status: taskStatusSchema.optional(),
//   priority: taskPrioritySchema.optional(),
//   search: z.string().optional(),
// });

// // --- Task Dependencies Schema ---
// export const taskDependenciesSchema = z.object({
//   id: z.string().uuid(),
//   taskId: z.string().uuid(),
//   dependsOnTaskId: z.string().uuid(),
//   type: z.string().max(20),
//   createdAt: z.string(),
// });

// // --- Comments Schema ---
// export const commentsSchema = z.object({
//   id: z.string().uuid(),
//   tenantId: z.string().uuid(),
//   taskId: z.string().uuid().nullable(),
//   projectId: z.string().uuid().nullable(),
//   userId: z.string().uuid(),
//   content: z.string(),
//   parentCommentId: z.string().uuid().nullable(),
//   attachments: z.array(taskAttachmentSchema).nullable(),
//   createdAt: z.string(),
//   updatedAt: z.string(),
// });

// // --- Inferred Types ---
// export type TaskStatus = z.infer<typeof taskStatusSchema>;
// export type TaskPriority = z.infer<typeof taskPrioritySchema>;
// export type TaskAttachment = z.infer<typeof taskAttachmentSchema>;
// export type TaskComment = z.infer<typeof commentsSchema>;
// export type Task = z.infer<typeof tasksSchema>;
// export type TaskDependency = z.infer<typeof taskDependenciesSchema>;
// export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
// export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
// export type TaskFilters = z.infer<typeof taskFiltersSchema>;



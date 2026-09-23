import { z } from "zod";

export const tasksSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  projectId: z.string().uuid(),
  parentTaskId: z.string().uuid().nullable(),
  milestoneId: z.string().uuid().nullable(),
  title: z.string().max(500),
  description: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "in_review", "done", "blocked"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  assigneeId: z.string().uuid().nullable(),
  creatorId: z.string().uuid().nullable(),
  startDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  completedAt: z.date().nullable(),
  estimatedHours: z.string().nullable(),
  actualHours: z.string().nullable(),
  sortOrder: z.number().int(),
  isBillable: z.boolean(),
  tags: z.array(z.string()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const newTasksSchema = tasksSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const taskDependenciesSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  dependsOnTaskId: z.string().uuid(),
  type: z.string().max(20),
  createdAt: z.date(),
});

export const commentsSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  content: z.string(),
  parentCommentId: z.string().uuid().nullable(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        size: z.number(),
        type: z.string(),
      }),
    )
    .nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Task = z.infer<typeof tasksSchema>;
export type NewTask = z.infer<typeof newTasksSchema>;
export type Comment = z.infer<typeof commentsSchema>;

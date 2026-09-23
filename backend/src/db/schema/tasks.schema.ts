import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  date,
  integer,
  pgEnum,
  jsonb,
  unique,
  index,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.schema";
import { users } from "./users.schema";
import { projects, milestones } from "./projects.schema";

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
]);

export const priorityEnum = pgEnum("priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    parentTaskId: uuid("parent_task_id").references(
      (): AnyPgColumn => tasks.id,
      { onDelete: "cascade" },
    ),
    milestoneId: uuid("milestone_id").references(() => milestones.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("todo"),
    priority: priorityEnum("priority").notNull().default("medium"),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    creatorId: uuid("creator_id").references(() => users.id, {
      onDelete: "set null",
    }),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    estimatedHours: decimal("estimated_hours", { precision: 10, scale: 2 }),
    actualHours: decimal("actual_hours", { precision: 10, scale: 2 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isBillable: boolean("is_billable").notNull().default(true),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    tags: jsonb("tags").$type<string[]>().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("tasks_tenant_idx").on(t.tenantId),
    index("tasks_project_idx").on(t.projectId),
    index("tasks_assignee_idx").on(t.assigneeId),
    index("tasks_status_idx").on(t.status),
    index("tasks_parent_idx").on(t.parentTaskId),
    index("tasks_due_date_idx").on(t.dueDate),
  ],
);

export const taskDependencies = pgTable(
  "task_dependencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    dependsOnTaskId: uuid("depends_on_task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull().default("finish_to_start"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.taskId, t.dependsOnTaskId),
    index("task_deps_task_idx").on(t.taskId),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    parentCommentId: uuid("parent_comment_id").references(
      (): AnyPgColumn => comments.id,
      { onDelete: "cascade" },
    ),
    attachments:
      jsonb("attachments").$type<
        Array<{ name: string; url: string; size: number; type: string }>
      >(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("comments_task_idx").on(t.taskId),
    index("comments_project_idx").on(t.projectId),
    index("comments_user_idx").on(t.userId),
  ],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Comment = typeof comments.$inferSelect;

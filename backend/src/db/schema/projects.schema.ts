import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  jsonb,
  date,
  integer,
  pgEnum,
  primaryKey,
  index,
  AnyPgColumn,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.schema";
import { users } from "./users.schema";
import { clients } from "./clients.schema";

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "on_hold",
  "completed",
  "archived",
  "cancelled",
]);

export const projectViewEnum = pgEnum("project_view", [
  "list",
  "table",
  "board",
  "gantt",
]);

export const budgetTypeEnum = pgEnum("budget_type", [
  "time",
  "financial",
  "fixed_fee",
  "task_list",
  "expense",
]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: projectStatusEnum("status").notNull().default("active"),
    defaultView: projectViewEnum("default_view").notNull().default("list"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    budgetType: budgetTypeEnum("budget_type"),
    budgetAmount: decimal("budget_amount", { precision: 15, scale: 2 }),
    budgetHours: decimal("budget_hours", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    isBillable: boolean("is_billable").notNull().default(true),
    isTemplate: boolean("is_template").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    archivedAt: timestamp("archived_at"),
    templateSourceId: uuid("template_source_id").references(
      (): AnyPgColumn => projects.id,
      { onDelete: "set null" },
    ),
    ownerId: uuid("owner_id").references(() => users.id, {
      onDelete: "set null",
    }),
    color: varchar("color", { length: 7 }),
    tags: jsonb("tags").$type<string[]>().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("projects_tenant_idx").on(t.tenantId),
    index("projects_client_idx").on(t.clientId),
    index("projects_status_idx").on(t.status),
    index("projects_owner_idx").on(t.ownerId),
  ],
);

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at"),
    isCompleted: boolean("is_completed").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("milestones_project_idx").on(t.projectId)],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;

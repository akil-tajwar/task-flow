import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  decimal,
  date,
  time,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { projects } from "./projects";
import { tasks } from "./tasks";

export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    ticketId: uuid("ticket_id"),
    description: text("description"),
    date: date("date").notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    hours: decimal("hours", { precision: 6, scale: 2 }).notNull(),
    isBillable: boolean("is_billable").notNull().default(true),
    billableRate: decimal("billable_rate", { precision: 10, scale: 2 }),
    isApproved: boolean("is_approved").notNull().default(false),
    approvedBy: uuid("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at"),
    invoiceId: uuid("invoice_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("time_entries_tenant_idx").on(t.tenantId),
    index("time_entries_user_date_idx").on(t.userId, t.date),
    index("time_entries_project_idx").on(t.projectId),
    index("time_entries_task_idx").on(t.taskId),
    index("time_entries_approved_idx").on(t.isApproved),
  ],
);

export const timesheetApprovals = pgTable(
  "timesheet_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStartDate: date("week_start_date").notNull(),
    weekEndDate: date("week_end_date").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    submittedAt: timestamp("submitted_at"),
    approvedBy: uuid("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.weekStartDate)],
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    eventType: varchar("event_type", { length: 30 })
      .notNull()
      .default("meeting"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    isAllDay: boolean("is_all_day").notNull().default(false),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    externalId: varchar("external_id", { length: 255 }),
    externalProvider: varchar("external_provider", { length: 50 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("calendar_events_user_date_idx").on(t.userId, t.startTime),
    index("calendar_events_external_idx").on(t.externalProvider, t.externalId),
  ],
);

export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

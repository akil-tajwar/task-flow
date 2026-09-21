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
  unique,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.schema";
import { users } from "./users.schema";
import { clients } from "./clients.schema";
import { projects } from "./projects.schema";
import { tasks } from "./tasks.schema";
import { timeEntries } from "./time-tracking.schema";

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
]);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    budgetType: varchar("budget_type", { length: 30 }).notNull(),
    name: varchar("name", { length: 255 }),
    amount: decimal("amount", { precision: 15, scale: 2 }),
    hours: decimal("hours", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    alertThresholdPercent: integer("alert_threshold_percent").default(80),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("budgets_project_idx").on(t.projectId)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 500 }).notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD"),
    category: varchar("category", { length: 100 }),
    date: date("date").notNull(),
    receiptUrl: text("receipt_url"),
    isBillable: boolean("is_billable").notNull().default(true),
    isInvoiced: boolean("is_invoiced").notNull().default(false),
    invoiceId: uuid("invoice_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("expenses_tenant_idx").on(t.tenantId),
    index("expenses_project_idx").on(t.projectId),
    index("expenses_user_idx").on(t.userId),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    currency: varchar("currency", { length: 3 }).default("USD"),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
    taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).default(
      "0",
    ),
    notes: text("notes"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.tenantId, t.invoiceNumber),
    index("invoices_tenant_idx").on(t.tenantId),
    index("invoices_client_idx").on(t.clientId),
  ],
);

export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 500 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    timeEntryId: uuid("time_entry_id").references(() => timeEntries.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("invoice_line_items_invoice_idx").on(t.invoiceId)],
);

export const retainers = pgTable(
  "retainers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    hours: decimal("hours", { precision: 10, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("retainers_tenant_idx").on(t.tenantId),
    index("retainers_client_idx").on(t.clientId),
  ],
);

export type Invoice = typeof invoices.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Retainer = typeof retainers.$inferSelect;

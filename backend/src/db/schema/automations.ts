import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

export const automations = pgTable(
  "automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    triggerType: varchar("trigger_type", { length: 50 }).notNull(),
    triggerConfig: jsonb("trigger_config").$type<Record<string, unknown>>(),
    actions: jsonb("actions").$type<Array<Record<string, unknown>>>(),
    isActive: boolean("is_active").notNull().default(true),
    runCount: integer("run_count").notNull().default(0),
    lastRunAt: timestamp("last_run_at"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("automations_tenant_idx").on(t.tenantId)],
);

export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull(),
    triggerPayload: jsonb("trigger_payload"),
    result: jsonb("result"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [index("automation_runs_automation_idx").on(t.automationId)],
);

export type Automation = typeof automations.$inferSelect;
export type AutomationRun = typeof automationRuns.$inferSelect;

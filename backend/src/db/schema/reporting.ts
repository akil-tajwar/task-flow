import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

export const dashboards = pgTable(
  "dashboards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isShared: boolean("is_shared").notNull().default(false),
    layout: jsonb("layout").$type<Array<Record<string, unknown>>>(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("dashboards_tenant_idx").on(t.tenantId)],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    reportType: varchar("report_type", { length: 50 }).notNull(),
    filters: jsonb("filters").$type<Record<string, unknown>>(),
    columns: jsonb("columns").$type<string[]>(),
    schedule: jsonb("schedule").$type<{
      frequency?: string;
      recipients?: string[];
      nextRunAt?: string;
    }>(),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("reports_tenant_idx").on(t.tenantId)],
);

export type Dashboard = typeof dashboards.$inferSelect;
export type Report = typeof reports.$inferSelect;

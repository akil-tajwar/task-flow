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
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.schema";
import { users } from "./users.schema";
import { projects } from "./projects.schema";
import { roles } from "./roles.schema";
import { skills } from "./skills.schema";

export const resourceAllocations = pgTable(
  "resource_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    roleId: uuid("role_id").references(() => roles.id, {
      onDelete: "set null",
    }),
    skillId: uuid("skill_id").references(() => skills.id, {
      onDelete: "set null",
    }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    hoursPerDay: decimal("hours_per_day", { precision: 5, scale: 2 }),
    allocationPercent: integer("allocation_percent").default(100),
    isTentative: boolean("is_tentative").notNull().default(false),
    isPlaceholder: boolean("is_placeholder").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("allocations_tenant_idx").on(t.tenantId),
    index("allocations_user_idx").on(t.userId),
    index("allocations_project_idx").on(t.projectId),
    index("allocations_date_range_idx").on(t.startDate, t.endDate),
  ],
);

export const holidays = pgTable(
  "holidays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    date: date("date").notNull(),
    region: varchar("region", { length: 100 }),
    isRecurring: boolean("is_recurring").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("holidays_tenant_date_idx").on(t.tenantId, t.date)],
);

export type ResourceAllocation = typeof resourceAllocations.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;

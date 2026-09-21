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
import { tenants } from "./tenants.schema";

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    slug: varchar("slug", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    targetProjectId: uuid("target_project_id"),
    conditionalLogic:
      jsonb("conditional_logic").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("forms_tenant_idx").on(t.tenantId)],
);

export const formFields = pgTable(
  "form_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 255 }).notNull(),
    fieldType: varchar("field_type", { length: 30 }).notNull(),
    isRequired: boolean("is_required").notNull().default(false),
    options: jsonb("options").$type<string[]>(),
    placeholder: varchar("placeholder", { length: 255 }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("form_fields_form_idx").on(t.formId)],
);

export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    submittedByEmail: varchar("submitted_by_email", { length: 255 }),
    createdTaskId: uuid("created_task_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("form_submissions_form_idx").on(t.formId)],
);

export type Form = typeof forms.$inferSelect;
export type FormSubmission = typeof formSubmissions.$inferSelect;

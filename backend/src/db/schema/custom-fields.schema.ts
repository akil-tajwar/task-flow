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

export const customFieldDefinitions = pgTable(
  "custom_field_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    fieldType: varchar("field_type", { length: 50 }).notNull(),
    options: jsonb("options").$type<string[]>(),
    defaultValue: text("default_value"),
    formula: text("formula"),
    isRequired: boolean("is_required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("cf_defs_tenant_entity_idx").on(t.tenantId, t.entityType)],
);

export const customFieldValues = pgTable(
  "custom_field_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => customFieldDefinitions.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    value: text("value"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("cf_values_field_entity_idx").on(t.fieldId, t.entityId)],
);

export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type CustomFieldValue = typeof customFieldValues.$inferSelect;

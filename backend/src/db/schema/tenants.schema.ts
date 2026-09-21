import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const planTierEnum = pgEnum("plan_tier", [
  "basics",
  "accelerate",
  "optimize",
  "enterprise",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  logoUrl: text("logo_url"),
  planTier: planTierEnum("plan_tier").notNull().default("basics"),
  customBranding: jsonb("custom_branding").$type<{
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
  }>(),
  settings: jsonb("settings").$type<Record<string, unknown>>(),
  trialEndsAt: timestamp("trial_ends_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

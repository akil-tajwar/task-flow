import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants.schema";
import { users } from "./users.schema";

export const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isPrivate: boolean("is_private").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("spaces_tenant_idx").on(t.tenantId)],
);

export const spacePages = pgTable(
  "space_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    parentPageId: uuid("parent_page_id"),
    title: varchar("title", { length: 500 }).notNull(),
    content: jsonb("content").$type<Record<string, unknown>>(),
    contentHtml: text("content_html"),
    sortOrder: integer("sort_order").notNull().default(0),
    isRequiredReading: boolean("is_required_reading").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("space_pages_space_idx").on(t.spaceId)],
);

export const spacePageTags = pgTable(
  "space_page_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => spacePages.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 100 }).notNull(),
  },
  (t) => [
    unique().on(t.pageId, t.tag),
    index("space_page_tags_tag_idx").on(t.tag),
  ],
);

export const requiredReadingAcks = pgTable(
  "required_reading_acks",
  {
    pageId: uuid("page_id")
      .notNull()
      .references(() => spacePages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    acknowledgedAt: timestamp("acknowledged_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.pageId, t.userId),
    index("required_reading_page_idx").on(t.pageId),
  ],
);

export type Space = typeof spaces.$inferSelect;
export type SpacePage = typeof spacePages.$inferSelect;

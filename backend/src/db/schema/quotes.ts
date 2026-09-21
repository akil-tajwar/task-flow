import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  date,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { clients } from "./clients";
import { projects } from "./projects";

export const quoteStatusEnum = pgEnum("quote_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "expired",
]);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    quoteNumber: varchar("quote_number", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    status: quoteStatusEnum("status").notNull().default("draft"),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),
    currency: varchar("currency", { length: 3 }).default("USD"),
    subtotal: decimal("subtotal", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
    total: decimal("total", { precision: 15, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    terms: text("terms"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.tenantId, t.quoteNumber),
    index("quotes_tenant_idx").on(t.tenantId),
  ],
);

export const quoteLineItems = pgTable(
  "quote_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 500 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    sortOrder: varchar("sort_order", { length: 10 }).default("0"),
  },
  (t) => [index("quote_line_items_quote_idx").on(t.quoteId)],
);

export type Quote = typeof quotes.$inferSelect;
export type QuoteLineItem = typeof quoteLineItems.$inferSelect;

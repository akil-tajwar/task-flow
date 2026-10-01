import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { tenants } from "./tenants.schema";
import { users } from "./users.schema";

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: varchar("device_id", { length: 64 }).notNull().unique(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    lastLoginAt: timestamp("last_login_at").notNull().defaultNow(),
    lastNotifiedAt: timestamp("last_notified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("push_subs_user_idx").on(t.userId)],
);

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
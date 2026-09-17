import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    industry: varchar('industry', { length: 100 }),
    website: varchar('website', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    address: jsonb('address').$type<{
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    }>(),
    currency: varchar('currency', { length: 3 }).default('USD'),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('clients_tenant_idx').on(t.tenantId)]
);

export const clientContacts = pgTable(
  'client_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    role: varchar('role', { length: 100 }),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('client_contacts_client_idx').on(t.clientId),
    index('client_contacts_email_idx').on(t.email),
  ]
);

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type ClientContact = typeof clientContacts.$inferSelect;
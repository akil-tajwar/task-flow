import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, unique, primaryKey, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    permissions: jsonb('permissions').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.tenantId, t.name)]
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })]
);

export const skills = pgTable(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    category: varchar('category', { length: 100 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [unique().on(t.tenantId, t.name)]
);

export const userSkills = pgTable(
  'user_skills',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
    proficiency: varchar('proficiency', { length: 10 }).default('1'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.skillId] })]
);

export type Role = typeof roles.$inferSelect;
export type Skill = typeof skills.$inferSelect;
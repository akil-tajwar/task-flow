import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { projects } from './projects';
import { tasks } from './tasks';

export const proofStatusEnum = pgEnum('proof_status', [
  'pending', 'approved', 'rejected', 'changes_requested',
]);

export const proofs = pgTable(
  'proofs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    fileUrl: text('file_url'),
    status: proofStatusEnum('status').notNull().default('pending'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('proofs_tenant_idx').on(t.tenantId)]
);

export const proofFeedback = pgTable(
  'proof_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    proofId: uuid('proof_id').notNull().references(() => proofs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    comment: text('comment'),
    status: proofStatusEnum('status'),
    annotations: jsonb('annotations').$type<Array<Record<string, unknown>>>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('proof_feedback_proof_idx').on(t.proofId)]
);

export type Proof = typeof proofs.$inferSelect;
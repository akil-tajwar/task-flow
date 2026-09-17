import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { users } from './users';
import { projects } from './projects';

export const chatChannels = pgTable(
  'chat_channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isPrivate: boolean('is_private').notNull().default(false),
    isPublic: boolean('is_public').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('chat_channels_tenant_idx').on(t.tenantId)]
);

export const chatChannelMembers = pgTable(
  'chat_channel_members',
  {
    channelId: uuid('channel_id').notNull().references(() => chatChannels.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    isStarred: boolean('is_starred').notNull().default(false),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (t) => [index('chat_channel_members_channel_idx').on(t.channelId)]
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id').references(() => chatChannels.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id'),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    attachments: jsonb('attachments').$type<
      Array<{ name: string; url: string; size: number; type: string }>
    >(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('chat_messages_channel_idx').on(t.channelId),
    index('chat_messages_created_idx').on(t.createdAt),
  ]
);

export const chatConversations = pgTable(
  'chat_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    isGroup: boolean('is_group').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('chat_conversations_tenant_idx').on(t.tenantId)]
);

export type ChatChannel = typeof chatChannels.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
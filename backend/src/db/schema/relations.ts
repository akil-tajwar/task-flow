import { relations } from "drizzle-orm";
import { tenants } from "./tenants";
import { users } from "./users";
import { roles, userRoles } from "./roles";
import { clients, clientContacts } from "./clients";
import { projects, projectMembers, milestones, taskLists } from "./projects";
import { tasks, taskDependencies, comments } from "./tasks";
import { timeEntries, calendarEvents } from "./time-tracking";
import {
  invoices,
  invoiceLineItems,
  expenses,
  budgets,
  retainers,
} from "./finance";
import { tickets, ticketMessages, deskInboxes } from "./desk";
import { chatChannels, chatMessages, chatChannelMembers } from "./chat";
import { spacePages, spaces } from "./spaces";
import { quotes, quoteLineItems } from "./quotes";
import { proofs, proofFeedback } from "./proofs";
import { automations, automationRuns } from "./automations";
import { sessions } from "./sessions";
import { notifications } from "./notifications";
import { skills, userSkills } from "./skills";

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  sessions: many(sessions),
  notifications: many(notifications),
  roles: many(userRoles),
  skills: many(userSkills),
  ownedProjects: many(projects),
  assignedTasks: many(tasks),
  timeEntries: many(timeEntries),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [roles.tenantId], references: [tenants.id] }),
  users: many(userRoles),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const skillsRelations = relations(skills, ({ one, many }) => ({
  tenant: one(tenants, { fields: [skills.tenantId], references: [tenants.id] }),
  users: many(userSkills),
}));

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(users, { fields: [userSkills.userId], references: [users.id] }),
  skill: one(skills, { fields: [userSkills.skillId], references: [skills.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [clients.tenantId],
    references: [tenants.id],
  }),
  contacts: many(clientContacts),
  projects: many(projects),
  invoices: many(invoices),
  tickets: many(tickets),
}));

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, {
    fields: [clientContacts.clientId],
    references: [clients.id],
  }),
  user: one(users, { fields: [clientContacts.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [projects.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  members: many(projectMembers),
  milestones: many(milestones),
  taskLists: many(taskLists),
  tasks: many(tasks),
  comments: many(comments),
  budgets: many(budgets),
  timeEntries: many(timeEntries),
  invoices: many(invoices),
  tickets: many(tickets),
  retainers: many(retainers),
  proofs: many(proofs),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  project: one(projects, {
    fields: [milestones.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

export const taskListsRelations = relations(taskLists, ({ one, many }) => ({
  project: one(projects, {
    fields: [taskLists.projectId],
    references: [projects.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  tenant: one(tenants, { fields: [tasks.tenantId], references: [tenants.id] }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  taskList: one(taskLists, {
    fields: [tasks.taskListId],
    references: [taskLists.id],
  }),
  milestone: one(milestones, {
    fields: [tasks.milestoneId],
    references: [milestones.id],
  }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
  creator: one(users, { fields: [tasks.creatorId], references: [users.id] }),
  comments: many(comments),
  timeEntries: many(timeEntries),
  dependencies: many(taskDependencies),
  proofs: many(proofs),
}));

export const taskDependenciesRelations = relations(
  taskDependencies,
  ({ one }) => ({
    task: one(tasks, {
      fields: [taskDependencies.taskId],
      references: [tasks.id],
    }),
    dependsOn: one(tasks, {
      fields: [taskDependencies.dependsOnTaskId],
      references: [tasks.id],
    }),
  }),
);

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, { fields: [comments.taskId], references: [tasks.id] }),
  project: one(projects, {
    fields: [comments.projectId],
    references: [projects.id],
  }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  tenant: one(tenants, {
    fields: [timeEntries.tenantId],
    references: [tenants.id],
  }),
  user: one(users, { fields: [timeEntries.userId], references: [users.id] }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
  task: one(tasks, { fields: [timeEntries.taskId], references: [tasks.id] }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, { fields: [calendarEvents.userId], references: [users.id] }),
  project: one(projects, {
    fields: [calendarEvents.projectId],
    references: [projects.id],
  }),
  task: one(tasks, { fields: [calendarEvents.taskId], references: [tasks.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [invoices.projectId],
    references: [projects.id],
  }),
  lineItems: many(invoiceLineItems),
}));

export const invoiceLineItemsRelations = relations(
  invoiceLineItems,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLineItems.invoiceId],
      references: [invoices.id],
    }),
    task: one(tasks, {
      fields: [invoiceLineItems.taskId],
      references: [tasks.id],
    }),
    timeEntry: one(timeEntries, {
      fields: [invoiceLineItems.timeEntryId],
      references: [timeEntries.id],
    }),
  }),
);

export const expensesRelations = relations(expenses, ({ one }) => ({
  tenant: one(tenants, {
    fields: [expenses.tenantId],
    references: [tenants.id],
  }),
  project: one(projects, {
    fields: [expenses.projectId],
    references: [projects.id],
  }),
  user: one(users, { fields: [expenses.userId], references: [users.id] }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  project: one(projects, {
    fields: [budgets.projectId],
    references: [projects.id],
  }),
}));

export const retainersRelations = relations(retainers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [retainers.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [retainers.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [retainers.projectId],
    references: [projects.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  tenant: one(tenants, { fields: [quotes.tenantId], references: [tenants.id] }),
  client: one(clients, { fields: [quotes.clientId], references: [clients.id] }),
  project: one(projects, {
    fields: [quotes.projectId],
    references: [projects.id],
  }),
  lineItems: many(quoteLineItems),
}));

export const quoteLineItemsRelations = relations(quoteLineItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteLineItems.quoteId],
    references: [quotes.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [tickets.tenantId],
    references: [tenants.id],
  }),
  inbox: one(deskInboxes, {
    fields: [tickets.inboxId],
    references: [deskInboxes.id],
  }),
  client: one(clients, {
    fields: [tickets.clientId],
    references: [clients.id],
  }),
  project: one(projects, {
    fields: [tickets.projectId],
    references: [projects.id],
  }),
  task: one(tasks, { fields: [tickets.taskId], references: [tasks.id] }),
  assignee: one(users, {
    fields: [tickets.assigneeId],
    references: [users.id],
  }),
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketMessages.ticketId],
    references: [tickets.id],
  }),
  user: one(users, { fields: [ticketMessages.userId], references: [users.id] }),
}));

export const deskInboxesRelations = relations(deskInboxes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [deskInboxes.tenantId],
    references: [tenants.id],
  }),
  client: one(clients, {
    fields: [deskInboxes.clientId],
    references: [clients.id],
  }),
  tickets: many(tickets),
}));

export const chatChannelsRelations = relations(
  chatChannels,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [chatChannels.tenantId],
      references: [tenants.id],
    }),
    project: one(projects, {
      fields: [chatChannels.projectId],
      references: [projects.id],
    }),
    members: many(chatChannelMembers),
    messages: many(chatMessages),
  }),
);

export const chatChannelMembersRelations = relations(
  chatChannelMembers,
  ({ one }) => ({
    channel: one(chatChannels, {
      fields: [chatChannelMembers.channelId],
      references: [chatChannels.id],
    }),
    user: one(users, {
      fields: [chatChannelMembers.userId],
      references: [users.id],
    }),
  }),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  channel: one(chatChannels, {
    fields: [chatMessages.channelId],
    references: [chatChannels.id],
  }),
  user: one(users, { fields: [chatMessages.userId], references: [users.id] }),
}));

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  tenant: one(tenants, { fields: [spaces.tenantId], references: [tenants.id] }),
  pages: many(spacePages),
}));

export const spacePagesRelations = relations(spacePages, ({ one }) => ({
  space: one(spaces, { fields: [spacePages.spaceId], references: [spaces.id] }),
  author: one(users, {
    fields: [spacePages.createdBy],
    references: [users.id],
  }),
}));

export const proofsRelations = relations(proofs, ({ one, many }) => ({
  tenant: one(tenants, { fields: [proofs.tenantId], references: [tenants.id] }),
  project: one(projects, {
    fields: [proofs.projectId],
    references: [projects.id],
  }),
  task: one(tasks, { fields: [proofs.taskId], references: [tasks.id] }),
  feedback: many(proofFeedback),
}));

export const proofFeedbackRelations = relations(proofFeedback, ({ one }) => ({
  proof: one(proofs, {
    fields: [proofFeedback.proofId],
    references: [proofs.id],
  }),
  user: one(users, { fields: [proofFeedback.userId], references: [users.id] }),
}));

export const automationsRelations = relations(automations, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [automations.tenantId],
    references: [tenants.id],
  }),
  runs: many(automationRuns),
}));

export const automationRunsRelations = relations(automationRuns, ({ one }) => ({
  automation: one(automations, {
    fields: [automationRuns.automationId],
    references: [automations.id],
  }),
}));

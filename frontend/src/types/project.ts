import { z } from 'zod';

// ---------------------------------------------------------------
// Enums — values copied 1:1 from the Drizzle pgEnum definitions in
// db/schema/projects.schema.ts and tasks.schema.ts. The old frontend
// enums did NOT match these (e.g. budgetType was completely different,
// defaultView had "calendar" instead of "table"/"gantt", status was
// missing "cancelled").
// ---------------------------------------------------------------

export const ProjectStatusEnum = z.enum([
  'active',
  'on_hold',
  'completed',
  'archived',
  'cancelled',
]);
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;

export const DefaultViewEnum = z.enum(['list', 'table', 'board', 'gantt']);
export type DefaultView = z.infer<typeof DefaultViewEnum>;

export const BudgetTypeEnum = z.enum([
  'time',
  'financial',
  'fixed_fee',
  'task_list',
  'expense',
]);
export type BudgetType = z.infer<typeof BudgetTypeEnum>;

export const TaskStatusEnum = z.enum(['todo', 'in_progress', 'in_review', 'done']);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const TaskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

// ---------------------------------------------------------------
// Response shapes (what the API actually returns)
// ---------------------------------------------------------------

export const projectMemberSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.string(),
  memberName: z.string().nullable(),
});
export type ProjectMember = z.infer<typeof projectMemberSchema>;

export const taskSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  projectId: z.string().uuid(),
  parentTaskId: z.string().uuid().nullable().optional(),
  milestoneId: z.string().uuid().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: TaskStatusEnum,
  priority: TaskPriorityEnum,
  assigneeId: z.string().uuid().nullable().optional(),
  creatorId: z.string().uuid(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  estimatedHours: z.string().nullable().optional(),
  actualHours: z.string().nullable().optional(),
  sortOrder: z.number(),
  isBillable: z.boolean(),
  isCompleted: z.boolean(),
  completedAt: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof taskSchema>;

// NOTE: milestones.schema.ts has NO updatedAt column — removed vs old type.
// Also: `tasks` is only populated by GET /projects/getAll (list), NOT by
// GET /projects/get/:id (getProjectDetails never joins tasks). Since this
// app only ever reads projects through the list query (useProjects), that's
// fine — just don't rely on tasks being present if you add a single-project
// fetch later without updating the backend service too.
export const milestoneSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  isCompleted: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.string().optional(),
  tasks: z.array(taskSchema).default([]),
});
export type Milestone = z.infer<typeof milestoneSchema>;

// clientId / ownerId are nullable in the DB (onDelete: 'set null', no
// notNull()) — old frontend type had them as required strings, which is
// wrong. budgetType/budgetAmount/budgetHours/currency have no notNull()
// either, so they're all optional/nullable too.
export const projectSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  clientId: z.string().uuid().nullable(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: ProjectStatusEnum,
  defaultView: DefaultViewEnum,
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  budgetType: BudgetTypeEnum.nullable().optional(),
  budgetAmount: z.string().nullable().optional(),
  budgetHours: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  isBillable: z.boolean(),
  isTemplate: z.boolean(),
  isArchived: z.boolean(),
  archivedAt: z.string().nullable().optional(),
  templateSourceId: z.string().uuid().nullable().optional(),
  ownerId: z.string().uuid().nullable(),
  color: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  projectMembers: z.array(projectMemberSchema).default([]),
  milestones: z.array(milestoneSchema).default([]),
});
export type Project = z.infer<typeof projectSchema>;

// ---------------------------------------------------------------
// Write payloads (what we send to the API)
// ---------------------------------------------------------------

// Mirrors CreateProjectMemberInput in projects.service.ts, including the
// "invite a brand new user" branch (isNewMember + name/email/password).
// The current form UI only ever sends { userId }, but the type now
// reflects everything the backend actually accepts.
export const createProjectMemberInputSchema = z
  .object({
    isNewMember: z.boolean().optional(),
    userId: z.string().uuid().optional(),
    name: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.string().optional(),
    hourlyRate: z.union([z.string(), z.number()]).nullable().optional(),
    billableRate: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .refine(
    (val) => (val.isNewMember ? !!(val.name && val.email && val.password) : !!val.userId),
    {
      message:
        'userId is required for an existing member; name, email and password are required for a new member',
    }
  );
export type CreateProjectMemberInput = z.infer<typeof createProjectMemberInputSchema>;

export const createMilestoneInputSchema = z.object({
  name: z.string().min(1, 'Milestone name is required'),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  completedAt: z.string().optional(),
  isCompleted: z.boolean().optional(),
  sortOrder: z.number().optional(),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneInputSchema>;

export const createProjectInputSchema = z.object({
  clientId: z.string().uuid().optional(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  status: ProjectStatusEnum.default('active'),
  defaultView: DefaultViewEnum.default('list'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budgetType: BudgetTypeEnum.optional(),
  budgetAmount: z.string().optional(),
  budgetHours: z.string().optional(),
  currency: z.string().length(3).default('USD'),
  isBillable: z.boolean().default(true),
  isTemplate: z.boolean().default(false),
  ownerId: z.string().uuid().optional(),
  color: z.string().optional(),
  tags: z.array(z.string()).default([]),
  projectMembers: z.array(createProjectMemberInputSchema).optional(),
  milestones: z.array(createMilestoneInputSchema).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const updateProjectInputSchema = createProjectInputSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

export const projectFiltersSchema = z.object({
  status: ProjectStatusEnum.optional(),
  clientId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  isTemplate: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});
export type ProjectFilters = z.infer<typeof projectFiltersSchema>;




// export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";
// export type BudgetType = "fixed_fee" | "hourly" | "retainer" | "non_billable";
// export type DefaultView = "board" | "list" | "calendar";
// export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
// export type TaskPriority = "low" | "medium" | "high" | "urgent";

// export interface ProjectMember {
//   id: string;
//   projectId: string;
//   userId: string;
//   createdAt: string;
//   memberName: string | null;
// }

// // 👇 NEW: Task type — matches the tasks[] shape nested inside each milestone
// export interface Task {
//   id: string;
//   tenantId: string;
//   projectId: string;
//   parentTaskId?: string | null;
//   milestoneId?: string | null;
//   title: string;
//   description?: string | null;
//   status: TaskStatus;
//   priority: TaskPriority;
//   assigneeId?: string | null;
//   creatorId: string;
//   startDate?: string | null;
//   dueDate?: string | null;
//   estimatedHours?: string | null;
//   actualHours?: string | null;
//   sortOrder: number;
//   isBillable: boolean;
//   isCompleted: boolean;
//   completedAt?: string | null;
//   tags: string[];
//   createdAt: string;
//   updatedAt: string;
// }

// export interface Milestone {
//   id: string;
//   projectId: string;
//   name: string;
//   description?: string | null;
//   dueDate?: string | null;
//   completedAt?: string | null;
//   isCompleted: boolean;
//   sortOrder: number;
//   createdAt?: string;
//   tasks: Task[]; // 👈 NEW: was missing, caused the type error in getTaskStats/flatMap
// }

// export interface Project {
//   id: string;
//   tenantId: string;
//   clientId: string;
//   name: string;
//   description?: string | null;
//   status: ProjectStatus;
//   defaultView: DefaultView;
//   startDate?: string | null;
//   endDate?: string | null;
//   budgetType: BudgetType;
//   budgetAmount?: string | null;
//   budgetHours?: string | null;
//   currency: string;
//   isBillable: boolean;
//   isTemplate: boolean;
//   templateSourceId?: string | null;
//   ownerId: string;
//   color?: string | null;
//   tags: string[];
//   isArchived: boolean;
//   archivedAt?: string | null;
//   createdAt: string;
//   updatedAt: string;
//   projectMembers: ProjectMember[];
//   milestones: Milestone[];
// }

// export interface CreateMilestoneInput {
//   name: string;
//   description?: string;
//   dueDate?: string;
//   isCompleted?: boolean;
//   sortOrder?: number;
// }

// export interface CreateProjectMemberInput {
//   userId: string;
//   role?: string;
// }

// export interface CreateProjectInput {
//   clientId: string;
//   name: string;
//   description?: string;
//   status: ProjectStatus;
//   defaultView: DefaultView;
//   startDate?: string;
//   endDate?: string;
//   budgetType: BudgetType;
//   budgetAmount?: string;
//   budgetHours?: string;
//   currency: string;
//   isBillable: boolean;
//   isTemplate: boolean;
//   ownerId: string;
//   color?: string;
//   tags: string[];
//   projectMembers?: CreateProjectMemberInput[];
//   milestones?: CreateMilestoneInput[];
// }

// export type UpdateProjectInput = Partial<
//   Omit<CreateProjectInput, "projectMembers" | "milestones">
// > & {
//   projectMembers?: CreateProjectMemberInput[];
//   milestones?: CreateMilestoneInput[];
// };

// export interface ProjectFilters {
//   status?: ProjectStatus;
//   clientId?: string;
//   ownerId?: string;
//   isTemplate?: boolean;
//   search?: string;
//   page?: number;
//   limit?: number;
// }

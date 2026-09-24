export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";
export type BudgetType = "fixed_fee" | "hourly" | "retainer" | "non_billable";
export type DefaultView = "board" | "list" | "calendar";
export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  createdAt: string;
  memberName: string | null;
}

// 👇 NEW: Task type — matches the tasks[] shape nested inside each milestone
export interface Task {
  id: string;
  tenantId: string;
  projectId: string;
  parentTaskId?: string | null;
  milestoneId?: string | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  creatorId: string;
  startDate?: string | null;
  dueDate?: string | null;
  estimatedHours?: string | null;
  actualHours?: string | null;
  sortOrder: number;
  isBillable: boolean;
  isCompleted: boolean;
  completedAt?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  isCompleted: boolean;
  sortOrder: number;
  createdAt?: string;
  tasks: Task[]; // 👈 NEW: was missing, caused the type error in getTaskStats/flatMap
}

export interface Project {
  id: string;
  tenantId: string;
  clientId: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  defaultView: DefaultView;
  startDate?: string | null;
  endDate?: string | null;
  budgetType: BudgetType;
  budgetAmount?: string | null;
  budgetHours?: string | null;
  currency: string;
  isBillable: boolean;
  isTemplate: boolean;
  templateSourceId?: string | null;
  ownerId: string;
  color?: string | null;
  tags: string[];
  isArchived: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  projectMembers: ProjectMember[];
  milestones: Milestone[];
}

export interface CreateMilestoneInput {
  name: string;
  description?: string;
  dueDate?: string;
  isCompleted?: boolean;
  sortOrder?: number;
}

export interface CreateProjectMemberInput {
  userId: string;
  role?: string;
}

export interface CreateProjectInput {
  clientId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  defaultView: DefaultView;
  startDate?: string;
  endDate?: string;
  budgetType: BudgetType;
  budgetAmount?: string;
  budgetHours?: string;
  currency: string;
  isBillable: boolean;
  isTemplate: boolean;
  ownerId: string;
  color?: string;
  tags: string[];
  projectMembers?: CreateProjectMemberInput[];
  milestones?: CreateMilestoneInput[];
}

export type UpdateProjectInput = Partial<
  Omit<CreateProjectInput, "projectMembers" | "milestones">
> & {
  projectMembers?: CreateProjectMemberInput[];
  milestones?: CreateMilestoneInput[];
};

export interface ProjectFilters {
  status?: ProjectStatus;
  clientId?: string;
  ownerId?: string;
  isTemplate?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

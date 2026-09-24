export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface TaskComment {
  id: string;
  tenantId: string;
  taskId: string | null;
  projectId: string | null;
  userId: string;
  content: string;
  parentCommentId: string | null;
  attachments: TaskAttachment[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  tenantId: string;
  projectId: string;
  parentTaskId: string | null;
  milestoneId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  creatorId: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  estimatedHours: string | null;
  actualHours: string | null;
  sortOrder: number;
  isBillable: boolean;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  projectId: string;
  parentTaskId?: string;
  milestoneId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: string;
  actualHours?: string;
  sortOrder?: number; // 👈 added — was missing, caused the TS error
  isBillable?: boolean;
  tags?: string[];
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

export interface TaskFilters {
  page?: number;
  limit?: number;
  projectId?: string;
  milestoneId?: string;
  assigneeId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
}
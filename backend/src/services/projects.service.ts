import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import {
  projects,
  projectMembers,
  milestones,
  type NewProject,
  type Project,
} from "../db/schema/projects.schema";
import { users } from "../db/schema/users.schema";

export type CreateProjectMemberInput = {
  userId: string;
  role?: string;
  hourlyRate?: string | number | null;
  billableRate?: string | number | null;
};

export type CreateMilestoneInput = {
  name: string;
  description?: string | null;
  dueDate?: string | null;
  completedAt?: Date | null;
  isCompleted?: boolean;
  sortOrder?: number;
};

export type CreateProjectInput = Omit<
  NewProject,
  "id" | "tenantId" | "createdAt" | "updatedAt" | "archivedAt"
> & {
  projectMembers?: CreateProjectMemberInput[];
  milestones?: CreateMilestoneInput[];
};

export type UpdateProjectInput = Partial<
  Omit<CreateProjectInput, "projectMembers" | "milestones">
> & {
  projectMembers?: CreateProjectMemberInput[];
  milestones?: CreateMilestoneInput[];
};

export interface ListProjectsQuery {
  status?: Project["status"];
  clientId?: string;
  ownerId?: string;
  isTemplate?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProjectMemberResponse {
  id: string;
  projectId: string;
  userId: string;
  createdAt: Date;
  memberName: string | null;
}

export interface ProjectWithDetails extends Project {
  projectMembers: ProjectMemberResponse[];
  milestones: (typeof milestones.$inferSelect)[];
}

function scopedProject(tenantId: string, id: string) {
  return and(eq(projects.id, id), eq(projects.tenantId, tenantId));
}

/**
 * Get project members with the user's name.
 */
async function getProjectMembers(
  projectId: string,
): Promise<ProjectMemberResponse[]> {
  return db
    .select({
      id: projectMembers.id,
      projectId: projectMembers.projectId,
      userId: projectMembers.userId,
      createdAt: projectMembers.createdAt,
      memberName: users.name,
    })
    .from(projectMembers)
    .leftJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));
}

/**
 * Get project milestones.
 */
async function getProjectMilestones(projectId: string) {
  return db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(milestones.sortOrder, milestones.createdAt);
}

/**
 * Get project with members and milestones.
 */
async function getProjectWithDetails(
  tenantId: string,
  projectId: string,
): Promise<ProjectWithDetails> {
  const project = await getProjectById(tenantId, projectId);

  const [projectMemberRows, milestoneRows] = await Promise.all([
    getProjectMembers(projectId),
    getProjectMilestones(projectId),
  ]);

  return {
    ...project,
    projectMembers: projectMemberRows,
    milestones: milestoneRows,
  };
}

/**
 * Create project with members and milestones.
 */
export async function createProject(
  tenantId: string,
  input: CreateProjectInput,
): Promise<ProjectWithDetails> {
  const {
    projectMembers: memberInputs = [],
    milestones: milestoneInputs = [],
    ...projectInput
  } = input;

  const result = await db.transaction(async (tx) => {
    const values: NewProject = {
      ...projectInput,
      tenantId,
    };

    const [createdProject] = await tx
      .insert(projects)
      .values(values)
      .returning();

    if (!createdProject) {
      throw new Error("Failed to create project");
    }

    if (memberInputs.length > 0) {
      await tx.insert(projectMembers).values(
        memberInputs.map((member) => ({
          projectId: createdProject.id,
          userId: member.userId,
          role: member.role ?? "member",
          hourlyRate: member.hourlyRate ?? null,
          billableRate: member.billableRate ?? null,
        })),
      );
    }

    if (milestoneInputs.length > 0) {
      await tx.insert(milestones).values(
        milestoneInputs.map((milestone) => ({
          projectId: createdProject.id,
          name: milestone.name,
          description: milestone.description ?? null,
          dueDate: milestone.dueDate ?? null,
          completedAt: milestone.completedAt ?? null,
          isCompleted: milestone.isCompleted ?? false,
          sortOrder: milestone.sortOrder ?? 0,
        })),
      );
    }

    return createdProject;
  });

  return getProjectWithDetails(tenantId, result.id);
}

/**
 * List projects.
 */
export async function getProjects(tenantId: string, query: ListProjectsQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const conditions = [eq(projects.tenantId, tenantId)];

  if (query.status) {
    conditions.push(eq(projects.status, query.status));
  }

  if (query.clientId) {
    conditions.push(eq(projects.clientId, query.clientId));
  }

  if (query.ownerId) {
    conditions.push(eq(projects.ownerId, query.ownerId));
  }

  if (query.isTemplate !== undefined) {
    conditions.push(eq(projects.isTemplate, query.isTemplate));
  }

  if (query.search) {
    conditions.push(ilike(projects.name, `%${query.search}%`));
  }

  const whereClause = and(...conditions);
  const offset = (page - 1) * limit;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(whereClause)
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset),

    db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(projects)
      .where(whereClause),
  ]);

  const projectIds = rows.map((project) => project.id);

  if (projectIds.length === 0) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  const [memberRows, milestoneRows] = await Promise.all([
    db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        createdAt: projectMembers.createdAt,
        memberName: users.name,
      })
      .from(projectMembers)
      .leftJoin(users, eq(projectMembers.userId, users.id))
      .where(inArray(projectMembers.projectId, projectIds)),

    db
      .select()
      .from(milestones)
      .where(inArray(milestones.projectId, projectIds))
      .orderBy(milestones.sortOrder, milestones.createdAt),
  ]);

  const data = rows.map((project) => ({
    ...project,

    projectMembers: memberRows.filter(
      (member) => member.projectId === project.id,
    ),

    milestones: milestoneRows.filter(
      (milestone) => milestone.projectId === project.id,
    ),
  }));

  return data;
}

/**
 * Get project by ID.
 */
export async function getProjectById(
  tenantId: string,
  id: string,
): Promise<Project> {
  const [row] = await db
    .select()
    .from(projects)
    .where(scopedProject(tenantId, id));

  if (!row) {
    throw new Error("Project not found");
  }

  return row;
}

/**
 * Get project by ID with members and milestones.
 */
export async function getProjectDetails(
  tenantId: string,
  id: string,
): Promise<ProjectWithDetails> {
  return getProjectWithDetails(tenantId, id);
}

/**
 * Update project.
 *
 * If projectMembers or milestones are provided,
 * existing ones are replaced.
 */
export async function updateProject(
  tenantId: string,
  id: string,
  input: UpdateProjectInput,
): Promise<ProjectWithDetails> {
  const {
    projectMembers: memberInputs,
    milestones: milestoneInputs,
    ...projectInput
  } = input;

  const updatedProject = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(projects)
      .set({
        ...projectInput,
        updatedAt: new Date(),
      })
      .where(scopedProject(tenantId, id))
      .returning();

    if (!updated) {
      throw new Error("Project not found");
    }

    /**
     * Replace project members only when projectMembers
     * was actually provided in the request.
     */
    if (memberInputs !== undefined) {
      await tx.delete(projectMembers).where(eq(projectMembers.projectId, id));

      if (memberInputs.length > 0) {
        await tx.insert(projectMembers).values(
          memberInputs.map((member) => ({
            projectId: id,
            userId: member.userId,
            role: member.role ?? "member",
            hourlyRate: member.hourlyRate ?? null,
            billableRate: member.billableRate ?? null,
          })),
        );
      }
    }

    /**
     * Replace milestones only when milestones
     * was actually provided in the request.
     */
    if (milestoneInputs !== undefined) {
      await tx.delete(milestones).where(eq(milestones.projectId, id));

      if (milestoneInputs.length > 0) {
        await tx.insert(milestones).values(
          milestoneInputs.map((milestone) => ({
            projectId: id,
            name: milestone.name,
            description: milestone.description ?? null,
            dueDate: milestone.dueDate ?? null,
            completedAt: milestone.completedAt ?? null,
            isCompleted: milestone.isCompleted ?? false,
            sortOrder: milestone.sortOrder ?? 0,
          })),
        );
      }
    }

    return updated;
  });

  return getProjectWithDetails(tenantId, updatedProject.id);
}

/**
 * Archive project.
 */
export async function archiveProject(
  tenantId: string,
  id: string,
): Promise<ProjectWithDetails> {
  const [archived] = await db
    .update(projects)
    .set({
      status: "archived",
      isArchived: true,
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(scopedProject(tenantId, id))
    .returning();

  if (!archived) {
    throw new Error("Project not found");
  }

  return getProjectWithDetails(tenantId, archived.id);
}

/**
 * Restore project.
 */
export async function restoreProject(
  tenantId: string,
  id: string,
): Promise<ProjectWithDetails> {
  const [restored] = await db
    .update(projects)
    .set({
      status: "active",
      isArchived: false,
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(scopedProject(tenantId, id))
    .returning();

  if (!restored) {
    throw new Error("Project not found");
  }

  return getProjectWithDetails(tenantId, restored.id);
}

/**
 * Delete project.
 *
 * projectMembers and milestones will be deleted automatically
 * because their projectId foreign keys use ON DELETE CASCADE.
 */
export async function deleteProject(
  tenantId: string,
  id: string,
): Promise<void> {
  const [deleted] = await db
    .delete(projects)
    .where(scopedProject(tenantId, id))
    .returning({
      id: projects.id,
    });

  if (!deleted) {
    throw new Error("Project not found");
  }
}

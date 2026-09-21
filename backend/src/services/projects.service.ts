import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "../db";
import { projects, type NewProject, type Project } from "../db/schema/projects";

export type CreateProjectInput = Omit<
  NewProject,
  "id" | "tenantId" | "createdAt" | "updatedAt" | "archivedAt"
>;

export type UpdateProjectInput = Partial<CreateProjectInput>;

export interface ListProjectsQuery {
  status?: Project["status"];
  clientId?: string;
  ownerId?: string;
  isTemplate?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

function scopedProject(tenantId: string, id: string) {
  return and(eq(projects.id, id), eq(projects.tenantId, tenantId));
}

export async function createProject(
  tenantId: string,
  input: CreateProjectInput,
): Promise<Project> {
  const values: NewProject = {
    ...input,
    tenantId,
  };

  const [created] = await db.insert(projects).values(values).returning();
  return created;
}

export async function listProjects(tenantId: string, query: ListProjectsQuery) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const conditions = [eq(projects.tenantId, tenantId)];
  if (query.status) conditions.push(eq(projects.status, query.status));
  if (query.clientId) conditions.push(eq(projects.clientId, query.clientId));
  if (query.ownerId) conditions.push(eq(projects.ownerId, query.ownerId));
  if (query.isTemplate !== undefined)
    conditions.push(eq(projects.isTemplate, query.isTemplate));
  if (query.search) conditions.push(ilike(projects.name, `%${query.search}%`));

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
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(whereClause),
  ]);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

export async function getProjectById(
  tenantId: string,
  id: string,
): Promise<Project> {
  const [row] = await db
    .select()
    .from(projects)
    .where(scopedProject(tenantId, id));

  if (!row) throw new Error("Project not found");
  return row;
}

export async function updateProject(
  tenantId: string,
  id: string,
  input: UpdateProjectInput,
): Promise<Project> {
  const [updated] = await db
    .update(projects)
    .set({ ...input, updatedAt: new Date() })
    .where(scopedProject(tenantId, id))
    .returning();

  if (!updated) throw new Error("Project not found");
  return updated;
}

export async function archiveProject(
  tenantId: string,
  id: string,
): Promise<Project> {
  const [archived] = await db
    .update(projects)
    .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
    .where(scopedProject(tenantId, id))
    .returning();

  if (!archived) throw new Error("Project not found");
  return archived;
}

export async function restoreProject(
  tenantId: string,
  id: string,
): Promise<Project> {
  const [restored] = await db
    .update(projects)
    .set({ status: "active", archivedAt: null, updatedAt: new Date() })
    .where(scopedProject(tenantId, id))
    .returning();

  if (!restored) throw new Error("Project not found");
  return restored;
}

export async function deleteProject(
  tenantId: string,
  id: string,
): Promise<void> {
  const [deleted] = await db
    .delete(projects)
    .where(scopedProject(tenantId, id))
    .returning({ id: projects.id });

  if (!deleted) throw new Error("Project not found");
}

import type { Context } from "hono";
import type { Project } from "../db/schema/projects.schema";
import * as projectsService from "../services/projects.service";
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from "../services/projects.service";

export async function createProjectHandler(c: Context) {
  const tenantId = c.get("tenantId") as string;
  const input = await c.req.json<CreateProjectInput>();
  const project = await projectsService.createProject(tenantId, input);
  return c.json(project, 201);
}

export async function listProjectsHandler(c: Context) {
  const tenantId = c.get("tenantId") as string;
  const { status, clientId, ownerId, isTemplate, search, page, limit } =
    c.req.query();

  const query: ListProjectsQuery = {
    status: status as Project["status"] | undefined,
    clientId,
    ownerId,
    isTemplate: isTemplate !== undefined ? isTemplate === "true" : undefined,
    search,
    page: page !== undefined ? Number(page) : undefined,
    limit: limit !== undefined ? Number(limit) : undefined,
  };

  const result = await projectsService.listProjects(tenantId, query);
  return c.json(result, 200);
}

export async function getProjectHandler(c: Context) {
  const tenantId = c.get("tenantId") as string;
  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: "Project ID is required" }, 400);
  }
  const project = await projectsService.getProjectById(tenantId, id);
  return c.json(project, 200);
}

export async function updateProjectHandler(c: Context) {
  const tenantId = c.get("tenantId") as string;
  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: "Project ID is required" }, 400);
  }
  const input = await c.req.json<UpdateProjectInput>();
  const project = await projectsService.updateProject(tenantId, id, input);
  return c.json(project, 200);
}

export async function archiveProjectHandler(c: Context) {
  const tenantId = c.get("tenantId") as string;
  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: "Project ID is required" }, 400);
  }
  const project = await projectsService.archiveProject(tenantId, id);
  return c.json(project, 200);
}

export async function restoreProjectHandler(c: Context) {
  const tenantId = c.get("tenantId") as string;
  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: "Project ID is required" }, 400);
  }
  const project = await projectsService.restoreProject(tenantId, id);
  return c.json(project, 200);
}

export async function deleteProjectHandler(c: Context) {
  const tenantId = c.get("tenantId") as string;
  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: "Project ID is required" }, 400);
  }
  await projectsService.deleteProject(tenantId, id);
  return c.body(null, 204);
}

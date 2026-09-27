import type { Context } from "hono";

import { taskService } from "../services/tasks.service";
import { newTasksSchema } from "../validators/tasks.validator";

const BASE_URL =
  process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;

type MulterFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
};

function normalizeFiles(
  files: MulterFile[] | Record<string, MulterFile[]> | undefined,
): MulterFile[] {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return Object.values(files).flat();
}

export const taskController = {
  // =========================================================
  // TASKS
  // =========================================================

  async create(c: Context) {
    console.log("🚀 [controller] entered");

    const currentUser = c.get("user");
    const input = newTasksSchema.parse(await c.req.json());

    const task = await taskService.create(currentUser.tenantId, {
      ...input,
      creatorId: currentUser.id,
    });

    console.log("🚀 [controller] task:", task);
    return c.json(task, 201);
  },

  async getAll(c: Context) {
    const currentUser = c.get("user");
    const query = c.req.query();

    const result = await taskService.getAll(
      currentUser.tenantId,
      {
        id: currentUser.id,
        role: currentUser.role,
      },
      {
        page: query.page ? parseInt(query.page, 10) : 1,
        limit: query.limit ? parseInt(query.limit, 10) : 20,

        projectId: query.projectId,
        milestoneId: query.milestoneId,
        parentTaskId: query.parentTaskId,
        assigneeId: query.assigneeId,

        status: query.status as any,
        priority: query.priority as any,

        search: query.search,
      },
    );

    return c.json(result);
  },

  async getById(c: Context) {
    const currentUser = c.get("user");
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Task ID is required" }, 400);
    }

    const task = await taskService.getById(currentUser.tenantId, id);

    return c.json(task);
  },

  async update(c: Context) {
    const currentUser = c.get("user");
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Task ID is required" }, 400);
    }

    const input = newTasksSchema.partial().parse(await c.req.json());

    const task = await taskService.update(currentUser.tenantId, id, input);

    return c.json(task);
  },

  async delete(c: Context) {
    const currentUser = c.get("user");
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Task ID is required" }, 400);
    }

    const result = await taskService.delete(currentUser.tenantId, id);

    return c.json(result);
  },

  async submit(c: Context) {
    const currentUser = c.get("user");
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Task ID is required" }, 400);
    }

    const task = await taskService.submitForReview(currentUser.tenantId, id);

    return c.json(task);
  },

  async done(c: Context) {
    const currentUser = c.get("user");
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Task ID is required" }, 400);
    }

    const task = await taskService.markDone(currentUser.tenantId, id);

    return c.json(task);
  },

  async blocked(c: Context) {
    const currentUser = c.get("user");
    const id = c.req.param("id");

    if (!id) {
      return c.json({ error: "Task ID is required" }, 400);
    }

    const task = await taskService.markBlocked(currentUser.tenantId, id);

    return c.json(task);
  },

  async getInReview(c: Context) {
    const currentUser = c.get("user");
    const query = c.req.query();

    const result = await taskService.getInReview(currentUser.tenantId, {
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,

      projectId: query.projectId,
      milestoneId: query.milestoneId,
      parentTaskId: query.parentTaskId,
      assigneeId: query.assigneeId,

      priority: query.priority as any,
      search: query.search,
    });

    return c.json(result);
  },

  // =========================================================
  // DEPENDENCIES
  // =========================================================

  async addDependency(c: Context) {
    const currentUser = c.get("user");

    const body = await c.req.json();

    const dependency = await taskService.addDependency(
      currentUser.tenantId,
      body.taskId,
      body.dependsOnTaskId,
      body.type ?? "blocks",
    );

    return c.json(dependency, 201);
  },

  async getDependencies(c: Context) {
    const currentUser = c.get("user");
    const taskId = c.req.param("taskId");
    if (!taskId) {
      return c.json({ error: "Task ID is required" }, 400);
    }
    const dependencies = await taskService.getDependencies(
      currentUser.tenantId,
      taskId,
    );

    return c.json(dependencies);
  },

  async deleteDependency(c: Context) {
    const currentUser = c.get("user");
    const dependencyId = c.req.param("dependencyId");

    if (!dependencyId) {
      return c.json({ error: "Dependency ID is required" }, 400);
    }

    const result = await taskService.deleteDependency(
      currentUser.tenantId,
      dependencyId,
    );

    return c.json(result);
  },

  // =========================================================
  // COMMENTS
  // =========================================================

  async createComment(c: Context) {
    const currentUser = c.get("user");

    // multer populates these on the raw Express-style request
    const rawReq = c.req.raw as unknown as Request & {
      body?: Record<string, string>;
      files?: MulterFile[] | Record<string, MulterFile[]>;
    };

    const body = rawReq.body ?? {};
    const files = normalizeFiles(rawReq.files);

    const taskId = typeof body.taskId === "string" ? body.taskId : "";
    const content = typeof body.content === "string" ? body.content : "";
    const parentCommentId =
      typeof body.parentCommentId === "string" && body.parentCommentId
        ? body.parentCommentId
        : null;

    if (!taskId) return c.json({ error: "Task ID is required" }, 400);
    if (!content.trim())
      return c.json({ error: "Comment content is required" }, 400);

    // Build attachments from uploaded files
    const attachments = files.length
      ? files.map((f) => ({
          name: f.originalname,
          url: `${BASE_URL}/uploads/comments/${f.filename}`,
          size: f.size,
          type: f.mimetype,
        }))
      : null;

    const comment = await taskService.createComment(
      currentUser.tenantId,
      currentUser.id,
      { taskId, content, parentCommentId, attachments },
    );

    return c.json(comment, 201);
  },

  async getTaskComments(c: Context) {
    const currentUser = c.get("user");
    const taskId = c.req.param("taskId");
    if (!taskId) {
      return c.json({ error: "Task ID is required" }, 400);
    }
    const result = await taskService.getTaskComments(
      currentUser.tenantId,
      taskId,
    );

    return c.json(result);
  },

  async getCommentById(c: Context) {
    const currentUser = c.get("user");
    const id = c.req.param("commentId");

    if (!id) {
      return c.json({ error: "Comment ID is required" }, 400);
    }

    const comment = await taskService.getCommentById(currentUser.tenantId, id);

    return c.json(comment);
  },

  async updateComment(c: Context) {
    const currentUser = c.get("user");
    const id = c.req.param("commentId");

    if (!id) {
      return c.json({ error: "Comment ID is required" }, 400);
    }

    const body = await c.req.json();

    if (!body.content?.trim()) {
      return c.json({ error: "Comment content is required" }, 400);
    }

    const comment = await taskService.updateComment(
      currentUser.tenantId,
      currentUser.id,
      id,
      body.content,
    );

    return c.json(comment);
  },

  async deleteComment(c: Context) {
    const currentUser = c.get("user");
    const id = c.req.param("commentId");

    if (!id) {
      return c.json({ error: "Comment ID is required" }, 400);
    }

    const result = await taskService.deleteComment(
      currentUser.tenantId,
      currentUser.id,
      id,
    );

    return c.json(result);
  },
};

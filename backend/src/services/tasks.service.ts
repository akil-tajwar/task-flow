import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../db/index";
import {
  tasks,
  taskDependencies,
  comments,
  projects,
} from "../db/schema/index.schema";

import type { NewTask, Comment } from "../validators/tasks.validator";

export const taskService = {
  // =========================================================
  // TASKS
  // =========================================================

  async create(tenantId: string, input: NewTask) {
    const [task] = await db
      .insert(tasks)
      .values({
        ...input,
        tenantId,
      })
      .returning();

    return task;
  },

  async getAll(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      projectId?: string;
      milestoneId?: string;
      parentTaskId?: string;
      assigneeId?: string;
      status?: "todo" | "in_progress" | "in_review" | "done" | "blocked";
      priority?: "low" | "medium" | "high" | "urgent";
      search?: string;
    },
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const offset = (page - 1) * limit;

    const conditions = [eq(tasks.tenantId, tenantId)];

    if (query.projectId) {
      conditions.push(eq(tasks.projectId, query.projectId));
    }

    if (query.milestoneId) {
      conditions.push(eq(tasks.milestoneId, query.milestoneId));
    }

    if (query.parentTaskId) {
      conditions.push(eq(tasks.parentTaskId, query.parentTaskId));
    }

    if (query.assigneeId) {
      conditions.push(eq(tasks.assigneeId, query.assigneeId));
    }

    if (query.status) {
      conditions.push(eq(tasks.status, query.status));
    }

    if (query.priority) {
      conditions.push(eq(tasks.priority, query.priority));
    }

    if (query.search) {
      conditions.push(
        or(
          ilike(tasks.title, `%${query.search}%`),
          ilike(tasks.description, `%${query.search}%`),
        )!,
      );
    }

    const where = and(...conditions);

    const [rows, [countRow]] = await Promise.all([
      db.query.tasks.findMany({
        where,
        limit,
        offset,
        orderBy: [desc(tasks.createdAt)],
      }),

      db
        .select({
          total: db.$count(tasks, where),
        })
        .from(tasks)
        .where(where),
    ]);

    return rows;
  },

  async getById(tenantId: string, id: string) {
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)),
    });

    if (!task) {
      throw new Error("Task not found");
    }

    return task;
  },

  async update(tenantId: string, id: string, input: Partial<NewTask>) {
    const existing = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)),
    });

    if (!existing) {
      throw new Error("Task not found");
    }

    const [task] = await db
      .update(tasks)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
      .returning();

    return task;
  },

  async delete(tenantId: string, id: string) {
    const existing = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)),
    });

    if (!existing) {
      throw new Error("Task not found");
    }

    await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)));

    return {
      message: "Task deleted",
    };
  },

  // =========================================================
  // TASK DEPENDENCIES
  // =========================================================

  async addDependency(
    tenantId: string,
    taskId: string,
    dependsOnTaskId: string,
    type: string,
  ) {
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)),
    });

    if (!task) {
      throw new Error("Task not found");
    }

    const dependencyTask = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, dependsOnTaskId), eq(tasks.tenantId, tenantId)),
    });

    if (!dependencyTask) {
      throw new Error("Dependency task not found");
    }

    if (taskId === dependsOnTaskId) {
      throw new Error("A task cannot depend on itself");
    }

    const [dependency] = await db
      .insert(taskDependencies)
      .values({
        taskId,
        dependsOnTaskId,
        type,
      })
      .returning();

    return dependency;
  },

  async getDependencies(tenantId: string, taskId: string) {
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)),
    });

    if (!task) {
      throw new Error("Task not found");
    }

    return db.query.taskDependencies.findMany({
      where: eq(taskDependencies.taskId, taskId),
    });
  },

  async deleteDependency(tenantId: string, dependencyId: string) {
    const dependency = await db.query.taskDependencies.findFirst({
      where: eq(taskDependencies.id, dependencyId),
    });

    if (!dependency) {
      throw new Error("Dependency not found");
    }

    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, dependency.taskId), eq(tasks.tenantId, tenantId)),
    });

    if (!task) {
      throw new Error("Dependency not found");
    }

    await db
      .delete(taskDependencies)
      .where(eq(taskDependencies.id, dependencyId));

    return {
      message: "Dependency deleted",
    };
  },

  // =========================================================
  // COMMENTS
  // =========================================================

  async createComment(
    tenantId: string,
    userId: string,
    input: {
      taskId: string;
      content: string;
      parentCommentId?: string | null;
      attachments?: Comment["attachments"];
    },
  ) {
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, input.taskId), eq(tasks.tenantId, tenantId)),
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (input.parentCommentId) {
      const parentComment = await db.query.comments.findFirst({
        where: and(
          eq(comments.id, input.parentCommentId),
          eq(comments.tenantId, tenantId),
          eq(comments.taskId, input.taskId),
        ),
      });

      if (!parentComment) {
        throw new Error("Parent comment not found");
      }
    }

    const [comment] = await db
      .insert(comments)
      .values({
        tenantId,
        taskId: input.taskId,
        projectId: null,
        userId,
        content: input.content,
        parentCommentId: input.parentCommentId ?? null,
        attachments: input.attachments ?? null,
      })
      .returning();

    return comment;
  },

  async getTaskComments(tenantId: string, taskId: string) {
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)),
    });

    if (!task) {
      throw new Error("Task not found");
    }

    return db.query.comments.findMany({
      where: and(eq(comments.tenantId, tenantId), eq(comments.taskId, taskId)),
      orderBy: [desc(comments.createdAt)],
    });
  },

  async getCommentById(tenantId: string, id: string) {
    const comment = await db.query.comments.findFirst({
      where: and(eq(comments.id, id), eq(comments.tenantId, tenantId)),
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    return comment;
  },

  async updateComment(
    tenantId: string,
    userId: string,
    id: string,
    content: string,
  ) {
    const existing = await db.query.comments.findFirst({
      where: and(eq(comments.id, id), eq(comments.tenantId, tenantId)),
    });

    if (!existing) {
      throw new Error("Comment not found");
    }

    if (existing.userId !== userId) {
      throw new Error("You can only edit your own comment");
    }

    const [comment] = await db
      .update(comments)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(and(eq(comments.id, id), eq(comments.tenantId, tenantId)))
      .returning();

    return comment;
  },

  async deleteComment(tenantId: string, userId: string, id: string) {
    const existing = await db.query.comments.findFirst({
      where: and(eq(comments.id, id), eq(comments.tenantId, tenantId)),
    });

    if (!existing) {
      throw new Error("Comment not found");
    }

    if (existing.userId !== userId) {
      throw new Error("You can only delete your own comment");
    }

    await db
      .delete(comments)
      .where(and(eq(comments.id, id), eq(comments.tenantId, tenantId)));

    return {
      message: "Comment deleted",
    };
  },
};

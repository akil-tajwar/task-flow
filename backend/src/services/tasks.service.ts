import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../db/index";
import {
  tasks,
  taskDependencies,
  comments,
  notifications,
} from "../db/schema/index.schema";
import { sql } from "drizzle-orm";
import { taskProgress, projects } from "../db/schema/index.schema";
import type { NewTask, Comment } from "../validators/tasks.validator";

export const taskService = {
  // =========================================================
  // TASKS
  // =========================================================

  async create(tenantId: string, input: NewTask) {
    console.log("🚀 [service] entered", { tenantId, input });

    const [task] = await db
      .insert(tasks)
      .values({
        ...input,
        tenantId,
        isCompleted: false,
        status: "in_progress",
      })
      .returning();

    return task;
  },

  async getAll(
    tenantId: string,
    currentUser: {
      id: string;
      role: string;
    },
    query: {
      page?: number;
      limit?: number;
      projectId?: string;
      milestoneId?: string;
      parentTaskId?: string;
      assigneeId?: string;
      status?: "in_progress" | "in_review" | "done" | "blocked";
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

    // Admin can see all tasks.
    // Non-admin can only see their own assigned tasks.
    if (currentUser.role !== "admin") {
      conditions.push(eq(tasks.assigneeId, currentUser.id));
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

  // ─────────────────────────────────────────────────────────────
  // Add inside the taskService object (after `delete`, before dependencies)
  // ─────────────────────────────────────────────────────────────

  /**
   * Internal helper — moves a task to the given status.
   * Handles isCompleted / completedAt for the "done" transition.
   * `notify` controls whether an assignee notification is inserted.
   */
  async changeStatus(
    tenantId: string,
    id: string,
    status: "in_progress" | "in_review" | "done" | "blocked",
    notify: {
      type: "task completed" | "task blocked";
      title: string;
      body: string;
      metadata: Record<string, unknown>;
    } | null,
  ) {
    const existing = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)),
    });

    if (!existing) {
      throw new Error("Task not found");
    }

    return db.transaction(async (tx) => {
      const isDone = status === "done";

      const [task] = await tx
        .update(tasks)
        .set({
          status,
          isCompleted: isDone,
          completedAt: isDone ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
        .returning();

      if (!task) {
        throw new Error("Task not found");
      }

      /**
       * Notify the assignee when a task is completed or blocked.
       * Always fires — even if the current user IS the assignee
       * (per requirements).
       */
      if (notify && task.assigneeId) {
        await tx.insert(notifications).values({
          tenantId: task.tenantId,
          userId: task.assigneeId,
          type: notify.type,
          title: notify.title,
          body: notify.body,
          linkUrl: `${process.env.FRONTEND_URL}/tasks/${task.id}`,
          metadata: {
            taskId: task.id,
            projectId: task.projectId,
            milestoneId: task.milestoneId,
            status: task.status,
            ...notify.metadata,
          },
          isRead: false,
          readAt: null,
        });
      }

      return task;
    });
  },

  async submitForReview(tenantId: string, id: string) {
    return this.changeStatus(tenantId, id, "in_review", null);
  },

  async markDone(tenantId: string, id: string) {
    const existing = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)),
    });

    if (!existing) {
      throw new Error("Task not found");
    }

    return this.changeStatus(tenantId, id, "done", {
      type: "task completed",
      title: `Task completed: "${existing.title}"`,
      body: `The task "${existing.title}" has been marked as done.`,
      metadata: {
        taskTitle: existing.title,
        previousStatus: existing.status,
      },
    });
  },

  async markBlocked(tenantId: string, id: string) {
    const existing = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)),
    });

    if (!existing) {
      throw new Error("Task not found");
    }

    return this.changeStatus(tenantId, id, "blocked", {
      type: "task blocked",
      title: `Task blocked: "${existing.title}"`,
      body: `The task "${existing.title}" has been blocked and needs attention.`,
      metadata: {
        taskTitle: existing.title,
        previousStatus: existing.status,
      },
    });
  },

  async getInReview(
    tenantId: string,
    query: {
      page?: number;
      limit?: number;
      projectId?: string;
      milestoneId?: string;
      parentTaskId?: string;
      assigneeId?: string;
      priority?: "low" | "medium" | "high" | "urgent";
      search?: string;
    },
  ) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [
      eq(tasks.tenantId, tenantId),
      eq(tasks.status, "in_review"),
    ];

    if (query.projectId) conditions.push(eq(tasks.projectId, query.projectId));
    if (query.milestoneId)
      conditions.push(eq(tasks.milestoneId, query.milestoneId));
    if (query.parentTaskId)
      conditions.push(eq(tasks.parentTaskId, query.parentTaskId));
    if (query.assigneeId)
      conditions.push(eq(tasks.assigneeId, query.assigneeId));
    if (query.priority) conditions.push(eq(tasks.priority, query.priority));
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

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: countRow?.total ?? 0,
        totalPages: Math.ceil((countRow?.total ?? 0) / limit),
      },
    };
  },

  // =========================================================
  // TASK PROGRESS
  // =========================================================

  async addProgress(
    tenantId: string,
    taskId: string,
    userId: string,
    input: {
      startedAt: Date;
      endedAt: Date;
      progressPercentage: number;
      comment?: string | null;
    },
  ) {
    // ── 1. Basic input validation ────────────────────────────
    if (input.endedAt <= input.startedAt) {
      throw new Error("endedAt must be greater than startedAt");
    }

    if (input.progressPercentage < 0 || input.progressPercentage > 100) {
      throw new Error("progressPercentage must be between 0 and 100");
    }

    // ── 2. Load task ─────────────────────────────────────────
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)),
    });

    if (!task) {
      throw new Error("Task not found");
    }

    // ── 3. Only assignee can log progress ────────────────────
    if (task.assigneeId !== userId) {
      throw new Error("Only the assignee can log progress on this task");
    }

    // ── 4. Status guard ──────────────────────────────────────
    if (task.status === "in_review" || task.status === "done") {
      throw new Error(
        `Cannot log progress for a task with status "${task.status}"`,
      );
    }

    // ── 5. Transaction ───────────────────────────────────────
    return db.transaction(async (tx) => {
      // 5a. Last progress entry for monotonic check
      const [lastEntry] = await tx
        .select({
          progressPercentage: taskProgress.progressPercentage,
        })
        .from(taskProgress)
        .where(eq(taskProgress.taskId, taskId))
        .orderBy(desc(taskProgress.startedAt))
        .limit(1);

      const lastPercentage = lastEntry?.progressPercentage ?? 0;

      if (input.progressPercentage < lastPercentage) {
        throw new Error(
          `Progress cannot go backwards. Last recorded progress was ${lastPercentage}%.`,
        );
      }

      // 5b. Overlap check — reject if new session intersects an existing one
      const overlapping = await tx.query.taskProgress.findFirst({
        where: and(
          eq(taskProgress.taskId, taskId),
          sql`${taskProgress.startedAt} < ${input.endedAt.toISOString()}::timestamp`,
          sql`${taskProgress.endedAt} > ${input.startedAt.toISOString()}::timestamp`,
        ),
      });

      if (overlapping) {
        throw new Error(
          "This time range overlaps with an existing progress entry for this task",
        );
      }

      // 5c. Insert the new progress row — never touch previous rows
      const [progress] = await tx
        .insert(taskProgress)
        .values({
          tenantId,
          taskId,
          startedAt: input.startedAt,
          endedAt: input.endedAt,
          progressPercentage: input.progressPercentage,
          comment: input.comment ?? null,
        })
        .returning();

      if (!progress) {
        throw new Error("Failed to create progress entry");
      }

      // 5d. Recompute actualHours from ALL sessions
      const [sumRow] = await tx
        .select({
          totalSeconds: sql<string>`COALESCE(SUM(EXTRACT(EPOCH FROM (${taskProgress.endedAt} - ${taskProgress.startedAt}))), 0)`,
        })
        .from(taskProgress)
        .where(eq(taskProgress.taskId, taskId));

      const totalSeconds = Number(sumRow?.totalSeconds ?? 0);
      const actualHours = Math.round((totalSeconds / 3600) * 100) / 100;

      const isComplete = input.progressPercentage === 100;

      // 5e. Update task (actualHours, updatedAt, maybe status)
      const [updatedTask] = await tx
        .update(tasks)
        .set({
          actualHours: actualHours.toString(),
          updatedAt: new Date(),
          ...(isComplete
            ? {
                status: "in_review" as const,
                isCompleted: false,
                completedAt: null,
              }
            : {}),
        })
        .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)))
        .returning();

      if (!updatedTask) {
        throw new Error("Failed to update task");
      }

      // 5f. Notify project owner on every progress log
      const project = await tx.query.projects.findFirst({
        where: and(
          eq(projects.id, task.projectId),
          eq(projects.tenantId, tenantId),
        ),
        columns: { id: true, ownerId: true, name: true },
      });

      if (project?.ownerId) {
        await tx.insert(notifications).values({
          tenantId,
          userId: project.ownerId,
          type: "task progress",
          title: `Progress logged on "${task.title}"`,
          body: input.comment
            ? `${input.progressPercentage}% progress on "${task.title}": ${input.comment}`
            : `${input.progressPercentage}% progress logged on task "${task.title}" in project "${project.name}".`,
          linkUrl: `${process.env.FRONTEND_URL}/tasks/${task.id}`,
          metadata: {
            taskId: task.id,
            projectId: task.projectId,
            milestoneId: task.milestoneId,
            progressPercentage: input.progressPercentage,
            startedAt: input.startedAt.toISOString(),
            endedAt: input.endedAt.toISOString(),
            actualHours,
            comment: input.comment ?? null,
          },
          isRead: false,
          readAt: null,
        });
      }

      // 5g. If 100%, also notify the assignee that it moved to review
      if (isComplete && task.assigneeId) {
        await tx.insert(notifications).values({
          tenantId,
          userId: task.assigneeId,
          type: "task completed",
          title: `Task ready for review: "${task.title}"`,
          body: `Your task "${task.title}" reached 100% and has been moved to review.`,
          linkUrl: `${process.env.FRONTEND_URL}/tasks/${task.id}`,
          metadata: {
            taskId: task.id,
            projectId: task.projectId,
            milestoneId: task.milestoneId,
            status: "in_review",
            progressPercentage: 100,
            actualHours,
          },
          isRead: false,
          readAt: null,
        });
      }

      return {
        progress,
        task: updatedTask,
        actualHours,
      };
    });
  },

  async getTaskProgress(tenantId: string, taskId: string) {
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)),
    });

    if (!task) {
      throw new Error("Task not found");
    }

    return db.query.taskProgress.findMany({
      where: and(
        eq(taskProgress.tenantId, tenantId),
        eq(taskProgress.taskId, taskId),
      ),
      orderBy: [desc(taskProgress.startedAt)],
    });
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
    console.log("🚀 [service:createComment] entered", {
      tenantId,
      userId,
      input,
    });

    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, input.taskId), eq(tasks.tenantId, tenantId)),
    });

    console.log(
      "🔎 [service:createComment] task lookup result:",
      task ? { id: task.id, title: task.title } : null,
    );

    if (!task) {
      console.warn("⚠️ [service:createComment] task not found", {
        taskId: input.taskId,
        tenantId,
      });
      throw new Error("Task not found");
    }

    if (input.parentCommentId) {
      console.log(
        "🔎 [service:createComment] checking parent comment:",
        input.parentCommentId,
      );

      const parentComment = await db.query.comments.findFirst({
        where: and(
          eq(comments.id, input.parentCommentId),
          eq(comments.tenantId, tenantId),
          eq(comments.taskId, input.taskId),
        ),
      });

      console.log(
        "🔎 [service:createComment] parent comment result:",
        parentComment ? { id: parentComment.id } : null,
      );

      if (!parentComment) {
        console.warn("⚠️ [service:createComment] parent comment not found");
        throw new Error("Parent comment not found");
      }
    }

    const valuesToInsert = {
      tenantId,
      taskId: input.taskId,
      projectId: null,
      userId,
      content: input.content,
      parentCommentId: input.parentCommentId ?? null,
      attachments: input.attachments ?? null,
    };

    console.log("📥 [service:createComment] inserting values:", valuesToInsert);

    const [comment] = await db
      .insert(comments)
      .values(valuesToInsert)
      .returning();

    console.log("✅ [service:createComment] inserted comment:", {
      id: comment?.id,
      taskId: comment?.taskId,
      userId: comment?.userId,
      attachmentCount: Array.isArray(comment?.attachments)
        ? comment.attachments.length
        : 0,
    });

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

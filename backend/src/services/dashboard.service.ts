// src/services/dashboard.service.ts
import { and, desc, eq, gte, lte, sql, inArray, ne } from "drizzle-orm";
import { db } from "../db/index";
import {
  tasks,
  projects,
  users,
  clients,
  notifications,
} from "../db/schema/index.schema";

// ─── Types matching the frontend contract ─────────────────────

type Range = "1W" | "1M" | "3M" | "6M" | "1Y";
type Priority = "urgent" | "high" | "medium" | "low";
type TaskStatus = "in_progress" | "in_review" | "done" | "blocked";

interface RangeWindow {
  start: Date;
  end: Date;
  days: number;
  bucket: "day" | "week" | "month";
}

const RANGES: Range[] = ["1W", "1M", "3M", "6M", "1Y"];

const RANGE_CFG: Record<
  Range,
  { days: number; bucket: "day" | "week" | "month" }
> = {
  "1W": { days: 7, bucket: "day" },
  "1M": { days: 30, bucket: "day" },
  "3M": { days: 90, bucket: "week" },
  "6M": { days: 180, bucket: "week" },
  "1Y": { days: 365, bucket: "month" },
};

function rangeWindow(range: Range): RangeWindow {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (RANGE_CFG[range].days - 1));
  start.setHours(0, 0, 0, 0);
  return {
    start,
    end,
    days: RANGE_CFG[range].days,
    bucket: RANGE_CFG[range].bucket,
  };
}

function prevRangeWindow(range: Range): RangeWindow {
  const cur = rangeWindow(range);
  const end = new Date(cur.start);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (cur.days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end, days: cur.days, bucket: cur.bucket };
}

// ─── Scope helpers ────────────────────────────────────────────

interface Scope {
  /** tasks.assigneeId filter (for user role) */
  assigneeId?: string;
  /** tasks.projectId IN (...) filter (for client role) */
  projectIds?: string[];
  /** extra projects.id filter for the project list */
  projectFilter?: "all" | "client";
  /** clients.id for client role */
  clientId?: string;
}

async function resolveScope(
  tenantId: string,
  currentUser: { id: string; role: "admin" | "user" | "client" },
): Promise<Scope> {
  if (currentUser.role === "admin") {
    // Admin: no task filter, no project filter, sees everything.
    return {};
  }

  if (currentUser.role === "user") {
    // User: only their own tasks. Projects list derived from those tasks.
    return { assigneeId: currentUser.id };
  }

  // client
  const clientRow = await db.query.clients.findFirst({
    where: and(
      eq(clients.tenantId, tenantId),
      eq(clients.userId, currentUser.id),
    ),
    columns: { id: true },
  });

  if (!clientRow) {
    // No client record → no data
    return { projectIds: [], projectFilter: "client", clientId: undefined };
  }

  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(eq(projects.tenantId, tenantId), eq(projects.clientId, clientRow.id)),
    );

  return {
    projectIds: rows.map((r) => r.id),
    projectFilter: "client",
    clientId: clientRow.id,
  };
}

/** Build the drizzle conditions array for a task query given a scope. */
function taskScopeConditions(
  tenantId: string,
  scope: Scope,
): ReturnType<typeof eq>[] {
  const conds: any[] = [eq(tasks.tenantId, tenantId)];
  if (scope.assigneeId) conds.push(eq(tasks.assigneeId, scope.assigneeId));
  if (scope.projectIds && scope.projectIds.length)
    conds.push(inArray(tasks.projectId, scope.projectIds));
  if (scope.projectIds && scope.projectIds.length === 0) {
    // no projects → return a condition that never matches
    conds.push(sql`1 = 0`);
  }
  return conds;
}

// ─── Range data builder ───────────────────────────────────────

async function buildRangeData(
  tenantId: string,
  scope: Scope,
  range: Range,
  currentUser: { id: string; role: "admin" | "user" | "client" },
) {
  const cur = rangeWindow(range);
  const prev = prevRangeWindow(range);

  const base = taskScopeConditions(tenantId, scope);

  // ── project KPI (only admin/client care; user sees derived count)
  let projectStats = { active: 0, onHold: 0 };
  let prevProjectStats = { active: 0 };

  if (currentUser.role !== "user") {
    const projConds: any[] = [eq(projects.tenantId, tenantId)];
    if (scope.projectFilter === "client" && scope.clientId) {
      projConds.push(eq(projects.clientId, scope.clientId));
    }
    const [curP, prevP] = await Promise.all([
      db
        .select({
          active: sql<number>`COUNT(*) FILTER (WHERE ${projects.status} = 'active')`,
          onHold: sql<number>`COUNT(*) FILTER (WHERE ${projects.status} = 'on_hold')`,
        })
        .from(projects)
        .where(and(...projConds))
        .then((r) => r[0] ?? { active: 0, onHold: 0 }),
      db
        .select({
          active: sql<number>`COUNT(*) FILTER (WHERE ${projects.status} = 'active')`,
        })
        .from(projects)
        .where(and(...projConds, lte(projects.createdAt, prev.end)))
        .then((r) => r[0] ?? { active: 0 }),
    ]);
    projectStats = {
      active: Number(curP.active ?? 0),
      onHold: Number(curP.onHold ?? 0),
    };
    prevProjectStats = { active: Number(prevP.active ?? 0) };
  }

  // ── task KPIs
  const taskCondsCur = [
    ...base,
    gte(tasks.createdAt, cur.start),
    lte(tasks.createdAt, cur.end),
  ];
  const taskCondsPrev = [
    ...base,
    gte(tasks.createdAt, prev.start),
    lte(tasks.createdAt, prev.end),
  ];

  const [tCur, tPrev, overdueNow, overduePrev, urgentOverdue] =
    await Promise.all([
      db
        .select({
          openTasks: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} <> 'done')`,
          total: sql<number>`COUNT(*)`,
          done: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'done')`,
          inReview: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'in_review')`,
        })
        .from(tasks)
        .where(and(...taskCondsCur))
        .then((r) => r[0] ?? { openTasks: 0, total: 0, done: 0, inReview: 0 }),

      db
        .select({
          total: sql<number>`COUNT(*)`,
          done: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'done')`,
        })
        .from(tasks)
        .where(and(...taskCondsPrev))
        .then((r) => r[0] ?? { total: 0, done: 0 }),

      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tasks)
        .where(
          and(
            ...base,
            ne(tasks.status, "done"),
            sql`${tasks.dueDate} IS NOT NULL`,
            sql`${tasks.dueDate} < CURRENT_DATE`,
          ),
        )
        .then((r) => r[0]?.count ?? 0),

      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tasks)
        .where(
          and(
            ...base,
            ne(tasks.status, "done"),
            sql`${tasks.dueDate} IS NOT NULL`,
            sql`${tasks.dueDate} < ${prev.end.toISOString().slice(0, 10)}`,
          ),
        )
        .then((r) => r[0]?.count ?? 0),

      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(tasks)
        .where(
          and(
            ...base,
            ne(tasks.status, "done"),
            eq(tasks.priority, "urgent"),
            sql`${tasks.dueDate} IS NOT NULL`,
            sql`${tasks.dueDate} < CURRENT_DATE`,
          ),
        )
        .then((r) => r[0]?.count ?? 0),
    ]);

  // For user role, activeProjects comes from distinct projects with tasks
  let derivedActiveProjects = projectStats.active;
  let derivedOnHold = projectStats.onHold;
  if (currentUser.role === "user") {
    const projs = await db
      .selectDistinct({ projectId: tasks.projectId })
      .from(tasks)
      .where(and(...base));
    derivedActiveProjects = projs.filter((p) => p.projectId).length;
    derivedOnHold = 0;
  }

  const [activity, statusBreakdown, priorityBreakdown, dueLoad, team] =
    await Promise.all([
      getActivity(tenantId, cur, scope),
      getStatusBreakdown(tenantId, cur, scope),
      getPriorityBreakdown(tenantId, cur, scope),
      getDueLoad(tenantId, cur, range, scope),
      getTeam(tenantId, cur, scope, currentUser),
    ]);

  const completionRate =
    Number(tCur.total) > 0
      ? Math.round((Number(tCur.done) / Number(tCur.total)) * 100)
      : 0;

  return {
    kpis: {
      activeProjects: Number(derivedActiveProjects),
      activeProjectsDelta: Math.max(
        0,
        Number(projectStats.active ?? 0) - Number(prevProjectStats.active ?? 0),
      ),
      onHold: Number(derivedOnHold),
      openTasks: Number(tCur.openTasks ?? 0),
      completionRate,
      inReview: Number(tCur.inReview ?? 0),
      overdueTasks: Number(overdueNow),
      overdueDelta: Math.max(0, Number(overdueNow) - Number(overduePrev)),
      urgentOverdue: Number(urgentOverdue),
    },
    activity,
    statusBreakdown,
    priorityBreakdown,
    dueLoad,
    team,
  };
}

// ─── Sub-queries ──────────────────────────────────────────────

async function getActivity(tenantId: string, cur: RangeWindow, scope: Scope) {
  const base = taskScopeConditions(tenantId, scope);
  const truncExpr = sql`DATE_TRUNC('${sql.raw(cur.bucket)}', ${tasks.createdAt})`;
  const truncCompleted = sql`DATE_TRUNC('${sql.raw(cur.bucket)}', ${tasks.completedAt})`;

  const [createdRows, completedRows] = await Promise.all([
    db
      .select({ bucket: truncExpr.as("bucket"), count: sql<number>`COUNT(*)` })
      .from(tasks)
      .where(
        and(
          ...base,
          gte(tasks.createdAt, cur.start),
          lte(tasks.createdAt, cur.end),
        ),
      )
      .groupBy(truncExpr)
      .orderBy(truncExpr),

    db
      .select({
        bucket: truncCompleted.as("bucket"),
        count: sql<number>`COUNT(*)`,
      })
      .from(tasks)
      .where(
        and(
          ...base,
          sql`${tasks.completedAt} IS NOT NULL`,
          gte(tasks.completedAt, cur.start),
          lte(tasks.completedAt, cur.end),
        ),
      )
      .groupBy(truncCompleted)
      .orderBy(truncCompleted),
  ]);

  const buckets = enumerateBuckets(cur);
  const createdMap = new Map(
    createdRows.map((r) => [
      new Date(r.bucket as string | Date).toISOString(),
      Number(r.count),
    ]),
  );
  const completedMap = new Map(
    completedRows.map((r) => [
      new Date(r.bucket as string | Date).toISOString(),
      Number(r.count),
    ]),
  );

  return buckets.map((b) => ({
    label: b.label,
    created: createdMap.get(b.iso) ?? 0,
    completed: completedMap.get(b.iso) ?? 0,
  }));
}

async function getStatusBreakdown(
  tenantId: string,
  cur: RangeWindow,
  scope: Scope,
) {
  const rows = await db
    .select({ status: tasks.status, count: sql<number>`COUNT(*)` })
    .from(tasks)
    .where(
      and(
        ...taskScopeConditions(tenantId, scope),
        gte(tasks.createdAt, cur.start),
        lte(tasks.createdAt, cur.end),
      ),
    )
    .groupBy(tasks.status);

  const map = new Map(rows.map((r) => [r.status, Number(r.count)]));

  return (["in_progress", "in_review", "done", "blocked"] as TaskStatus[]).map(
    (key) => ({ key, count: map.get(key) ?? 0 }),
  );
}

async function getPriorityBreakdown(
  tenantId: string,
  cur: RangeWindow,
  scope: Scope,
) {
  const rows = await db
    .select({ priority: tasks.priority, count: sql<number>`COUNT(*)` })
    .from(tasks)
    .where(
      and(
        ...taskScopeConditions(tenantId, scope),
        gte(tasks.createdAt, cur.start),
        lte(tasks.createdAt, cur.end),
      ),
    )
    .groupBy(tasks.priority);

  const map = new Map(rows.map((r) => [r.priority, Number(r.count)]));

  return (["urgent", "high", "medium", "low"] as Priority[]).map((key) => ({
    key,
    count: map.get(key) ?? 0,
  }));
}

async function getDueLoad(
  tenantId: string,
  cur: RangeWindow,
  range: Range,
  scope: Scope,
) {
  const trunc =
    range === "1Y"
      ? "month"
      : range === "3M" || range === "6M"
        ? "week"
        : "day";
  const expr = sql`DATE_TRUNC('${sql.raw(trunc)}', ${tasks.dueDate}::timestamp)`;

  const rows = await db
    .select({ bucket: expr.as("bucket"), count: sql<number>`COUNT(*)` })
    .from(tasks)
    .where(
      and(
        ...taskScopeConditions(tenantId, scope),
        sql`${tasks.dueDate} IS NOT NULL`,
        sql`${tasks.dueDate} >= ${cur.start.toISOString().slice(0, 10)}`,
        sql`${tasks.dueDate} <= ${cur.end.toISOString().slice(0, 10)}`,
      ),
    )
    .groupBy(expr)
    .orderBy(expr);

  return rows.map((r) => {
    const d = new Date(String(r.bucket));
    const label =
      trunc === "month"
        ? d.toLocaleDateString("en", { month: "short", year: "2-digit" })
        : d.toLocaleDateString("en", { month: "short", day: "numeric" });
    return { label, due: Number(r.count) };
  });
}

async function getTeam(
  tenantId: string,
  cur: RangeWindow,
  scope: Scope,
  currentUser: { id: string; role: "admin" | "user" | "client" },
) {
  const conds = [
    ...taskScopeConditions(tenantId, scope),
    gte(tasks.createdAt, cur.start),
    lte(tasks.createdAt, cur.end),
  ];

  const rows = await db
    .select({
      userId: tasks.assigneeId,
      name: users.name,
      assigned: sql<number>`COUNT(*)`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'done')`,
      onTime: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'done' AND ${tasks.completedAt} IS NOT NULL AND ${tasks.dueDate} IS NOT NULL AND ${tasks.completedAt}::date <= ${tasks.dueDate})`,
      late: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'done' AND ${tasks.completedAt} IS NOT NULL AND ${tasks.dueDate} IS NOT NULL AND ${tasks.completedAt}::date > ${tasks.dueDate})`,
      overdue: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} <> 'done' AND ${tasks.dueDate} IS NOT NULL AND ${tasks.dueDate} < CURRENT_DATE)`,
      estHours: sql<number>`COALESCE(SUM(${tasks.estimatedHours}), 0)`,
      actualHours: sql<number>`COALESCE(SUM(${tasks.actualHours}), 0)`,
    })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(and(...conds))
    .groupBy(tasks.assigneeId, users.name);

  return rows
    .filter((r) => r.userId)
    .map((r) => ({
      name: r.name ?? "Unknown",
      assigned: Number(r.assigned),
      completed: Number(r.completed),
      onTime: Number(r.onTime),
      late: Number(r.late),
      overdue: Number(r.overdue),
      estHours: Number(r.estHours),
      actualHours: Number(r.actualHours),
    }));
}

// ─── Projects / review / dueSoon / recent ─────────────────────

async function getProjectsList(
  tenantId: string,
  scope: Scope,
  role: "admin" | "user" | "client",
) {
  const conds: any[] = [eq(projects.tenantId, tenantId)];

  if (role === "client") {
    if (!scope.clientId) return []; // no client record → nothing
    conds.push(eq(projects.clientId, scope.clientId));
  } else if (role === "user") {
    if (!scope.projectIds || scope.projectIds.length === 0) return [];
    conds.push(inArray(projects.id, scope.projectIds));
  }
  // admin → no extra filter, sees all tenant projects

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientName: clients.name,
      budgetAmount: projects.budgetAmount,
      budgetHours: projects.budgetHours,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(and(...conds))
    .limit(50); // bumped from 20 so admin sees more

  if (rows.length === 0) return [];

  // progress per project — unchanged
  const progressRows = await db
    .select({
      projectId: tasks.projectId,
      total: sql<number>`COUNT(*)`,
      done: sql<number>`COUNT(*) FILTER (WHERE ${tasks.status} = 'done')`,
      actualHours: sql<number>`COALESCE(SUM(${tasks.actualHours}), 0)`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.tenantId, tenantId),
        inArray(
          tasks.projectId,
          rows.map((r) => r.id),
        ),
      ),
    )
    .groupBy(tasks.projectId);

  const map = new Map(
    progressRows.map((r) => [
      r.projectId,
      {
        progress:
          Number(r.total) > 0
            ? Math.round((Number(r.done) / Number(r.total)) * 100)
            : 0,
        actualHours: Number(r.actualHours),
      },
    ]),
  );

  return rows.map((r) => {
    const p = map.get(r.id);
    const budgetSource = r.budgetAmount ?? r.budgetHours ?? null;
    const budgetUsed =
      budgetSource && Number(budgetSource) > 0
        ? Math.min(
            100,
            Math.round(((p?.actualHours ?? 0) / Number(budgetSource)) * 100),
          )
        : 0;
    return {
      id: r.id,
      name: r.name,
      client: r.clientName ?? "—",
      progress: p?.progress ?? 0,
      budgetUsed,
    };
  });
}

async function getReviewQueue(tenantId: string, scope: Scope) {
  const conds = [
    ...taskScopeConditions(tenantId, scope),
    eq(tasks.status, "in_review"),
  ];

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      priority: tasks.priority,
      updatedAt: tasks.updatedAt,
      projectName: projects.name,
      userName: users.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(and(...conds))
    .orderBy(desc(tasks.updatedAt))
    .limit(10);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    project: r.projectName ?? "—",
    by: r.userName ?? "Unassigned",
    when: timeAgo(r.updatedAt),
    priority: r.priority as Priority,
  }));
}

async function getDueSoon(tenantId: string, scope: Scope) {
  const conds = [
    ...taskScopeConditions(tenantId, scope),
    ne(tasks.status, "done"),
    sql`${tasks.dueDate} IS NOT NULL`,
    sql`${tasks.dueDate} >= CURRENT_DATE`,
    sql`${tasks.dueDate} <= CURRENT_DATE + INTERVAL '7 days'`,
  ];

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      priority: tasks.priority,
    })
    .from(tasks)
    .where(and(...conds))
    .orderBy(tasks.dueDate)
    .limit(10);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows.map((r) => {
    const due = new Date(r.dueDate!);
    due.setHours(0, 0, 0, 0);
    const inDays = Math.round(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      id: r.id,
      title: r.title,
      due: due.toLocaleDateString("en", { month: "short", day: "numeric" }),
      inDays,
      priority: r.priority as Priority,
    };
  });
}

async function getRecentActivity(tenantId: string, scope: Scope) {
  const conds: any[] = [eq(notifications.tenantId, tenantId)];

  if (scope.assigneeId) conds.push(eq(notifications.userId, scope.assigneeId));
  if (scope.projectIds && scope.projectIds.length) {
    conds.push(
      sql`${notifications.metadata}->>'projectId' = ANY(${sql.raw(
        `ARRAY[${scope.projectIds.map((id) => `'${id}'`).join(",")}]::text[]`,
      )})`,
    );
  }

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      createdAt: notifications.createdAt,
      userName: users.name,
    })
    .from(notifications)
    .leftJoin(users, eq(users.id, notifications.userId))
    .where(and(...conds))
    .orderBy(desc(notifications.createdAt))
    .limit(10);

  return rows.map((r) => ({
    id: r.id,
    user: r.userName ?? "System",
    action: r.type,
    target: r.title,
    when: timeAgo(r.createdAt),
  }));
}

// ─── helpers ──────────────────────────────────────────────────

function enumerateBuckets(cur: RangeWindow) {
  const out: Array<{ iso: string; label: string }> = [];
  const start = new Date(cur.start);
  const end = new Date(cur.end);

  if (cur.bucket === "day") {
    const d = new Date(start);
    while (d <= end) {
      out.push({
        iso: new Date(d).toISOString(),
        label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      });
      d.setDate(d.getDate() + 1);
    }
  } else if (cur.bucket === "week") {
    const d = new Date(start);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    while (d <= end) {
      out.push({
        iso: new Date(d).toISOString(),
        label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      });
      d.setDate(d.getDate() + 7);
    }
  } else {
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d <= end) {
      out.push({
        iso: new Date(d).toISOString(),
        label: d.toLocaleDateString("en", { month: "short", year: "2-digit" }),
      });
      d.setMonth(d.getMonth() + 1);
    }
  }
  return out;
}

function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

// ─── Public API ───────────────────────────────────────────────

export const dashboardService = {
  /**
   * Returns the full dashboard payload for the given user.
   * All 5 ranges are computed so the frontend can switch range
   * without a new request (matches the `byRange` contract).
   */
  async getDashboard(
    tenantId: string,
    currentUser: { id: string; role: "admin" | "user" | "client" },
  ) {
    const scope = await resolveScope(tenantId, currentUser);

    const [rangeEntries, projectsList, review, dueSoon, recent] =
      await Promise.all([
        Promise.all(
          RANGES.map(async (r) => {
            const data = await buildRangeData(tenantId, scope, r, currentUser);
            return [r, data] as const;
          }),
        ),
        getProjectsList(tenantId, scope, currentUser.role), // ← pass role
        getReviewQueue(tenantId, scope),
        getDueSoon(tenantId, scope),
        getRecentActivity(tenantId, scope),
      ]);

    const byRange = Object.fromEntries(rangeEntries) as Record<Range, any>;

    return { byRange, projects: projectsList, review, dueSoon, recent };
  },
};

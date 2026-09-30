"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types (swap DEMO for your API response later) ────────────────────────────

type Priority = "urgent" | "high" | "medium" | "low";

interface DashboardData {
  kpis: {
    activeProjects: number;
    activeProjectsDelta: number;
    onHold: number;
    openTasks: number;
    completionRate: number;
    inReview: number;
    overdueTasks: number;
    overdueDelta: number;
    urgentOverdue: number;
    outstanding: number;
    overdueInvoices: number;
    sentInvoices: number;
    pastDue: number;
  };
  activity: Array<{ label: string; created: number; completed: number }>;
  statusBreakdown: Array<{
    key: "in_progress" | "in_review" | "done" | "blocked";
    count: number;
  }>;
  priorityBreakdown: Array<{ key: Priority; count: number }>;
  finance: Array<{ month: string; revenue: number; expenses: number }>;
  projects: Array<{
    id: string;
    name: string;
    client: string;
    progress: number;
    budgetUsed: number;
  }>;
  review: Array<{
    id: string;
    title: string;
    project: string;
    by: string;
    when: string;
    priority: Priority;
  }>;
  team: Array<{
    name: string;
    assigned: number; // tasks assigned in range
    completed: number; // isCompleted = true
    onTime: number; // completedAt <= dueDate
    late: number; // completedAt >  dueDate
    overdue: number; // still open and past dueDate
    estHours: number; // sum estimatedHours
    actualHours: number; // sum actualHours
  }>;
  dueSoon: Array<{
    id: string;
    title: string;
    due: string;
    inDays: number;
    priority: Priority;
  }>;
  recent: Array<{
    id: string;
    user: string;
    action: string;
    target: string;
    when: string;
  }>;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO: DashboardData = {
  kpis: {
    activeProjects: 12,
    activeProjectsDelta: 2,
    onHold: 3,
    openTasks: 148,
    completionRate: 62,
    inReview: 23,
    overdueTasks: 9,
    overdueDelta: 3,
    urgentOverdue: 2,
    outstanding: 24860,
    overdueInvoices: 3,
    sentInvoices: 11,
    pastDue: 8400,
  },
  activity: [
    { label: "Aug 10", created: 22, completed: 18 },
    { label: "Aug 17", created: 30, completed: 24 },
    { label: "Aug 24", created: 26, completed: 29 },
    { label: "Aug 31", created: 34, completed: 27 },
    { label: "Sep 7", created: 29, completed: 33 },
    { label: "Sep 14", created: 38, completed: 31 },
    { label: "Sep 21", created: 33, completed: 40 },
    { label: "Sep 28", created: 36, completed: 37 },
  ],
  statusBreakdown: [
    { key: "in_progress", count: 64 },
    { key: "in_review", count: 23 },
    { key: "done", count: 52 },
    { key: "blocked", count: 9 },
  ],
  priorityBreakdown: [
    { key: "urgent", count: 6 },
    { key: "high", count: 31 },
    { key: "medium", count: 72 },
    { key: "low", count: 39 },
  ],
  finance: [
    { month: "Apr", revenue: 9200, expenses: 3100 },
    { month: "May", revenue: 11800, expenses: 4200 },
    { month: "Jun", revenue: 10400, expenses: 3600 },
    { month: "Jul", revenue: 14100, expenses: 5000 },
    { month: "Aug", revenue: 12900, expenses: 4400 },
    { month: "Sep", revenue: 16300, expenses: 5200 },
  ],
  projects: [
    {
      id: "p1",
      name: "Riverside Brand Refresh",
      client: "Northwind Co.",
      progress: 78,
      budgetUsed: 64,
    },
    {
      id: "p2",
      name: "E-commerce Migration",
      client: "Bluepeak Retail",
      progress: 45,
      budgetUsed: 82,
    },
    {
      id: "p3",
      name: "Mobile App v2",
      client: "Kestrel Health",
      progress: 31,
      budgetUsed: 28,
    },
    {
      id: "p4",
      name: "Annual Report Design",
      client: "Harbor Capital",
      progress: 92,
      budgetUsed: 90,
    },
  ],
  review: [
    {
      id: "r1",
      title: "Homepage hero mockup v3",
      project: "Riverside Brand Refresh",
      by: "Nadia Rahman",
      when: "2h ago",
      priority: "high",
    },
    {
      id: "r2",
      title: "Checkout flow QA sign-off",
      project: "E-commerce Migration",
      by: "Imran Hossain",
      when: "5h ago",
      priority: "urgent",
    },
    {
      id: "r3",
      title: "Onboarding copy",
      project: "Mobile App v2",
      by: "Sara Khan",
      when: "Yesterday",
      priority: "medium",
    },
    {
      id: "r4",
      title: "Chart palette proof",
      project: "Annual Report Design",
      by: "Tanvir Ahmed",
      when: "Yesterday",
      priority: "low",
    },
  ],
  team: [
    {
      name: "Nadia Rahman",
      assigned: 42,
      completed: 36,
      onTime: 31,
      late: 5,
      overdue: 2,
      estHours: 120,
      actualHours: 112,
    },
    {
      name: "Imran Hossain",
      assigned: 48,
      completed: 35,
      onTime: 26,
      late: 9,
      overdue: 4,
      estHours: 150,
      actualHours: 171,
    },
    {
      name: "Sara Khan",
      assigned: 30,
      completed: 26,
      onTime: 24,
      late: 2,
      overdue: 1,
      estHours: 90,
      actualHours: 84,
    },
    {
      name: "Tanvir Ahmed",
      assigned: 45,
      completed: 36,
      onTime: 28,
      late: 8,
      overdue: 3,
      estHours: 140,
      actualHours: 158,
    },
    {
      name: "Farhana Islam",
      assigned: 22,
      completed: 20,
      onTime: 19,
      late: 1,
      overdue: 0,
      estHours: 60,
      actualHours: 55,
    },
  ],
  dueSoon: [
    {
      id: "d1",
      title: "Submit staging build",
      due: "Oct 1",
      inDays: 1,
      priority: "urgent",
    },
    {
      id: "d2",
      title: "Client feedback round 2",
      due: "Oct 2",
      inDays: 2,
      priority: "high",
    },
    {
      id: "d3",
      title: "Invoice #INV-0142 follow-up",
      due: "Oct 3",
      inDays: 3,
      priority: "medium",
    },
    {
      id: "d4",
      title: "Sprint planning doc",
      due: "Oct 5",
      inDays: 5,
      priority: "low",
    },
    {
      id: "d5",
      title: "Q4 retainer renewal",
      due: "Oct 6",
      inDays: 6,
      priority: "medium",
    },
  ],
  recent: [
    {
      id: "a1",
      user: "Nadia Rahman",
      action: "completed",
      target: "Logo lockup exports",
      when: "12m ago",
    },
    {
      id: "a2",
      user: "Imran Hossain",
      action: "moved to review",
      target: "Checkout flow QA",
      when: "1h ago",
    },
    {
      id: "a3",
      user: "Sara Khan",
      action: "commented on",
      target: "Onboarding copy",
      when: "3h ago",
    },
    {
      id: "a4",
      user: "System",
      action: "marked overdue",
      target: "INV-0139 · Bluepeak Retail",
      when: "5h ago",
    },
    {
      id: "a5",
      user: "Tanvir Ahmed",
      action: "logged 3.5h on",
      target: "Chart palette proof",
      when: "Yesterday",
    },
  ],
};

// ─── Formatters & maps ────────────────────────────────────────────────────────

const money = (n: number) =>
  `$${n.toLocaleString("en", { maximumFractionDigits: 0 })}`;
const initials = (n: string) =>
  n
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2);

const STATUS_CFG = {
  in_progress: { label: "In progress", color: "#0ea5e9" },
  in_review: { label: "In review", color: "#f59e0b" },
  done: { label: "Done", color: "#10b981" },
  blocked: { label: "Blocked", color: "#ef4444" },
} as const;

const PRIORITY_CFG: Record<Priority, { pill: string; bar: string }> = {
  urgent: { pill: "bg-red-100 text-red-700", bar: "bg-red-500" },
  high: { pill: "bg-orange-100 text-orange-700", bar: "bg-orange-500" },
  medium: { pill: "bg-amber-100 text-amber-700", bar: "bg-amber-400" },
  low: { pill: "bg-sky-100 text-sky-700", bar: "bg-sky-500" },
};

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 min-w-0 ${className}`}
    >
      {children}
    </div>
  );
}

function CardHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 mb-4">
      <div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function Legend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-sm inline-block"
            style={{ background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function PriorityPill({ p }: { p: Priority }) {
  return (
    <span
      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_CFG[p].pill}`}
    >
      {p}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="h-7 w-7 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
      {name === "System" ? "⚙" : initials(name)}
    </div>
  );
}

function ProgressBar({
  value,
  color,
  className = "",
}: {
  value: number;
  color: string;
  className?: string;
}) {
  return (
    <div
      className={`h-1.5 bg-gray-100 rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, value)}%`, background: color }}
      />
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon,
  tone,
  chip,
  chipTone,
  note,
  valueClass = "text-gray-900",
}: {
  label: string;
  value: string;
  icon: string;
  tone: "indigo" | "sky" | "rose" | "emerald";
  chip: string;
  chipTone: "up" | "down";
  note: string;
  valueClass?: string;
}) {
  const t = {
    indigo: "bg-indigo-50 text-indigo-600",
    sky: "bg-sky-50 text-sky-600",
    rose: "bg-rose-50 text-rose-600",
    emerald: "bg-emerald-50 text-emerald-600",
  }[tone];
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500">{label}</p>
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center ${t}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
      <p className={`text-3xl font-bold tracking-tight mt-2 ${valueClass}`}>
        {value}
      </p>
      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
        <span
          className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
            chipTone === "up"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-600"
          }`}
        >
          {chip}
        </span>
        {note}
      </div>
    </Card>
  );
}

// ─── Charts (pure SVG) ────────────────────────────────────────────────────────

function ActivityChart({ data }: { data: DashboardData["activity"] }) {
  const W = 900,
    H = 250,
    L = 34,
    R = 10,
    T = 10,
    B = 24;
  const max =
    Math.ceil(
      Math.max(...data.flatMap((d) => [d.created, d.completed]), 1) / 10,
    ) * 10;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(data.length - 1, 1);
  const y = (v: number) => H - B - (v / max) * (H - T - B);
  const line = (k: "created" | "completed") =>
    data.map((d, i) => `${i ? "L" : "M"}${x(i)} ${y(d[k])}`).join(" ");
  const area = `${line("completed")} L${x(data.length - 1)} ${H - B} L${x(0)} ${H - B}Z`;
  const ticks = Array.from({ length: 6 }, (_, i) => (max / 5) * i);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Task activity"
    >
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4f46e5" stopOpacity={0.25} />
          <stop offset="1" stopColor="#4f46e5" stopOpacity={0} />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#f1f5f9" />
          <text
            x={L - 8}
            y={y(t) + 4}
            textAnchor="end"
            fontSize={11}
            fill="#9ca3af"
          >
            {t}
          </text>
        </g>
      ))}
      {data.map((d, i) => (
        <text
          key={d.label}
          x={x(i)}
          y={H - 6}
          textAnchor="middle"
          fontSize={11}
          fill="#9ca3af"
        >
          {d.label}
        </text>
      ))}
      <path d={area} fill="url(#areaFill)" />
      <path
        d={line("created")}
        fill="none"
        stroke="#c7d2fe"
        strokeWidth={2.5}
        strokeDasharray="5 4"
      />
      <path
        d={line("completed")}
        fill="none"
        stroke="#4f46e5"
        strokeWidth={2.5}
      />
      {data.map((d, i) => (
        <circle
          key={d.label}
          cx={x(i)}
          cy={y(d.completed)}
          r={3.5}
          fill="#fff"
          stroke="#4f46e5"
          strokeWidth={2}
        >
          <title>{`${d.label}: ${d.completed} completed, ${d.created} created`}</title>
        </circle>
      ))}
    </svg>
  );
}

function StatusDonut({ data }: { data: DashboardData["statusBreakdown"] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const r = 52,
    cf = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg
      viewBox="0 0 140 140"
      className="h-[140px] w-[140px] flex-shrink-0"
      role="img"
      aria-label="Tasks by status"
    >
      <g transform="rotate(-90 70 70)">
        {data.map((d) => {
          const len = (d.count / total) * cf;
          const el = (
            <circle
              key={d.key}
              cx={70}
              cy={70}
              r={r}
              fill="none"
              stroke={STATUS_CFG[d.key].color}
              strokeWidth={16}
              strokeDasharray={`${len - 2} ${cf - len + 2}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </g>
      <text
        x={70}
        y={68}
        textAnchor="middle"
        fontSize={24}
        fontWeight={700}
        fill="#111827"
      >
        {total}
      </text>
      <text x={70} y={86} textAnchor="middle" fontSize={11} fill="#9ca3af">
        total tasks
      </text>
    </svg>
  );
}

function FinanceBars({ data }: { data: DashboardData["finance"] }) {
  const W = 460,
    H = 250,
    L = 34,
    R = 6,
    T = 8,
    B = 24;
  const max =
    Math.ceil(
      Math.max(...data.flatMap((d) => [d.revenue, d.expenses]), 1) / 5000,
    ) * 5000;
  const y = (v: number) => H - B - (v / max) * (H - T - B);
  const bw = (W - L - R) / data.length;
  const ticks = Array.from({ length: 5 }, (_, i) => (max / 4) * i);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Revenue vs expenses"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#f1f5f9" />
          <text
            x={L - 6}
            y={y(t) + 4}
            textAnchor="end"
            fontSize={11}
            fill="#9ca3af"
          >
            ${t / 1000}k
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = L + i * bw + bw / 2;
        return (
          <g key={d.month}>
            <rect
              x={cx - 15}
              y={y(d.revenue)}
              width={14}
              height={H - B - y(d.revenue)}
              rx={3}
              fill="#10b981"
            >
              <title>{`${d.month} revenue ${money(d.revenue)}`}</title>
            </rect>
            <rect
              x={cx + 1}
              y={y(d.expenses)}
              width={14}
              height={H - B - y(d.expenses)}
              rx={3}
              fill="#f59e0b"
            >
              <title>{`${d.month} expenses ${money(d.expenses)}`}</title>
            </rect>
            <text
              x={cx}
              y={H - 6}
              textAnchor="middle"
              fontSize={11}
              fill="#9ca3af"
            >
              {d.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Team performance ─────────────────────────────────────────────────────────

function TeamPerformance({ team }: { team: DashboardData["team"] }) {
  const sum = (k: "assigned" | "completed" | "onTime" | "late" | "overdue") =>
    team.reduce((s, m) => s + m[k], 0);
  const totals = {
    assigned: sum("assigned"),
    completed: sum("completed"),
    onTime: sum("onTime"),
    late: sum("late"),
    overdue: sum("overdue"),
  };
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  const head =
    "px-3 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider";

  return (
    <Card>
      <CardHead
        title="Team performance"
        sub="Assigned vs completed, delivery timing and effort · selected range"
        right={
          <Legend
            items={[
              { label: "On time", color: "#10b981" },
              { label: "Late", color: "#f59e0b" },
              { label: "Open", color: "#e5e7eb" },
            ]}
          />
        }
      />
      <div className="overflow-x-auto -mx-2">
        <table className="w-full min-w-[880px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className={`${head} text-left`}>Member</th>
              <th className={`${head} text-right`}>Assigned</th>
              <th className={`${head} text-right`}>Completed</th>
              <th className={`${head} text-right`}>On time</th>
              <th className={`${head} text-right`}>Late</th>
              <th className={`${head} text-right`}>Overdue</th>
              <th className={`${head} text-left w-56`}>Delivery</th>
              <th className={`${head} text-right`}>On-time rate</th>
              <th className={`${head} text-right`}>Est. vs actual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {team.map((m) => {
              const rate = pct(m.onTime, m.completed);
              const variance =
                m.estHours > 0
                  ? Math.round(
                      ((m.actualHours - m.estHours) / m.estHours) * 100,
                    )
                  : 0;
              const over = variance > 0;
              return (
                <tr key={m.name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.name} />
                      <span className="text-sm font-semibold text-gray-800">
                        {m.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-gray-900">
                    {m.assigned}
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-gray-600">
                    <span className="font-bold text-gray-900">
                      {m.completed}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">
                      ({pct(m.completed, m.assigned)}%)
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-semibold text-emerald-600">
                    {m.onTime}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-semibold text-amber-600">
                    {m.late}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {m.overdue > 0 ? (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                        {m.overdue}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-300">0</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div
                      className="flex h-2 rounded-full overflow-hidden bg-gray-100"
                      title={`${m.onTime} on time · ${m.late} late · ${m.assigned - m.completed} open`}
                    >
                      <div
                        className="bg-emerald-500"
                        style={{ width: `${(m.onTime / m.assigned) * 100}%` }}
                      />
                      <div
                        className="bg-amber-400"
                        style={{ width: `${(m.late / m.assigned) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span
                      className={`text-sm font-bold ${rate >= 85 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-red-500"}`}
                    >
                      {rate}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <p className="text-xs text-gray-500">
                      {m.actualHours}h / {m.estHours}h
                    </p>
                    <span
                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                        over
                          ? "bg-red-50 text-red-600"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {over ? "+" : ""}
                      {variance}% {over ? "over" : "under"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-100 bg-gray-50/60">
              <td className="px-3 py-3 text-xs font-bold text-gray-500 uppercase">
                Team total
              </td>
              <td className="px-3 py-3 text-right text-sm font-black text-gray-900">
                {totals.assigned}
              </td>
              <td className="px-3 py-3 text-right text-sm font-black text-gray-900">
                {totals.completed}{" "}
                <span className="text-xs font-medium text-gray-400">
                  ({pct(totals.completed, totals.assigned)}%)
                </span>
              </td>
              <td className="px-3 py-3 text-right text-sm font-black text-emerald-600">
                {totals.onTime}
              </td>
              <td className="px-3 py-3 text-right text-sm font-black text-amber-600">
                {totals.late}
              </td>
              <td className="px-3 py-3 text-right text-sm font-black text-red-500">
                {totals.overdue}
              </td>
              <td />
              <td className="px-3 py-3 text-right text-sm font-black text-gray-900">
                {pct(totals.onTime, totals.completed)}%
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const RANGES = ["7d", "30d", "90d", "YTD"] as const;

export default function DashboardPage() {
  const d = DEMO;
  const k = d.kpis;
  const [range, setRange] = useState<(typeof RANGES)[number]>("30d");

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const maxPriority = Math.max(...d.priorityBreakdown.map((p) => p.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-gray-400">
            {greeting}, Akil Tajwar Chowdhury
          </p>
          <h1 className="text-2xl font-black text-gray-900 mt-0.5">
            Business Overview
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {now.toLocaleDateString("en", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                range === r
                  ? "bg-indigo-600 text-white"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active projects"
          tone="indigo"
          value={String(k.activeProjects)}
          chip={`+${k.activeProjectsDelta}`}
          chipTone="up"
          note={`vs last month · ${k.onHold} on hold`}
          icon="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
        />
        <KpiCard
          label="Open tasks"
          tone="sky"
          value={String(k.openTasks)}
          chip={`${k.completionRate}%`}
          chipTone="up"
          note={`completed this month · ${k.inReview} in review`}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
        <KpiCard
          label="Overdue tasks"
          tone="rose"
          value={String(k.overdueTasks)}
          valueClass="text-red-500"
          chip={`+${k.overdueDelta}`}
          chipTone="down"
          note={`since last week · ${k.urgentOverdue} urgent`}
          icon="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
        <KpiCard
          label="Outstanding invoices"
          tone="emerald"
          value={money(k.outstanding)}
          chip={`${k.overdueInvoices} overdue`}
          chipTone="down"
          note={`of ${k.sentInvoices} sent · ${money(k.pastDue)} past due`}
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </div>

      {/* Team performance */}
      <TeamPerformance team={d.team} />

      {/* Activity + status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHead
            title="Task activity"
            sub="Created vs completed, weekly"
            right={
              <Legend
                items={[
                  { label: "Completed", color: "#4f46e5" },
                  { label: "Created", color: "#c7d2fe" },
                ]}
              />
            }
          />
          <ActivityChart data={d.activity} />
        </Card>

        <Card>
          <CardHead title="Tasks by status" sub="All active projects" />
          <div className="flex items-center gap-5 flex-wrap">
            <StatusDonut data={d.statusBreakdown} />
            <div className="flex-1 min-w-[130px] space-y-2.5">
              {d.statusBreakdown.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2 text-gray-600">
                    <span
                      className="h-2.5 w-2.5 rounded-[3px]"
                      style={{ background: STATUS_CFG[s.key].color }}
                    />
                    {STATUS_CFG[s.key].label}
                  </span>
                  <span className="font-semibold text-gray-900">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Priority breakdown</p>
            <div className="space-y-2.5">
              {d.priorityBreakdown.map((p) => (
                <div
                  key={p.key}
                  className="grid grid-cols-[60px_1fr_28px] items-center gap-2.5 text-sm"
                >
                  <span className="text-gray-600 capitalize">{p.key}</span>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${PRIORITY_CFG[p.key].bar}`}
                      style={{ width: `${(p.count / maxPriority) * 100}%` }}
                    />
                  </div>
                  <span className="font-semibold text-gray-900 text-right">
                    {p.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Finance + projects + review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHead
            title="Revenue vs expenses"
            sub="Paid invoices · expenses, last 6 months"
            right={
              <Legend
                items={[
                  { label: "Revenue", color: "#10b981" },
                  { label: "Expenses", color: "#f59e0b" },
                ]}
              />
            }
          />
          <FinanceBars data={d.finance} />
        </Card>

        <Card>
          <CardHead
            title="Project health"
            sub="Progress · budget used"
            right={
              <Link
                href="/projects"
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                View all →
              </Link>
            }
          />
          <div className="divide-y divide-gray-100">
            {d.projects.map((p) => {
              const risk = p.budgetUsed >= 80;
              return (
                <div
                  key={p.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-400">{p.client}</p>
                    <ProgressBar
                      value={p.progress}
                      color={risk ? "#f59e0b" : "#4f46e5"}
                      className="mt-2"
                    />
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {p.progress}%
                    </p>
                    <p
                      className={`text-xs ${risk ? "text-red-500 font-semibold" : "text-gray-400"}`}
                    >
                      {p.budgetUsed}% budget
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead
            title="Review queue"
            sub="Waiting for your approval"
            right={
              <Link
                href="/review-queue"
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                Open queue →
              </Link>
            }
          />
          <div className="divide-y divide-gray-100">
            {d.review.map((r) => (
              <div
                key={r.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center gap-3"
              >
                <Avatar name={r.by} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {r.title}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {r.project} · {r.when}
                  </p>
                </div>
                <PriorityPill p={r.priority} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Due soon + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHead
            title="Due soon"
            sub="Next 7 days"
            right={
              <Link
                href="/tasks"
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              >
                All tasks →
              </Link>
            }
          />
          <div className="divide-y divide-gray-100">
            {d.dueSoon.map((t) => (
              <div
                key={t.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {t.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    Due {t.due} · in {t.inDays} day{t.inDays !== 1 ? "s" : ""}
                  </p>
                </div>
                <PriorityPill p={t.priority} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead title="Recent activity" sub="Across all projects" />
          <div className="divide-y divide-gray-100">
            {d.recent.map((a) => (
              <div
                key={a.id}
                className="py-3 first:pt-0 last:pb-0 flex items-start gap-3"
              >
                <Avatar name={a.user} />
                <div className="min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">
                      {a.user}
                    </span>{" "}
                    {a.action}{" "}
                    <span className="font-semibold text-gray-900">
                      {a.target}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{a.when}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

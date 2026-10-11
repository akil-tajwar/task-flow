"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types (swap DEMO for your API response later) ────────────────────────────

type Priority = "urgent" | "high" | "medium" | "low";

const RANGES = ["1W", "1M", "3M", "6M", "1Y"] as const;
type Range = (typeof RANGES)[number];

/** Everything that depends on the selected date range */
interface RangeData {
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
  };
  activity: Array<{ label: string; created: number; completed: number }>;
  statusBreakdown: Array<{
    key: "in_progress" | "in_review" | "done" | "blocked";
    count: number;
  }>;
  priorityBreakdown: Array<{ key: Priority; count: number }>;
  dueLoad: Array<{ label: string; due: number }>;
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
}

interface DashboardData {
  byRange: Record<Range, RangeData>;
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

// Demo generator: one row per day, ending today (swap for your API rows)
function makeDailyActivity(days: number, seed: number) {
  let st = seed;
  const rnd = () =>
    (st = (st * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const end = new Date(2026, 9, 11);
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(end);
    d.setDate(end.getDate() - (days - 1 - i));
    const weekend = d.getDay() === 5 || d.getDay() === 6; // Fri / Sat
    const base = weekend ? 1 : 6;
    return {
      label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      created: Math.round(base + rnd() * 5),
      completed: Math.round(base + rnd() * 5),
    };
  });
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO: DashboardData = {
  byRange: {
    "1W": {
      kpis: {
        activeProjects: 12,
        activeProjectsDelta: 1,
        onHold: 3,
        openTasks: 148,
        completionRate: 71,
        inReview: 23,
        overdueTasks: 9,
        overdueDelta: 1,
        urgentOverdue: 2,
      },
      activity: makeDailyActivity(7, 1),
      statusBreakdown: [
        { key: "in_progress", count: 16 },
        { key: "in_review", count: 6 },
        { key: "done", count: 13 },
        { key: "blocked", count: 2 },
      ],
      priorityBreakdown: [
        { key: "urgent", count: 2 },
        { key: "high", count: 8 },
        { key: "medium", count: 17 },
        { key: "low", count: 10 },
      ],
      dueLoad: [
        { label: "Oct 5", due: 3 },
        { label: "Oct 6", due: 5 },
        { label: "Oct 7", due: 3 },
        { label: "Oct 8", due: 8 },
        { label: "Oct 9", due: 2 },
        { label: "Oct 10", due: 3 },
        { label: "Oct 11", due: 5 },
      ],
      team: [
        {
          name: "Nadia Rahman",
          assigned: 10,
          completed: 9,
          onTime: 8,
          late: 1,
          overdue: 0,
          estHours: 30,
          actualHours: 28,
        },
        {
          name: "Imran Hossain",
          assigned: 12,
          completed: 9,
          onTime: 7,
          late: 2,
          overdue: 1,
          estHours: 38,
          actualHours: 43,
        },
        {
          name: "Sara Khan",
          assigned: 8,
          completed: 6,
          onTime: 6,
          late: 0,
          overdue: 0,
          estHours: 22,
          actualHours: 21,
        },
        {
          name: "Tanvir Ahmed",
          assigned: 11,
          completed: 9,
          onTime: 7,
          late: 2,
          overdue: 1,
          estHours: 35,
          actualHours: 40,
        },
        {
          name: "Farhana Islam",
          assigned: 6,
          completed: 5,
          onTime: 5,
          late: 0,
          overdue: 0,
          estHours: 15,
          actualHours: 14,
        },
      ],
    },
    "1M": {
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
      },
      activity: makeDailyActivity(30, 2),
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
      dueLoad: [
        { label: "Sep 12", due: 6 },
        { label: "Sep 13", due: 8 },
        { label: "Sep 14", due: 4 },
        { label: "Sep 15", due: 10 },
        { label: "Sep 16", due: 3 },
        { label: "Sep 17", due: 11 },
        { label: "Sep 18", due: 6 },
        { label: "Sep 19", due: 10 },
        { label: "Sep 20", due: 4 },
        { label: "Sep 21", due: 3 },
        { label: "Sep 22", due: 11 },
        { label: "Sep 23", due: 11 },
        { label: "Sep 24", due: 5 },
        { label: "Sep 25", due: 7 },
        { label: "Sep 26", due: 3 },
        { label: "Sep 27", due: 10 },
        { label: "Sep 28", due: 3 },
        { label: "Sep 29", due: 11 },
        { label: "Sep 30", due: 2 },
        { label: "Oct 1", due: 11 },
        { label: "Oct 2", due: 5 },
        { label: "Oct 3", due: 9 },
        { label: "Oct 4", due: 10 },
        { label: "Oct 5", due: 8 },
        { label: "Oct 6", due: 7 },
        { label: "Oct 7", due: 9 },
        { label: "Oct 8", due: 11 },
        { label: "Oct 9", due: 9 },
        { label: "Oct 10", due: 7 },
        { label: "Oct 11", due: 6 },
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
    },
    "3M": {
      kpis: {
        activeProjects: 12,
        activeProjectsDelta: 3,
        onHold: 3,
        openTasks: 148,
        completionRate: 66,
        inReview: 23,
        overdueTasks: 9,
        overdueDelta: 4,
        urgentOverdue: 2,
      },
      activity: makeDailyActivity(90, 3),
      statusBreakdown: [
        { key: "in_progress", count: 179 },
        { key: "in_review", count: 64 },
        { key: "done", count: 146 },
        { key: "blocked", count: 25 },
      ],
      priorityBreakdown: [
        { key: "urgent", count: 17 },
        { key: "high", count: 87 },
        { key: "medium", count: 201 },
        { key: "low", count: 109 },
      ],
      dueLoad: [
        { label: "Jul 19", due: 32 },
        { label: "Jul 26", due: 44 },
        { label: "Aug 2", due: 33 },
        { label: "Aug 9", due: 41 },
        { label: "Aug 16", due: 37 },
        { label: "Aug 23", due: 40 },
        { label: "Aug 30", due: 36 },
        { label: "Sep 6", due: 24 },
        { label: "Sep 13", due: 24 },
        { label: "Sep 20", due: 30 },
        { label: "Sep 27", due: 37 },
        { label: "Oct 4", due: 44 },
        { label: "Oct 11", due: 43 },
      ],
      team: [
        {
          name: "Nadia Rahman",
          assigned: 118,
          completed: 101,
          onTime: 87,
          late: 14,
          overdue: 3,
          estHours: 336,
          actualHours: 314,
        },
        {
          name: "Imran Hossain",
          assigned: 134,
          completed: 98,
          onTime: 73,
          late: 25,
          overdue: 6,
          estHours: 420,
          actualHours: 479,
        },
        {
          name: "Sara Khan",
          assigned: 84,
          completed: 73,
          onTime: 67,
          late: 6,
          overdue: 2,
          estHours: 252,
          actualHours: 235,
        },
        {
          name: "Tanvir Ahmed",
          assigned: 126,
          completed: 101,
          onTime: 79,
          late: 22,
          overdue: 4,
          estHours: 392,
          actualHours: 442,
        },
        {
          name: "Farhana Islam",
          assigned: 62,
          completed: 56,
          onTime: 53,
          late: 3,
          overdue: 0,
          estHours: 168,
          actualHours: 154,
        },
      ],
    },
    "6M": {
      kpis: {
        activeProjects: 12,
        activeProjectsDelta: 5,
        onHold: 3,
        openTasks: 148,
        completionRate: 64,
        inReview: 23,
        overdueTasks: 9,
        overdueDelta: 2,
        urgentOverdue: 2,
      },
      activity: makeDailyActivity(180, 4),
      statusBreakdown: [
        { key: "in_progress", count: 333 },
        { key: "in_review", count: 120 },
        { key: "done", count: 270 },
        { key: "blocked", count: 47 },
      ],
      priorityBreakdown: [
        { key: "urgent", count: 31 },
        { key: "high", count: 161 },
        { key: "medium", count: 375 },
        { key: "low", count: 203 },
      ],
      dueLoad: [
        { label: "Apr 19", due: 26 },
        { label: "Apr 26", due: 45 },
        { label: "May 3", due: 35 },
        { label: "May 10", due: 44 },
        { label: "May 17", due: 40 },
        { label: "May 24", due: 42 },
        { label: "May 31", due: 32 },
        { label: "Jun 7", due: 27 },
        { label: "Jun 14", due: 23 },
        { label: "Jun 21", due: 29 },
        { label: "Jun 28", due: 27 },
        { label: "Jul 5", due: 32 },
        { label: "Jul 12", due: 32 },
        { label: "Jul 19", due: 18 },
        { label: "Jul 26", due: 49 },
        { label: "Aug 2", due: 29 },
        { label: "Aug 9", due: 34 },
        { label: "Aug 16", due: 36 },
        { label: "Aug 23", due: 18 },
        { label: "Aug 30", due: 27 },
        { label: "Sep 6", due: 44 },
        { label: "Sep 13", due: 41 },
        { label: "Sep 20", due: 38 },
        { label: "Sep 27", due: 26 },
        { label: "Oct 4", due: 50 },
        { label: "Oct 11", due: 21 },
      ],
      team: [
        {
          name: "Nadia Rahman",
          assigned: 218,
          completed: 187,
          onTime: 161,
          late: 26,
          overdue: 3,
          estHours: 624,
          actualHours: 582,
        },
        {
          name: "Imran Hossain",
          assigned: 250,
          completed: 182,
          onTime: 135,
          late: 47,
          overdue: 6,
          estHours: 780,
          actualHours: 889,
        },
        {
          name: "Sara Khan",
          assigned: 156,
          completed: 135,
          onTime: 125,
          late: 10,
          overdue: 2,
          estHours: 468,
          actualHours: 437,
        },
        {
          name: "Tanvir Ahmed",
          assigned: 234,
          completed: 187,
          onTime: 145,
          late: 42,
          overdue: 4,
          estHours: 728,
          actualHours: 822,
        },
        {
          name: "Farhana Islam",
          assigned: 114,
          completed: 104,
          onTime: 99,
          late: 5,
          overdue: 0,
          estHours: 312,
          actualHours: 286,
        },
      ],
    },
    "1Y": {
      kpis: {
        activeProjects: 12,
        activeProjectsDelta: 8,
        onHold: 3,
        openTasks: 148,
        completionRate: 68,
        inReview: 23,
        overdueTasks: 9,
        overdueDelta: 5,
        urgentOverdue: 2,
      },
      activity: makeDailyActivity(365, 5),
      statusBreakdown: [
        { key: "in_progress", count: 640 },
        { key: "in_review", count: 230 },
        { key: "done", count: 520 },
        { key: "blocked", count: 90 },
      ],
      priorityBreakdown: [
        { key: "urgent", count: 60 },
        { key: "high", count: 310 },
        { key: "medium", count: 720 },
        { key: "low", count: 390 },
      ],
      dueLoad: [
        { label: "Nov '25", due: 76 },
        { label: "Dec '25", due: 83 },
        { label: "Jan '26", due: 70 },
        { label: "Feb '26", due: 142 },
        { label: "Mar '26", due: 89 },
        { label: "Apr '26", due: 138 },
        { label: "May '26", due: 82 },
        { label: "Jun '26", due: 116 },
        { label: "Jul '26", due: 148 },
        { label: "Aug '26", due: 73 },
        { label: "Sep '26", due: 79 },
        { label: "Oct '26", due: 96 },
      ],
      team: [
        {
          name: "Nadia Rahman",
          assigned: 420,
          completed: 360,
          onTime: 310,
          late: 50,
          overdue: 3,
          estHours: 1200,
          actualHours: 1120,
        },
        {
          name: "Imran Hossain",
          assigned: 480,
          completed: 350,
          onTime: 260,
          late: 90,
          overdue: 6,
          estHours: 1500,
          actualHours: 1710,
        },
        {
          name: "Sara Khan",
          assigned: 300,
          completed: 260,
          onTime: 240,
          late: 20,
          overdue: 2,
          estHours: 900,
          actualHours: 840,
        },
        {
          name: "Tanvir Ahmed",
          assigned: 450,
          completed: 360,
          onTime: 280,
          late: 80,
          overdue: 4,
          estHours: 1400,
          actualHours: 1580,
        },
        {
          name: "Farhana Islam",
          assigned: 220,
          completed: 200,
          onTime: 190,
          late: 10,
          overdue: 0,
          estHours: 600,
          actualHours: 550,
        },
      ],
    },
  },
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

function niceScale(rawMax: number) {
  const rawStep = rawMax / 4;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const step =
    rawStep <= 1
      ? 1
      : ([1, 2, 5, 10].map((m) => m * mag).find((v) => v >= rawStep) ??
        10 * mag);
  const top = Math.ceil(rawMax / step) * step;
  return {
    top,
    ticks: Array.from(
      { length: Math.round(top / step) + 1 },
      (_, i) => i * step,
    ),
  };
}

function ActivityChart({ data }: { data: RangeData["activity"] }) {
  const W = 900,
    H = 250,
    L = 34,
    R = 10,
    T = 10,
    B = 24;
  const { top, ticks } = niceScale(
    Math.max(...data.flatMap((d) => [d.created, d.completed]), 1),
  );
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(data.length - 1, 1);
  const y = (v: number) => H - B - (v / top) * (H - T - B);
  const line = (k: "created" | "completed") =>
    data.map((d, i) => `${i ? "L" : "M"}${x(i)} ${y(d[k])}`).join(" ");
  const area = `${line("completed")} L${x(data.length - 1)} ${H - B} L${x(0)} ${H - B}Z`;
  const every = Math.ceil(data.length / 10); // ~10 date labels on the axis
  const step = (W - L - R) / Math.max(data.length - 1, 1);
  const showDots = data.length <= 31;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
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
        {data.map(
          (d, i) =>
            i % every === 0 && (
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
            ),
        )}
        <path d={area} fill="url(#areaFill)" />
        <path
          d={line("created")}
          fill="none"
          stroke="#c7d2fe"
          strokeWidth={2}
          strokeDasharray="5 4"
        />
        <path
          d={line("completed")}
          fill="none"
          stroke="#4f46e5"
          strokeWidth={2}
        />
        {showDots &&
          data.map((d, i) => (
            <circle
              key={d.label}
              cx={x(i)}
              cy={y(d.completed)}
              r={3}
              fill="#fff"
              stroke="#4f46e5"
              strokeWidth={2}
            />
          ))}
      </svg>
      {/* one hover column per day (shadcn tooltip) */}
      {data.map((d, i) => {
        const l = Math.max(L, x(i) - step / 2);
        const r = Math.min(W - R, x(i) + step / 2);
        return (
          <Tooltip key={d.label}>
            <TooltipTrigger asChild>
              <div
                className="absolute cursor-pointer hover:bg-indigo-500/10"
                style={{
                  left: `${(l / W) * 100}%`,
                  width: `${((r - l) / W) * 100}%`,
                  top: `${(T / H) * 100}%`,
                  height: `${((H - B - T) / H) * 100}%`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold">{d.label}</p>
              <p>{d.completed} completed</p>
              <p>{d.created} created</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function StatusDonut({ data }: { data: RangeData["statusBreakdown"] }) {
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

function DueLoadChart({
  data,
}: {
  data: Array<{ label: string; due: number }>;
}) {
  const W = 460,
    H = 270,
    L = 44,
    R = 12,
    T = 10,
    B = 50;
  const COLOR = "#0d9488";

  // nice y-axis steps
  const rawMax = Math.max(...data.map((d) => d.due), 1);
  const rawStep = rawMax / 4;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rawStep) ??
    10 * mag;
  const top = Math.ceil(rawMax / step) * step;
  const ticks = Array.from(
    { length: Math.round(top / step) + 1 },
    (_, i) => i * step,
  );

  const x = (i: number) => L + (i * (W - L - R)) / Math.max(data.length - 1, 1);
  const y = (v: number) => H - B - (v / top) * (H - T - B);
  const line = data
    .map((d, i) => `${i ? "L" : "M"}${x(i)} ${y(d.due)}`)
    .join(" ");
  const area = `${line} L${x(data.length - 1)} ${H - B} L${x(0)} ${H - B}Z`;
  const every = Math.ceil(data.length / 7); // keep ~7 date labels
  const r = data.length <= 14 ? 3.5 : 2.5;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label="Deadline load: task count by date"
      >
        <defs>
          <linearGradient id="dueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COLOR} stopOpacity={0.2} />
            <stop offset="1" stopColor={COLOR} stopOpacity={0} />
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
        {data.map(
          (d, i) =>
            i % every === 0 && (
              <text
                key={d.label}
                x={x(i)}
                y={H - B + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#9ca3af"
              >
                {d.label}
              </text>
            ),
        )}
        <path d={area} fill="url(#dueFill)" />
        <path d={line} fill="none" stroke={COLOR} strokeWidth={2.5} />
        {data.map((d, i) => (
          <circle
            key={d.label}
            cx={x(i)}
            cy={y(d.due)}
            r={r}
            fill="#fff"
            stroke={COLOR}
            strokeWidth={2}
          />
        ))}
        <text
          x={(L + W - R) / 2}
          y={H - 8}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="#6b7280"
        >
          Date
        </text>
        <text
          transform={`translate(12 ${(T + H - B) / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill="#6b7280"
        >
          Task count
        </text>
      </svg>
      {/* one hover column per date (shadcn tooltip) */}
      {data.map((d, i) => {
        const step = (W - L - R) / Math.max(data.length - 1, 1);
        const l = Math.max(L, x(i) - step / 2);
        const rt = Math.min(W - R, x(i) + step / 2);
        return (
          <Tooltip key={d.label}>
            <TooltipTrigger asChild>
              <div
                className="absolute cursor-pointer hover:bg-teal-500/10"
                style={{
                  left: `${(l / W) * 100}%`,
                  width: `${((rt - l) / W) * 100}%`,
                  top: `${(T / H) * 100}%`,
                  height: `${((H - B - T) / H) * 100}%`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-semibold">{d.label}</p>
              <p>{d.due} tasks due</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ─── Team performance ─────────────────────────────────────────────────────────

function TeamPerformance({
  team,
  range,
}: {
  team: RangeData["team"];
  range: Range;
}) {
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
        sub={`Assigned vs completed, delivery timing and effort · ${range}`}
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 cursor-pointer">
                          <div
                            className="bg-emerald-500"
                            style={{
                              width: `${(m.onTime / m.assigned) * 100}%`,
                            }}
                          />
                          <div
                            className="bg-amber-400"
                            style={{ width: `${(m.late / m.assigned) * 100}%` }}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{m.onTime} on time</p>
                        <p>{m.late} late</p>
                        <p>{m.assigned - m.completed} open</p>
                      </TooltipContent>
                    </Tooltip>
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

export default function DashboardPage() {
  const d = DEMO;
  const [range, setRange] = useState<Range>("1M");
  const cur = d.byRange[range]; // data for the selected range
  const k = cur.kpis;

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const maxPriority = Math.max(...cur.priorityBreakdown.map((p) => p.count), 1);

  // On-time delivery, derived from the team data
  const completedAll = cur.team.reduce((s, m) => s + m.completed, 0);
  const onTimeAll = cur.team.reduce((s, m) => s + m.onTime, 0);
  const onTimeRate =
    completedAll > 0 ? Math.round((onTimeAll / completedAll) * 100) : 0;

  return (
    <TooltipProvider delayDuration={100}>
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
            note={`vs previous period · ${k.onHold} on hold`}
            icon="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          />
          <KpiCard
            label="Open tasks"
            tone="sky"
            value={String(k.openTasks)}
            chip={`${k.completionRate}%`}
            chipTone="up"
            note={`completed in period · ${k.inReview} in review`}
            icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
          <KpiCard
            label="Overdue tasks"
            tone="rose"
            value={String(k.overdueTasks)}
            valueClass="text-red-500"
            chip={`+${k.overdueDelta}`}
            chipTone="down"
            note={`vs previous period · ${k.urgentOverdue} urgent`}
            icon="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
          <KpiCard
            label="On-time delivery"
            tone="emerald"
            value={`${onTimeRate}%`}
            chip={`${completedAll - onTimeAll} late`}
            chipTone="down"
            note={`of ${completedAll} completed tasks`}
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </div>

        {/* Team performance */}
        <TeamPerformance team={cur.team} range={range} />

        {/* Activity + status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHead
              title="Task activity"
              sub={`Daily created vs completed · ${range}`}
              right={
                <Legend
                  items={[
                    { label: "Completed", color: "#4f46e5" },
                    { label: "Created", color: "#c7d2fe" },
                  ]}
                />
              }
            />
            <ActivityChart data={cur.activity} />
          </Card>

          <Card>
            <CardHead
              title="Tasks by status"
              sub={`Tasks created in the last ${range}`}
            />
            <div className="flex items-center gap-5 flex-wrap">
              <StatusDonut data={cur.statusBreakdown} />
              <div className="flex-1 min-w-[130px] space-y-2.5">
                {cur.statusBreakdown.map((s) => (
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
                    <span className="font-semibold text-gray-900">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Priority breakdown</p>
              <div className="space-y-2.5">
                {cur.priorityBreakdown.map((p) => (
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

        {/* Due soon + Review Queue + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        {/* Deadline load + projects + review */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHead
              title="Deadline load"
              sub={`Tasks due by date · ${range}`}
              right={
                <Legend items={[{ label: "Tasks due", color: "#0d9488" }]} />
              }
            />
            <DueLoadChart data={cur.dueLoad} />
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
        </div>
      </div>
    </TooltipProvider>
  );
}

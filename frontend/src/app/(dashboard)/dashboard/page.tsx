"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useDashboard,
  RANGES,
  type Range,
  type Priority,
  type RangeData,
} from "@/hooks/use-dashboard";
import { useMe } from "@/hooks/use-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "admin" | "user" | "client";

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

// ─── Charts ───────────────────────────────────────────────────────────────────

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
  if (!data.length) {
    return (
      <div className="h-[250px] flex items-center justify-center text-xs text-gray-400">
        No activity in this range
      </div>
    );
  }

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
  const every = Math.ceil(data.length / 10);
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

  if (total === 0) {
    return (
      <div className="h-[140px] w-[140px] flex-shrink-0 flex items-center justify-center text-xs text-gray-400">
        No tasks
      </div>
    );
  }

  const r = 52;
  let cumulative = 0;
  const arcs = data
    .filter((d) => d.count > 0)
    .map((d) => {
      const fraction = d.count / total;
      const arc = {
        key: d.key,
        color: STATUS_CFG[d.key].color,
        fraction,
        offset: cumulative,
      };
      cumulative += fraction;
      return arc;
    });

  return (
    <svg
      viewBox="0 0 140 140"
      className="h-[140px] w-[140px] flex-shrink-0"
      role="img"
      aria-label="Tasks by status"
    >
      <g transform="rotate(-90 70 70)">
        <circle
          cx={70}
          cy={70}
          r={r}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={16}
        />
        {arcs.map((a) => (
          <circle
            key={a.key}
            cx={70}
            cy={70}
            r={r}
            fill="none"
            stroke={a.color}
            strokeWidth={16}
            pathLength={1}
            strokeDasharray={`${a.fraction} ${1 - a.fraction}`}
            strokeDashoffset={-a.offset}
            strokeLinecap="butt"
          />
        ))}
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
  if (!data.length) {
    return (
      <div className="h-[270px] flex items-center justify-center text-xs text-gray-400">
        No upcoming deadlines in this range
      </div>
    );
  }

  const W = 460,
    H = 270,
    L = 44,
    R = 12,
    T = 10,
    B = 50;
  const COLOR = "#0d9488";

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
  const every = Math.ceil(data.length / 7);
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
  role,
}: {
  team: RangeData["team"];
  range: Range;
  role: Role;
}) {
  const isUser = role === "user";
  const title = isUser ? "My performance" : "Team performance";
  const sub = isUser
    ? `My assigned vs completed, delivery timing and effort · ${range}`
    : `Assigned vs completed, delivery timing and effort · ${range}`;

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
        title={title}
        sub={sub}
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
        {team.length === 0 ? (
          <div className="py-10 text-center text-xs text-gray-400">
            {isUser
              ? "No tasks assigned to you in this range"
              : "No team activity in this range"}
          </div>
        ) : (
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className={`${head} text-left`}>
                  {isUser ? "Me" : "Member"}
                </th>
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
                  <tr
                    key={m.name}
                    className="hover:bg-gray-50 transition-colors"
                  >
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
                                width: `${(m.onTime / Math.max(m.assigned, 1)) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-amber-400"
                              style={{
                                width: `${(m.late / Math.max(m.assigned, 1)) * 100}%`,
                              }}
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
                  {isUser ? "My total" : "Team total"}
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
        )}
      </div>
    </Card>
  );
}

// ─── Loading / Error ──────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="h-3 w-40 bg-gray-100 rounded" />
          <div className="h-7 w-56 bg-gray-100 rounded" />
          <div className="h-3 w-48 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-64 bg-gray-100 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-80 bg-gray-100 rounded-2xl" />
        <div className="h-80 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );
}

function DashboardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-12 w-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-3">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-gray-800">
        Couldn't load the dashboard
      </h3>
      <p className="text-xs text-gray-400 mt-1 max-w-sm">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: me } = useMe();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useDashboard();
  const [range, setRange] = useState<Range>("1M");

  // Normalize role: super_admin behaves as admin on the dashboard
  const rawRole = me?.role ?? "user";
  const role: Role = rawRole === "super_admin" ? "admin" : (rawRole as Role);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <DashboardError
        message={(error as Error)?.message ?? "Unknown error"}
        onRetry={() => refetch()}
      />
    );
  }

  const cur = data.byRange[range];
  const k = cur.kpis;

  const maxPriority = Math.max(...cur.priorityBreakdown.map((p) => p.count), 1);

  const completedAll = cur.team.reduce((s, m) => s + m.completed, 0);
  const onTimeAll = cur.team.reduce((s, m) => s + m.onTime, 0);
  const onTimeRate =
    completedAll > 0 ? Math.round((onTimeAll / completedAll) * 100) : 0;

  // ── Role-based visibility ──
  const isAdmin = role === "admin";
  const isUser = role === "user";
  const isClient = role === "client";

  const showTeamPerformance = isAdmin || isUser; // client: ❌
  const showDeadlineLoad = isAdmin || isUser; // client: ❌
  const showProjectHealth = isAdmin || isClient; // user:   ❌
  const showAllTasksLink = isAdmin || isUser; // client: ❌
  const showReviewQueueCard = isAdmin || isUser; // client: ❌
  const showReviewQueueLink = isAdmin || isUser; // client: ❌
  const showRecentActivity = isAdmin || isUser; // client: ❌

  // Column count for the middle row so client doesn't get empty cells
  const middleRowCols =
    (showReviewQueueCard ? 1 : 0) + (showRecentActivity ? 1 : 0) + 1;

  const displayName = me?.name ?? "there";

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-gray-400">
              {greeting}, {displayName}
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
              {isFetching && (
                <span className="ml-2 text-indigo-500">· updating…</span>
              )}
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

        {/* Team / My performance — hidden for client */}
        {showTeamPerformance && (
          <TeamPerformance team={cur.team} range={range} role={role} />
        )}

        {/* Activity + status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHead
              title="Task activity"
              sub={`Created vs completed · ${range}`}
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
                        style={{
                          width: `${(p.count / maxPriority) * 100}%`,
                        }}
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

        {/* Due soon + Review queue + Recent activity */}
        <div
          className={`grid grid-cols-1 gap-4 ${
            middleRowCols === 3
              ? "lg:grid-cols-3"
              : middleRowCols === 2
                ? "lg:grid-cols-2"
                : "lg:grid-cols-1"
          }`}
        >
          {/* Due soon */}
          <Card>
            <CardHead
              title="Due soon"
              sub="Next 7 days"
              right={
                showAllTasksLink ? (
                  <Link
                    href="/tasks"
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                  >
                    All tasks →
                  </Link>
                ) : undefined
              }
            />
            <div className="divide-y divide-gray-100">
              {data.dueSoon.length === 0 && (
                <p className="py-6 text-xs text-gray-400 text-center">
                  Nothing due soon
                </p>
              )}
              {data.dueSoon.map((t) => (
                <div
                  key={t.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {t.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      Due {t.due} · in {t.inDays} day
                      {t.inDays !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <PriorityPill p={t.priority} />
                </div>
              ))}
            </div>
          </Card>

          {/* Review queue */}
          {showReviewQueueCard && (
            <Card>
              <CardHead
                title="Review queue"
                sub="Waiting for your approval"
                right={
                  showReviewQueueLink ? (
                    <Link
                      href="/review-queue"
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                    >
                      Open queue →
                    </Link>
                  ) : undefined
                }
              />
              <div className="divide-y divide-gray-100">
                {data.review.length === 0 && (
                  <p className="py-6 text-xs text-gray-400 text-center">
                    Nothing waiting for review
                  </p>
                )}
                {data.review.map((r) => (
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
          )}

          {/* Recent activity — admin + user only, capped at 5 */}
          {showRecentActivity && (
            <Card>
              <CardHead title="Recent activity" sub="Latest 5 events" />
              <div className="divide-y divide-gray-100">
                {data.recent.slice(0, 5).length === 0 && (
                  <p className="py-6 text-xs text-gray-400 text-center">
                    No recent activity
                  </p>
                )}
                {data.recent.slice(0, 5).map((a) => (
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
          )}
        </div>

        {/* Deadline load + Project health */}
        {(showDeadlineLoad || showProjectHealth) && (
          <div
            className={`grid grid-cols-1 gap-4 ${
              showDeadlineLoad && showProjectHealth
                ? "lg:grid-cols-2"
                : "lg:grid-cols-1"
            }`}
          >
            {showDeadlineLoad && (
              <Card>
                <CardHead
                  title="Deadline load"
                  sub={`Tasks due by date · ${range}`}
                  right={
                    <Legend
                      items={[{ label: "Tasks due", color: "#0d9488" }]}
                    />
                  }
                />
                <DueLoadChart data={cur.dueLoad} />
              </Card>
            )}

            {showProjectHealth && (
              <Card>
                <CardHead
                  title="Project health"
                  sub="Progress · budget used"
                  right={
                    isAdmin ? (
                      <Link
                        href="/projects"
                        className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                      >
                        View all →
                      </Link>
                    ) : undefined
                  }
                />
                <div className="divide-y divide-gray-100">
                  {data.projects.length === 0 && (
                    <p className="py-6 text-xs text-gray-400 text-center">
                      No projects to show
                    </p>
                  )}
                  {data.projects.map((p) => {
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
                            className={`text-xs ${
                              risk
                                ? "text-red-500 font-semibold"
                                : "text-gray-400"
                            }`}
                          >
                            {p.budgetUsed}% budget
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

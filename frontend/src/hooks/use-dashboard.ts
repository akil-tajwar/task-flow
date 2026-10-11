// hooks/use-dashboard.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api"; // your axios instance

export type Priority = "urgent" | "high" | "medium" | "low";
export const RANGES = ["1W", "1M", "3M", "6M", "1Y"] as const;
export type Range = (typeof RANGES)[number];

export interface RangeData {
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
    assigned: number;
    completed: number;
    onTime: number;
    late: number;
    overdue: number;
    estHours: number;
    actualHours: number;
  }>;
}

export interface DashboardData {
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

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>("/dashboard");
      return data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

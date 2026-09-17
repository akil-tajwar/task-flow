'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ExpenseHead, Expense, PaginatedResult } from '@/types';

// ─── Expense Heads ─────────────────────────────────────────────────────────────

export function useExpenseHeads(includeInactive = false) {
  return useQuery<ExpenseHead[]>({
    queryKey: ['expense-heads', includeInactive],
    queryFn: async () => {
      const { data } = await api.get('/expenses/heads', {
        params: includeInactive ? { includeInactive: 'true' } : {},
      });
      return data;
    },
  });
}

export function useCreateExpenseHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string | null }) => {
      const { data } = await api.post('/expenses/heads', input);
      return data as ExpenseHead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-heads'] }),
  });
}

export function useUpdateExpenseHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; description?: string | null; isActive?: boolean }) => {
      const { data } = await api.put(`/expenses/heads/${id}`, input);
      return data as ExpenseHead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-heads'] }),
  });
}

export function useDeleteExpenseHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/expenses/heads/${id}`);
      return data as { deleted: boolean; deactivated: boolean };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-heads'] }),
  });
}

// ─── Expenses ──────────────────────────────────────────────────────────────────

export interface ExpenseFilters {
  expenseHeadId?: string;
  accountId?:     string;
  dateFrom?:      string;
  dateTo?:        string;
  page?:          number;
  limit?:         number;
}

export interface ExpenseListResult extends PaginatedResult<Expense> {
  totalAmount: number;
}

export function useExpenses(filters: ExpenseFilters = {}) {
  return useQuery<ExpenseListResult>({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.expenseHeadId) params.expenseHeadId = filters.expenseHeadId;
      if (filters.accountId)     params.accountId     = filters.accountId;
      if (filters.dateFrom)      params.dateFrom      = filters.dateFrom;
      if (filters.dateTo)        params.dateTo        = filters.dateTo;
      if (filters.page)          params.page          = filters.page;
      if (filters.limit)         params.limit         = filters.limit;
      const { data } = await api.get('/expenses', { params });
      return data;
    },
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      expenseHeadId:   string;
      accountId:       string;
      amount:          number;
      expenseDate:     string;
      referenceNumber?: string | null;
      notes?:          string | null;
    }) => {
      const { data } = await api.post('/expenses', input);
      return data as Expense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['finance-accounts'] });
      qc.invalidateQueries({ queryKey: ['account-ledger'] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/expenses/${id}`);
      return data as { deleted: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['finance-accounts'] });
      qc.invalidateQueries({ queryKey: ['account-ledger'] });
    },
  });
}

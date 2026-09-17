'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Customer, PaginatedResult } from '@/types';

export interface CustomerFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery<PaginatedResult<Customer>>({
    queryKey: ['customers', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.search) params.search = filters.search;
      if (filters.page)   params.page   = filters.page;
      if (filters.limit)  params.limit  = filters.limit;
      const { data } = await api.get('/customers', { params });
      return data;
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await api.post('/customers', input);
      return data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Record<string, unknown> & { id: string }) => {
      const { data } = await api.put(`/customers/${id}`, input);
      return data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/customers/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useCustomerBalance(customerId: string | null) {
  return useQuery<{ balance: number }>({
    queryKey: ['customer-balance', customerId],
    queryFn: async () => {
      const { data } = await api.get(`/customers/${customerId}/balance`);
      return data;
    },
    enabled: !!customerId,
  });
}

export function useSetCustomerOpeningBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, notes }: { id: string; amount: number; notes?: string }) => {
      const { data } = await api.post(`/customers/${id}/opening-balance`, { amount, notes });
      return data as { balance: number };
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['customer-balance', id] });
      qc.invalidateQueries({ queryKey: ['customer-ledger', id] });
    },
  });
}

export function useCustomerLedger(customerId: string | null, page = 1) {
  return useQuery<{ data: Array<{ id: string; type: string; debit: string; credit: string; balanceAfter: string; notes: string | null; createdAt: string; createdByUser?: { name: string } | null }>; total: number; totalPages: number; currentBalance: number }>({
    queryKey: ['customer-ledger', customerId, page],
    queryFn: async () => {
      const { data } = await api.get(`/customers/${customerId}/ledger`, { params: { page } });
      return data;
    },
    enabled: !!customerId,
  });
}

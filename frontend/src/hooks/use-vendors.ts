'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Vendor, PaginatedResult, VendorLedgerEntry } from '@/types';

export interface VendorFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export function useVendors(filters: VendorFilters = {}) {
  return useQuery<PaginatedResult<Vendor>>({
    queryKey: ['vendors', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.search) params.search = filters.search;
      if (filters.page)   params.page   = filters.page;
      if (filters.limit)  params.limit  = filters.limit;
      const { data } = await api.get('/vendors', { params });
      return data;
    },
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await api.post('/vendors', input);
      return data as Vendor;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Record<string, unknown> & { id: string }) => {
      const { data } = await api.put(`/vendors/${id}`, input);
      return data as Vendor;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/vendors/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function useVendorBalance(vendorId: string | null) {
  return useQuery<{ balance: number }>({
    queryKey: ['vendor-balance', vendorId],
    queryFn: async () => {
      const { data } = await api.get(`/vendors/${vendorId}/balance`);
      return data;
    },
    enabled: !!vendorId,
  });
}

export function useSetVendorOpeningBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount, notes }: { id: string; amount: number; notes?: string }) => {
      const { data } = await api.post(`/vendors/${id}/opening-balance`, { amount, notes });
      return data as { balance: number };
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['vendor-balance', id] });
      qc.invalidateQueries({ queryKey: ['vendor-ledger', id] });
    },
  });
}

export interface VendorLedgerResult {
  data:           VendorLedgerEntry[];
  total:          number;
  totalPages:     number;
  currentBalance: number;
  openingBalance: number;
  closingBalance: number;
  dateFrom:       string | null;
  dateTo:         string | null;
}

export function useVendorLedger(
  vendorId: string | null,
  opts: { page?: number; dateFrom?: string; dateTo?: string } = {},
) {
  const { page = 1, dateFrom, dateTo } = opts;
  return useQuery<VendorLedgerResult>({
    queryKey: ['vendor-ledger', vendorId, page, dateFrom, dateTo],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 500 };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const { data } = await api.get(`/vendors/${vendorId}/ledger`, { params });
      return data;
    },
    enabled: !!vendorId,
  });
}

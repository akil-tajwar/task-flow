'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SalesInvoice, SalesPaymentMode, PaginatedResult } from '@/types';

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateSaleItem {
  productId:      string;
  variantId?:     string | null;
  quantity:       number;
  unitPrice:      number;
  discountAmount?: number;
  taxRate?:        number;
  notes?:          string | null;
}

export interface CreateSalePayment {
  paymentMode:     SalesPaymentMode;
  accountId?:      string | null;
  amount:          number;
  paymentDate?:    string;
  referenceNumber?: string | null;
  notes?:          string | null;
}

export interface CreateSaleInput {
  storeId:        string;
  invoiceDate:    string;
  customerId?:    string | null;
  customerName?:  string | null;
  customerPhone?: string | null;
  discountAmount?: number;
  notes?:          string | null;
  items:           CreateSaleItem[];
  payments?:       CreateSalePayment[];
}

export interface AddSalePaymentInput {
  paymentMode:     SalesPaymentMode;
  accountId?:      string | null;
  amount:          number;
  paymentDate:     string;
  referenceNumber?: string | null;
  notes?:          string | null;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useSalesInvoices(params: {
  storeId?: string; status?: string; paymentStatus?: string;
  page?: number; limit?: number;
} = {}) {
  return useQuery<PaginatedResult<SalesInvoice>>({
    queryKey: ['sales-invoices', params],
    queryFn: async () => {
      const { data } = await api.get('/sales', { params });
      return data;
    },
  });
}

export function useSalesInvoice(id: string | null) {
  return useQuery<SalesInvoice>({
    queryKey: ['sales-invoice', id],
    queryFn: async () => {
      const { data } = await api.get(`/sales/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      const { data } = await api.post('/sales', input);
      return data as SalesInvoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-invoices'] }),
  });
}

export function useConfirmSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/sales/${id}/confirm`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      qc.invalidateQueries({ queryKey: ['sales-invoice', id] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['finance-accounts'] });
    },
  });
}

export function useCancelSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/sales/${id}/cancel`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-invoices'] }),
  });
}

export function useAddSalePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: AddSalePaymentInput & { id: string }) => {
      const { data } = await api.post(`/sales/${id}/payments`, input);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      qc.invalidateQueries({ queryKey: ['sales-invoice', vars.id] });
      qc.invalidateQueries({ queryKey: ['finance-accounts'] });
    },
  });
}

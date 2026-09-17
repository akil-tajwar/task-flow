'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  PurchaseOrder, PurchaseReceipt, VendorLedgerEntry, PaginatedResult,
  PurchasePayMode,
} from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreatePOInput {
  vendorId:    string;
  storeId:     string;
  orderDate:   string;
  expectedDate?: string;
  notes?:      string;
  items: Array<{
    productId:  string;
    variantId?: string | null;
    quantity:   number;
    unitPrice:  number;
    taxRate?:   number;
    notes?:     string;
  }>;
}

export interface CreatePRInput {
  vendorId:    string;
  storeId:     string;
  poId?:       string | null;
  receiptDate: string;
  notes?:      string;
  items: Array<{
    productId:  string;
    variantId?: string | null;
    poItemId?:  string | null;
    quantity:   number;
    unitPrice:  number;
    taxRate?:   number;
    notes?:     string;
  }>;
  payments: Array<{
    paymentMode:     PurchasePayMode;
    accountId?:      string | null;
    amount:          number;
    paymentDate?:    string;
    referenceNumber?: string;
    notes?:          string;
  }>;
}

export interface AddPaymentInput {
  paymentMode:     PurchasePayMode;
  accountId?:      string | null;
  amount:          number;
  paymentDate:     string;
  referenceNumber?: string;
  notes?:          string;
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export function usePurchaseOrders(params: {
  vendorId?: string; status?: string; page?: number; limit?: number;
} = {}) {
  return useQuery<PaginatedResult<PurchaseOrder>>({
    queryKey: ['purchase-orders', params],
    queryFn: async () => {
      const { data } = await api.get('/purchases/orders', { params });
      return data;
    },
  });
}

export function usePurchaseOrder(id: string | null) {
  return useQuery<PurchaseOrder>({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const { data } = await api.get(`/purchases/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePOInput) => {
      const { data } = await api.post('/purchases/orders', input);
      return data as PurchaseOrder;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  });
}

export function useUpdatePOStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'sent' | 'cancelled' }) => {
      const { data } = await api.patch(`/purchases/orders/${id}/status`, { status });
      return data as PurchaseOrder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['purchase-order'] });
    },
  });
}

// ─── Purchase Receipts ────────────────────────────────────────────────────────

export function usePurchaseReceipts(params: {
  vendorId?: string; storeId?: string; status?: string;
  paymentStatus?: string; page?: number; limit?: number;
} = {}) {
  return useQuery<PaginatedResult<PurchaseReceipt>>({
    queryKey: ['purchase-receipts', params],
    queryFn: async () => {
      const { data } = await api.get('/purchases/receipts', { params });
      return data;
    },
  });
}

export function usePurchaseReceipt(id: string | null) {
  return useQuery<PurchaseReceipt>({
    queryKey: ['purchase-receipt', id],
    queryFn: async () => {
      const { data } = await api.get(`/purchases/receipts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePRInput) => {
      const { data } = await api.post('/purchases/receipts', input);
      return data as PurchaseReceipt;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-receipts'] }),
  });
}

export function useConfirmPR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/purchases/receipts/${id}/confirm`);
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['purchase-receipts'] });
      qc.invalidateQueries({ queryKey: ['purchase-receipt', id] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['finance-accounts'] });
    },
  });
}

export function useCancelPR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/purchases/receipts/${id}/cancel`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-receipts'] }),
  });
}

export function useAddPRPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: AddPaymentInput & { id: string }) => {
      const { data } = await api.post(`/purchases/receipts/${id}/payments`, input);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['purchase-receipts'] });
      qc.invalidateQueries({ queryKey: ['purchase-receipt', vars.id] });
      qc.invalidateQueries({ queryKey: ['finance-accounts'] });
    },
  });
}

// ─── Vendor Ledger ────────────────────────────────────────────────────────────

export function useVendorLedger(vendorId: string | null, page = 1) {
  return useQuery<PaginatedResult<VendorLedgerEntry>>({
    queryKey: ['vendor-ledger', vendorId, page],
    queryFn: async () => {
      const { data } = await api.get(`/purchases/vendors/${vendorId}/ledger`, { params: { page, limit: 30 } });
      return data;
    },
    enabled: !!vendorId,
  });
}

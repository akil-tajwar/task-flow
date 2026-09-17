'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { InventoryRow, OpeningBalanceRow, StockMovement, StockTransfer, PaginatedResult } from '@/types';

export interface InventoryFilters {
  storeId?:   string;
  productId?: string;
  search?:    string;
  page?:      number;
  limit?:     number;
}

export function useInventory(filters: InventoryFilters = {}) {
  return useQuery<PaginatedResult<InventoryRow>>({
    queryKey: ['inventory', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.storeId)   params.storeId   = filters.storeId;
      if (filters.productId) params.productId = filters.productId;
      if (filters.search)    params.search    = filters.search;
      if (filters.page)      params.page      = filters.page;
      if (filters.limit)     params.limit     = filters.limit;
      const { data } = await api.get('/inventory', { params });
      return data;
    },
  });
}

export function useStockMovements(filters: { storeId?: string; productId?: string; page?: number; limit?: number } = {}) {
  return useQuery<PaginatedResult<StockMovement>>({
    queryKey: ['inventory-movements', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.storeId)   params.storeId   = filters.storeId;
      if (filters.productId) params.productId = filters.productId;
      if (filters.page)      params.page      = filters.page;
      if (filters.limit)     params.limit     = filters.limit;
      const { data } = await api.get('/inventory/movements', { params });
      return data;
    },
  });
}

export function useStockTransfers(opts: { page?: number; limit?: number } = {}) {
  return useQuery<PaginatedResult<StockTransfer>>({
    queryKey: ['inventory-transfers', opts],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (opts.page)  params.page  = opts.page;
      if (opts.limit) params.limit = opts.limit;
      const { data } = await api.get('/inventory/transfers', { params });
      return data;
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      storeId: string; productId: string; variantId?: string;
      type: string; quantity: number; notes?: string;
    }) => {
      const { data } = await api.post('/inventory/adjust', input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });
}

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      fromStoreId: string; toStoreId: string; notes?: string;
      items: Array<{ productId: string; variantId?: string; quantity: number }>;
    }) => {
      const { data } = await api.post('/inventory/transfer', input);
      return data as StockTransfer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-transfers'] });
      qc.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });
}

export function useOpeningBalanceTemplate(storeId: string | null) {
  return useQuery<OpeningBalanceRow[]>({
    queryKey: ['opening-balance-template', storeId],
    queryFn: async () => {
      const { data } = await api.get('/inventory/opening-balance-template', { params: { storeId } });
      return data;
    },
    enabled: !!storeId,
  });
}

export interface StoreLedgerEntry {
  id:              string;
  type:            string;
  quantity:        number;
  reference_id:    string | null;
  reference_type:  string | null;
  notes:           string | null;
  created_at:      string;
  variant_id:      string | null;
  variant_attrs:   string | null;
  product_name:    string;
  product_sku:     string | null;
  store_name:      string;
  created_by_name: string | null;
  balance_after:   number;
}

export interface StoreLedgerResult {
  data:       StoreLedgerEntry[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  currentQty: number;
}

export function useStoreLedger(opts: {
  storeId?:   string;
  productId?: string;
  variantId?: string;
  page?:      number;
  limit?:     number;
}) {
  return useQuery<StoreLedgerResult>({
    queryKey: ['inventory-ledger', opts],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (opts.storeId)   params.storeId   = opts.storeId;
      if (opts.productId) params.productId = opts.productId;
      if (opts.variantId) params.variantId = opts.variantId;
      if (opts.page)      params.page      = opts.page;
      if (opts.limit)     params.limit     = opts.limit;
      const { data } = await api.get('/inventory/ledger', { params });
      return data;
    },
    enabled: !!(opts.storeId && opts.productId),
  });
}

export function useOpeningBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      storeId: string;
      entries: Array<{ productId: string; variantId?: string | null; quantity: number }>;
      notes?: string;
    }) => {
      const { data } = await api.post('/inventory/opening-balance', input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['inventory-movements'] });
      qc.invalidateQueries({ queryKey: ['opening-balance-template'] });
    },
  });
}

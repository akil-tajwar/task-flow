'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Product, PaginatedResult } from '@/types';

export interface ProductFilters {
  search?: string;
  brandId?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery<PaginatedResult<Product>>({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.search)     params.search     = filters.search;
      if (filters.brandId)    params.brandId    = filters.brandId;
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.page)       params.page       = filters.page;
      if (filters.limit)      params.limit      = filters.limit;
      const { data } = await api.get('/products', { params });
      return data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data } = await api.get(`/products/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await api.post('/products', input);
      return data as Product;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Record<string, unknown> & { id: string }) => {
      const { data } = await api.put(`/products/${id}`, input);
      return data as Product;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['products', id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

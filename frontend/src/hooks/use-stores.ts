'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Store } from '@/types';

export function useStores() {
  return useQuery<Store[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data } = await api.get('/stores');
      return data as Store[];
    },
  });
}

export function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await api.post('/stores', input);
      return data as Store;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}

export function useUpdateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Record<string, unknown> & { id: string }) => {
      const { data } = await api.put(`/stores/${id}`, input);
      return data as Store;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}

export function useSetDefaultStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/stores/${id}/default`, {});
      return data as Store;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}

export function useDeleteStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/stores/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stores'] }),
  });
}

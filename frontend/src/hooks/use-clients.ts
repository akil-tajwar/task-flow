'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Client,
  CreateClientInput,
  UpdateClientInput,
  CreateClientResult,
} from '@/types/client';

export interface ClientFilters {
  page?: number;
  limit?: number;
}

// NOTE: backend /clients/getAll returns a plain array (no total/totalPages),
// so pagination metadata isn't available yet unless the route is updated.
export function useClients(filters: ClientFilters = {}) {
  return useQuery<Client[]>({
    queryKey: ['clients', filters],
    queryFn: async () => {
      const params: Record<string, number> = {};
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      const { data } = await api.get('/clients/getAll', { params });
      return data;
    },
  });
}

export function useClient(id: string | null) {
  return useQuery<Client>({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data } = await api.get(`/clients/getById/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      const { data } = await api.post('/clients/create', input);
      return data as CreateClientResult;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateClientInput & { id: string }) => {
      const { data } = await api.put(`/clients/edit/${id}`, input);
      return data as Client;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clients/delete/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}
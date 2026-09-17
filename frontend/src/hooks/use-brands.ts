'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Brand } from '@/types';

export function useBrands() {
  return useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data } = await api.get('/brands');
      return data;
    },
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post('/brands', { name });
      return data as Brand;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brands'] }),
  });
}

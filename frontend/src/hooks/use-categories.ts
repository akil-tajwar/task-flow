'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Category } from '@/types';

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories');
      return data;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string }) => {
      const { data } = await api.post('/categories', { name, parentId });
      return data as Category;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

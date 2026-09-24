'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilters,
} from '@/types/project';

// NOTE: backend /projects/getAll returns { data, pagination } ONLY when
// the result set is empty — otherwise it returns a plain array. This
// normalizes both shapes into a flat array. Fix the backend to always
// wrap, then simplify this.
function normalizeProjectsResponse(raw: unknown): Project[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: Project[] }).data;
  }
  return [];
}

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery<Project[]>({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const { data } = await api.get('/projects/getAll', { params: filters });
      return normalizeProjectsResponse(data);
    },
  });
}

export function useProject(id: string | null) {
  return useQuery<Project>({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/get/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data } = await api.post('/projects/create', input);
      return data as Project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProjectInput & { id: string }) => {
      const { data } = await api.patch(`/projects/update/${id}`, input);
      return data as Project;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', vars.id] });
    },
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/projects/archive/${id}`);
      return data as Project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useRestoreProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/projects/restore/${id}`);
      return data as Project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/delete/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}
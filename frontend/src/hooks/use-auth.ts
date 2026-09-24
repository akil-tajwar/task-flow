import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AppUser, AuthUser } from "@/types";

export function useMe() {
  return useQuery<AuthUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await api.get("/auth/me");
      return data.user;
    },
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const { data } = await api.post("/auth/login", input);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      tenantName: string;
      email: string;
      password: string;
      tenantSlug: string;
    }) => {
      const { data } = await api.post("/auth/register", input);
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    },
    onSuccess: () => queryClient.clear(),
  });
}

// NOTE: backend /auth/getAllUsers accepts page/limit query params but
// currently returns a plain array (no total/totalPages) — see
// authService.getAllUsers, it computes countRow but never returns it.
export function useUsers() {
  return useQuery<AppUser[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get("/auth/getAllUsers", {
        params: { limit: 100 },
      });
      return data;
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { NotificationFilters, NotificationsListResponse } from '@/types/notifications';


export function useNotifications(filters: NotificationFilters = {}, enabled = true) {
  return useQuery<NotificationsListResponse>({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      const { data } = await api.get('/notifications/getAll', { params: filters });
      return data as NotificationsListResponse;
    },
    enabled,
  });
}

// Lightweight — used for the navbar badge. The backend always computes
// unreadCount regardless of the page/limit passed, so limit=1 avoids
// pulling the full notification list just to show a number.
export function useUnreadNotificationCount() {
  return useQuery<number>({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/getAll', { params: { limit: 1 } });
      return (data as NotificationsListResponse).unreadCount;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put(`/notifications/read/${id}`);
      return data as Notification;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.put('/notifications/readAll');
      return data as { message: string; count: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}
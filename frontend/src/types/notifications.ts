import { z } from "zod";

// Matches the fields the backend actually sets when inserting a
// notification (see taskService.changeStatus) plus the standard row
// fields. If the real db schema has more columns than this, add them —
// unknown extra keys from the API are simply ignored by this shape.
export const notificationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  linkUrl: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  isRead: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});

export const notificationsListResponseSchema = z.object({
  data: z.array(notificationSchema),
  unreadCount: z.number().int(),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationsListResponse = z.infer<typeof notificationsListResponseSchema>;

export interface NotificationFilters {
  page?: number;
  limit?: number;
  isRead?: boolean;
}
import { z } from "zod";

export const pushSubscribeSchema = z.object({
  deviceId: z.string().min(1).max(64),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
});

export const pushUnsubscribeSchema = z.object({
  deviceId: z.string().min(1).max(64),
});

export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;
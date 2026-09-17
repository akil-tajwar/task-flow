import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  tenantName: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  tenantSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
